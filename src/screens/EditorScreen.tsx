import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Header } from '../components/common/Header';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import {
  Project,
  MediaClip,
  TextLayer,
  AudioTrack,
  ClipTransition,
} from '../types/project';
import { useAppNavigation } from '../navigation/navigationContext';
import { VideoPreviewPlayer } from '../editor/preview/VideoPreviewPlayer';
import { PreviewControls } from '../editor/preview/PreviewControls';
import { TimelineView } from '../editor/timeline/TimelineView';
import { TransitionModal } from '../editor/transitions/TransitionModal';
import {
  EditorBottomToolbar,
  MainCategory,
  EditSubAction,
  AudioSubAction,
  TextSubAction,
} from '../editor/toolbar/EditorBottomToolbar';
import { SpeedSelectorModal } from '../editor/speed/SpeedSelectorModal';
import { VolumeModal } from '../editor/audio/VolumeModal';
import { RatioModal } from '../editor/canvas/RatioModal';
import { FilterSelectorModal } from '../editor/filters/FilterSelectorModal';
import { AdjustmentModal } from '../editor/adjustments/AdjustmentModal';
import { TextEditorModal } from '../editor/text/TextEditorModal';
import { AudioModal } from '../editor/audio/AudioModal';
import { StickersModal } from '../editor/overlays/StickersModal';
import {
  calculateEffectiveClipDuration,
  calculateProjectTotalDuration,
  findClipAtTimelineTime,
} from '../utils/timeUtils';
import { createDefaultTextLayer } from '../editor/text/textUtils';
import { AutosaveManager } from '../storage/autosaveManager';
import { HapticsService } from '../services/hapticsService';
import { MediaEngine } from '../media/mediaEngine';

export const EditorScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();

  // Initial project state from navigation params
  const [project, setProject] = useState<Project>(() => {
    if (navigation.params.project) {
      return navigation.params.project;
    }
    // Fallback empty project
    return {
      id: `proj_${Date.now()}`,
      name: 'My Reel',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      aspectRatio: '9:16',
      canvasBackground: { type: 'fit', color: '#000000' },
      clips: [],
      textLayers: [],
      stickerLayers: [],
      audioTracks: [],
      exportSettings: {
        resolution: '1080p',
        fps: 30,
        quality: 'recommended',
        format: 'mp4',
      },
    };
  });

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(
    project.clips[0]?.id || null,
  );

  // Active toolbar category
  const [activeCategory, setActiveCategory] = useState<MainCategory | null>(
    null,
  );

  // Modals state
  const [speedModalVisible, setSpeedModalVisible] = useState(false);
  const [volumeModalVisible, setVolumeModalVisible] = useState(false);
  const [ratioModalVisible, setRatioModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [stickersModalVisible, setStickersModalVisible] = useState(false);
  const [textModalVisible, setTextModalVisible] = useState(false);
  const [audioModalVisible, setAudioModalVisible] = useState(false);
  const [transitionModalVisible, setTransitionModalVisible] = useState(false);
  const [transitionTargetClipId, setTransitionTargetClipId] = useState<
    string | null
  >(null);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameText, setRenameText] = useState('');

  // Selected layers
  const [selectedTextLayer, setSelectedTextLayer] = useState<TextLayer | null>(
    null,
  );
  const [selectedAudioTrack, setSelectedAudioTrack] =
    useState<AudioTrack | null>(null);

  // Undo / Redo history
  const [history, setHistory] = useState<Project[]>([project]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const totalDuration = calculateProjectTotalDuration(project.clips);

  // Playback timer
  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  // Selected clip
  const selectedClip = project.clips.find(c => c.id === selectedClipId) || null;

  // Active clip based on currentTime
  const activeClipInfo = findClipAtTimelineTime(project.clips, currentTime);
  const activeClip =
    activeClipInfo?.clip || selectedClip || project.clips[0] || null;

  // Autosave whenever project changes
  const updateProject = useCallback(
    (newProject: Project, recordHistory: boolean = true) => {
      setProject(newProject);
      AutosaveManager.scheduleSave(newProject);

      if (recordHistory) {
        setHistory(prev => {
          const sliced = prev.slice(0, historyIndex + 1);
          return [...sliced, newProject];
        });
        setHistoryIndex(prev => prev + 1);
      }
    },
    [historyIndex],
  );

  // Undo & Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      HapticsService.light();
      const prevProject = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setProject(prevProject);
      AutosaveManager.scheduleSave(prevProject);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      HapticsService.light();
      const nextProject = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setProject(nextProject);
      AutosaveManager.scheduleSave(nextProject);
    }
  };

  // Playback loop
  useEffect(() => {
    if (isPlaying) {
      playbackIntervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return Number((prev + 0.1).toFixed(2));
        });
      }, 100);
    } else {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    }
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, [isPlaying, totalDuration]);

  const handleTogglePlay = () => {
    HapticsService.light();
    setIsPlaying(prev => !prev);
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
  };

  // --- CORE EDITING ACTIONS ---

  // 1. Split clip at current playhead
  const handleSplitClip = () => {
    if (!activeClipInfo) {
      Alert.alert('Cannot Split', 'Move playhead over a clip to split it.');
      return;
    }

    const { clip, clipIndex } = activeClipInfo;
    const splitPoint = activeClipInfo.localTime;

    // Check minimum duration threshold (0.2s)
    if (splitPoint - clip.trimStart < 0.2 || clip.trimEnd - splitPoint < 0.2) {
      Alert.alert(
        'Split Too Close',
        'Playhead is too close to the clip boundary to split.',
      );
      return;
    }

    HapticsService.snap();

    // Clip 1: start to splitPoint
    const clip1: MediaClip = {
      ...clip,
      id: `${clip.id}_1`,
      name: `${clip.name} (Part 1)`,
      trimStart: clip.trimStart,
      trimEnd: splitPoint,
      duration: calculateEffectiveClipDuration(
        clip.originalDuration,
        clip.trimStart,
        splitPoint,
        clip.speed,
      ),
    };

    // Clip 2: splitPoint to end
    const clip2: MediaClip = {
      ...clip,
      id: `${clip.id}_2`,
      name: `${clip.name} (Part 2)`,
      trimStart: splitPoint,
      trimEnd: clip.trimEnd,
      duration: calculateEffectiveClipDuration(
        clip.originalDuration,
        splitPoint,
        clip.trimEnd,
        clip.speed,
      ),
    };

    const newClips = [...project.clips];
    newClips.splice(clipIndex, 1, clip1, clip2);

    const updated: Project = {
      ...project,
      clips: newClips,
    };

    setSelectedClipId(clip2.id);
    updateProject(updated);
  };

  // 2. Trim clip handles
  const handleTrimClip = (clipId: string, newStart: number, newEnd: number) => {
    const newClips = project.clips.map(clip => {
      if (clip.id === clipId) {
        const effectiveDuration = calculateEffectiveClipDuration(
          clip.originalDuration,
          newStart,
          newEnd,
          clip.speed,
        );
        return {
          ...clip,
          trimStart: newStart,
          trimEnd: newEnd,
          duration: effectiveDuration,
        };
      }
      return clip;
    });

    updateProject({ ...project, clips: newClips }, false);
  };

  // 3. Duplicate clip
  const handleDuplicateClip = () => {
    if (!selectedClip) return;
    HapticsService.light();

    const idx = project.clips.findIndex(c => c.id === selectedClip.id);
    const duplicated: MediaClip = {
      ...selectedClip,
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${selectedClip.name} (Copy)`,
    };

    const newClips = [...project.clips];
    newClips.splice(idx + 1, 0, duplicated);

    setSelectedClipId(duplicated.id);
    updateProject({ ...project, clips: newClips });
  };

  // 4. Delete clip
  const handleDeleteClip = () => {
    if (!selectedClip) return;
    if (project.clips.length <= 1) {
      Alert.alert(
        'Cannot Delete',
        'A project must have at least one media clip.',
      );
      return;
    }

    HapticsService.snap();
    const newClips = project.clips.filter(c => c.id !== selectedClip.id);
    setSelectedClipId(newClips[0]?.id || null);
    updateProject({ ...project, clips: newClips });
  };

  // 5. Rotate clip
  const handleRotateClip = () => {
    if (!selectedClip) return;
    HapticsService.light();
    const nextRot = (selectedClip.rotation + 90) % 360;
    const newClips = project.clips.map(c =>
      c.id === selectedClip.id ? { ...c, rotation: nextRot } : c,
    );
    updateProject({ ...project, clips: newClips });
  };

  // 6. Flip clip
  const handleFlipClip = () => {
    if (!selectedClip) return;
    HapticsService.light();
    const newClips = project.clips.map(c =>
      c.id === selectedClip.id
        ? { ...c, flipHorizontal: !c.flipHorizontal }
        : c,
    );
    updateProject({ ...project, clips: newClips });
  };

  // 7. Speed clip
  const handleSelectSpeed = (speed: number) => {
    if (!selectedClip) return;
    const effectiveDuration = calculateEffectiveClipDuration(
      selectedClip.originalDuration,
      selectedClip.trimStart,
      selectedClip.trimEnd,
      speed,
    );
    const newClips = project.clips.map(c =>
      c.id === selectedClip.id
        ? { ...c, speed, duration: effectiveDuration }
        : c,
    );
    updateProject({ ...project, clips: newClips });
    setSpeedModalVisible(false);
  };

  // 8. Volume change
  const handleVolumeChange = (vol: number) => {
    if (!selectedClip) return;
    const newClips = project.clips.map(c =>
      c.id === selectedClip.id ? { ...c, volume: vol, isMuted: false } : c,
    );
    updateProject({ ...project, clips: newClips }, false);
  };

  const handleToggleMute = () => {
    if (!selectedClip) return;
    const newClips = project.clips.map(c =>
      c.id === selectedClip.id ? { ...c, isMuted: !c.isMuted } : c,
    );
    updateProject({ ...project, clips: newClips });
  };

  // 9. Clip Transitions
  const handleOpenTransition = (clip?: MediaClip) => {
    HapticsService.light();
    setTransitionTargetClipId(clip ? clip.id : selectedClip?.id || null);
    setTransitionModalVisible(true);
  };

  const handleSelectTransition = (trans: ClipTransition) => {
    const targetId = transitionTargetClipId || selectedClip?.id;
    if (!targetId) return;
    const newClips = project.clips.map(c =>
      c.id === targetId ? { ...c, transition: trans } : c,
    );
    updateProject({ ...project, clips: newClips });
  };

  const handleApplyTransitionToAll = (trans: ClipTransition) => {
    HapticsService.medium();
    const newClips = project.clips.map(c => ({
      ...c,
      transition: { ...trans },
    }));
    updateProject({ ...project, clips: newClips });
  };

  // --- SUBTOOL ACTION DISPATCHER ---

  const handleEditAction = (action: EditSubAction) => {
    switch (action) {
      case 'split':
        handleSplitClip();
        break;
      case 'transition':
        handleOpenTransition();
        break;
      case 'speed':
        setSpeedModalVisible(true);
        break;
      case 'volume':
        setVolumeModalVisible(true);
        break;
      case 'rotate':
        handleRotateClip();
        break;
      case 'flip':
        handleFlipClip();
        break;
      case 'duplicate':
        handleDuplicateClip();
        break;
      case 'delete':
        handleDeleteClip();
        break;
      case 'crop':
        setRatioModalVisible(true);
        break;
    }
  };

  const handleAudioAction = (action: AudioSubAction) => {
    switch (action) {
      case 'music':
        setSelectedAudioTrack(null);
        setAudioModalVisible(true);
        break;
      case 'extractAudio':
        handleExtractAudio();
        break;
      case 'originalVolume':
        setVolumeModalVisible(true);
        break;
      case 'fadeIn':
      case 'fadeOut':
        setSelectedAudioTrack(project.audioTracks[0] || null);
        setAudioModalVisible(true);
        break;
    }
  };

  const handleExtractAudio = async () => {
    if (!selectedClip) return;
    try {
      HapticsService.medium();
      const audioUri = await MediaEngine.extractAudio(
        selectedClip.uri,
        `${selectedClip.name}_audio`,
      );
      const newTrack: AudioTrack = {
        id: `track_${Date.now()}`,
        uri: audioUri,
        name: `${selectedClip.name} Audio`,
        duration: selectedClip.duration,
        originalDuration: selectedClip.originalDuration,
        startTime: currentTime,
        trimStart: selectedClip.trimStart,
        trimEnd: selectedClip.trimEnd,
        volume: 1.0,
        fadeInDuration: 0,
        fadeOutDuration: 0,
        isMuted: false,
        isExtracted: true,
      };

      const updated = {
        ...project,
        audioTracks: [...project.audioTracks, newTrack],
      };
      updateProject(updated);
      Alert.alert(
        'Audio Extracted',
        'Extracted audio track placed at current playhead position.',
      );
    } catch (e: any) {
      Alert.alert(
        'Extraction Failed',
        e.message || 'Could not extract audio track.',
      );
    }
  };

  const handleTextAction = (action: TextSubAction) => {
    if (action === 'addText') {
      HapticsService.light();
      const newLayer = createDefaultTextLayer(currentTime, totalDuration);
      setSelectedTextLayer(newLayer);
      setTextModalVisible(true);
    } else {
      if (project.textLayers.length > 0) {
        setSelectedTextLayer(project.textLayers[0]);
        setTextModalVisible(true);
      } else {
        const newLayer = createDefaultTextLayer(currentTime, totalDuration);
        setSelectedTextLayer(newLayer);
        setTextModalVisible(true);
      }
    }
  };

  const handleSaveTextLayer = (savedLayer: TextLayer) => {
    const exists = project.textLayers.some(t => t.id === savedLayer.id);
    let updatedLayers: TextLayer[];
    if (exists) {
      updatedLayers = project.textLayers.map(t =>
        t.id === savedLayer.id ? savedLayer : t,
      );
    } else {
      updatedLayers = [...project.textLayers, savedLayer];
    }
    updateProject({ ...project, textLayers: updatedLayers });
  };

  const handleDeleteTextLayer = (layerId: string) => {
    const updatedLayers = project.textLayers.filter(t => t.id !== layerId);
    updateProject({ ...project, textLayers: updatedLayers });
  };

  const handleAddEmojiSticker = (emoji: string) => {
    HapticsService.light();
    const newSticker = {
      id: `sticker_${Date.now()}`,
      emoji,
      startTime: currentTime,
      endTime: Math.min(totalDuration, currentTime + 3),
      x: 0.5,
      y: 0.5,
      scale: 1,
      rotation: 0,
    };
    updateProject({
      ...project,
      stickerLayers: [...project.stickerLayers, newSticker],
    });
  };

  const handleExport = () => {
    HapticsService.medium();
    navigation.navigate('Export', { project });
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      {/* Top Header */}
      <Header
        title={project.name}
        onTitlePress={() => {
          setRenameText(project.name);
          setRenameModalVisible(true);
        }}
        onBack={() => {
          AutosaveManager.flush();
          navigation.navigate('Home');
        }}
        exportAction={{
          onPress: handleExport,
          label: 'Export',
        }}
      />

      {/* Main Video Preview Area */}
      <View style={styles.previewContainer}>
        <VideoPreviewPlayer
          project={project}
          activeClip={activeClip}
          currentTime={currentTime}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onSelectTextLayer={layer => {
            setSelectedTextLayer(layer);
            setTextModalVisible(true);
          }}
          selectedTextLayerId={selectedTextLayer?.id}
        />
      </View>

      {/* Center Playback Controls Bar */}
      <PreviewControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        totalDuration={totalDuration}
        onTogglePlay={handleTogglePlay}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleFullscreen={() => setRatioModalVisible(true)}
      />

      {/* Horizontally Scrollable Timeline */}
      <TimelineView
        project={project}
        selectedClipId={selectedClipId}
        currentTime={currentTime}
        totalDuration={totalDuration}
        onSelectClip={clip => setSelectedClipId(clip.id)}
        onSeek={handleSeek}
        onTrimClip={handleTrimClip}
        onAddMedia={() => navigation.navigate('MediaPicker')}
        onTransitionPress={handleOpenTransition}
        onSelectTextLayer={layer => {
          setSelectedTextLayer(layer);
          setTextModalVisible(true);
        }}
        onSelectAudioTrack={track => {
          setSelectedAudioTrack(track);
          setAudioModalVisible(true);
        }}
      />

      {/* Bottom Toolbars */}
      <EditorBottomToolbar
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        onCloseCategory={() => setActiveCategory(null)}
        onEditAction={handleEditAction}
        onAudioAction={handleAudioAction}
        onTextAction={handleTextAction}
        onFiltersPress={() => setFilterModalVisible(true)}
        onAdjustPress={() => setAdjustModalVisible(true)}
        onRatioPress={() => setRatioModalVisible(true)}
        onStickersPress={() => setStickersModalVisible(true)}
        onTransitionPress={() => handleOpenTransition()}
        hasSelectedClip={!!selectedClip}
      />

      {/* Modals */}
      <TransitionModal
        visible={transitionModalVisible}
        onClose={() => setTransitionModalVisible(false)}
        currentTransition={
          (transitionTargetClipId
            ? project.clips.find(c => c.id === transitionTargetClipId)
                ?.transition
            : selectedClip?.transition) || { type: 'none', duration: 0.5 }
        }
        onSelectTransition={handleSelectTransition}
        onApplyToAll={handleApplyTransitionToAll}
      />

      <SpeedSelectorModal
        visible={speedModalVisible}
        onClose={() => setSpeedModalVisible(false)}
        currentSpeed={selectedClip?.speed || 1.0}
        onSelectSpeed={handleSelectSpeed}
        originalDuration={selectedClip?.originalDuration || 10}
        trimDuration={
          (selectedClip?.trimEnd || 10) - (selectedClip?.trimStart || 0)
        }
      />

      <VolumeModal
        visible={volumeModalVisible}
        onClose={() => setVolumeModalVisible(false)}
        volume={selectedClip?.volume ?? 1.0}
        isMuted={selectedClip?.isMuted ?? false}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
      />

      <RatioModal
        visible={ratioModalVisible}
        onClose={() => setRatioModalVisible(false)}
        currentRatio={project.aspectRatio}
        currentBgType={project.canvasBackground.type}
        onSelectRatio={ratio =>
          updateProject({ ...project, aspectRatio: ratio })
        }
        onSelectBgType={bgType =>
          updateProject({
            ...project,
            canvasBackground: { ...project.canvasBackground, type: bgType },
          })
        }
      />

      <FilterSelectorModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        activeFilterId={selectedClip?.filterId || 'none'}
        onSelectFilter={fId => {
          if (!selectedClip) return;
          const newClips = project.clips.map(c =>
            c.id === selectedClip.id ? { ...c, filterId: fId } : c,
          );
          updateProject({ ...project, clips: newClips });
        }}
      />

      <AdjustmentModal
        visible={adjustModalVisible}
        onClose={() => setAdjustModalVisible(false)}
        adjustments={
          selectedClip?.adjustments || {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            exposure: 0,
            temperature: 0,
            highlights: 0,
            shadows: 0,
            sharpen: 0,
          }
        }
        onChangeAdjustments={adj => {
          if (!selectedClip) return;
          const newClips = project.clips.map(c =>
            c.id === selectedClip.id ? { ...c, adjustments: adj } : c,
          );
          updateProject({ ...project, clips: newClips }, false);
        }}
      />

      <TextEditorModal
        visible={textModalVisible}
        onClose={() => setTextModalVisible(false)}
        layer={selectedTextLayer}
        onSaveLayer={handleSaveTextLayer}
        onDeleteLayer={handleDeleteTextLayer}
      />

      <AudioModal
        visible={audioModalVisible}
        onClose={() => setAudioModalVisible(false)}
        track={selectedAudioTrack}
        onUpdateTrack={track => {
          const updated = project.audioTracks.map(t =>
            t.id === track.id ? track : t,
          );
          updateProject({ ...project, audioTracks: updated });
        }}
        onDeleteTrack={id => {
          const updated = project.audioTracks.filter(t => t.id !== id);
          updateProject({ ...project, audioTracks: updated });
        }}
        onExtractAudio={handleExtractAudio}
        onAddMusic={() => {
          // Add default royalty-free music track
          const newMusic: AudioTrack = {
            id: `music_${Date.now()}`,
            name: 'Upbeat Reel Beat',
            uri: 'https://actions.google.com/sounds/v1/sports/rollercoaster_screaming.ogg',
            duration: totalDuration || 15,
            originalDuration: 30,
            startTime: 0,
            trimStart: 0,
            trimEnd: totalDuration || 15,
            volume: 0.8,
            fadeInDuration: 0.5,
            fadeOutDuration: 0.5,
            isMuted: false,
          };
          updateProject({
            ...project,
            audioTracks: [...project.audioTracks, newMusic],
          });
        }}
      />

      <StickersModal
        visible={stickersModalVisible}
        onClose={() => setStickersModalVisible(false)}
        onSelectEmoji={handleAddEmojiSticker}
      />

      {/* Rename Project Modal */}
      <Modal
        visible={renameModalVisible}
        onClose={() => setRenameModalVisible(false)}
        title="Rename Project"
        type="center"
      >
        <TextInput
          value={renameText}
          onChangeText={setRenameText}
          placeholder="Project name"
          placeholderTextColor={colors.textMuted}
          style={styles.renameInput}
          autoFocus
        />
        <View style={styles.renameActions}>
          <Button
            title="Cancel"
            variant="ghost"
            size="sm"
            onPress={() => setRenameModalVisible(false)}
          />
          <Button
            title="Save"
            variant="primary"
            size="sm"
            onPress={() => {
              if (renameText.trim()) {
                updateProject({ ...project, name: renameText.trim() });
                setRenameModalVisible(false);
              }
            }}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  renameInput: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  renameActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
