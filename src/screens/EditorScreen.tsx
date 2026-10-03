import React, {
  useState,
  useEffect,
  useEffectEvent,
  useRef,
  useCallback,
} from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { ThemedAlert as Alert } from '../services/alertService';
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
  PipLayer,
  SpeedCurve,
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
import { PipModal } from '../editor/pip/PipModal';
import { TrimModal } from '../editor/trim/TrimModal';
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
  const isTrimQuickTool = navigation.params?.quickToolMode === 'trim';

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

  // Helper to calculate start time of any clip on timeline
  const getClipStartTime = (
    clips: MediaClip[],
    targetClipId: string,
  ): number => {
    let start = 0;
    for (const c of clips) {
      if (c.id === targetClipId) return start;
      const dur = (c.trimEnd - c.trimStart) / (c.speed || 1.0);
      start += dur;
    }
    return start;
  };

  const [selectedClipId, setSelectedClipId] = useState<string | null>(() => {
    if (navigation.params?.addedClipsCount && project.clips.length > 0) {
      return project.clips[project.clips.length - 1].id;
    }
    return project.clips[0]?.id || null;
  });

  const [currentTime, setCurrentTime] = useState<number>(() => {
    if (navigation.params?.addedClipsCount && project.clips.length > 0) {
      const target = project.clips[project.clips.length - 1];
      return Number(getClipStartTime(project.clips, target.id).toFixed(2));
    }
    return 0;
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Synchronize when returning from MediaPicker with appended clips
  useEffect(() => {
    if (navigation.params?.project) {
      const incoming = navigation.params.project;
      if (
        incoming.id !== project.id ||
        incoming.updatedAt !== project.updatedAt ||
        incoming.clips.length !== project.clips.length
      ) {
        setProject(incoming);
        setHistory(prev => [...prev, incoming]);
        setHistoryIndex(prev => prev + 1);
        if (incoming.clips.length > project.clips.length) {
          const addedClip = incoming.clips[incoming.clips.length - 1];
          setSelectedClipId(addedClip.id);
          const start = getClipStartTime(incoming.clips, addedClip.id);
          setCurrentTime(Number(start.toFixed(2)));
        }
      }
    }
  }, [navigation.params?.project]);

  // Active toolbar category
  const [activeCategory, setActiveCategory] = useState<MainCategory | null>(
    isTrimQuickTool ? 'edit' : null,
  );

  // Modals state
  const [trimModalVisible, setTrimModalVisible] = useState(isTrimQuickTool);
  const [speedModalVisible, setSpeedModalVisible] = useState(false);
  const [volumeModalVisible, setVolumeModalVisible] = useState(false);
  const [ratioModalVisible, setRatioModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [stickersModalVisible, setStickersModalVisible] = useState(false);
  const [pipModalVisible, setPipModalVisible] = useState(false);
  const [selectedPipId, setSelectedPipId] = useState<string | null>(null);
  const [textModalVisible, setTextModalVisible] = useState(false);
  const [audioModalVisible, setAudioModalVisible] = useState(false);
  const [audioModalTab, setAudioModalTab] = useState<
    'music' | 'voiceover' | 'sfx'
  >('music');
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
          const next = Number((prev + 0.05).toFixed(2));
          return next >= totalDuration ? totalDuration : next;
        });
      }, 50);
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

  // When playback reaches the end of the project, pause and rewind
  useEffect(() => {
    if (isPlaying && currentTime >= totalDuration && totalDuration > 0) {
      setIsPlaying(false);
      setCurrentTime(0);
      MediaEngine.pausePreviewAudio();
    }
  }, [currentTime, isPlaying, totalDuration]);

  // Synchronize native audio playback with timeline video
  const activeAudioTrack = project.audioTracks.find(
    t => currentTime >= t.startTime && currentTime <= t.startTime + t.duration,
  );

  const syncPreviewAudio = useEffectEvent(() => {
    if (isPlaying) {
      const audioClip =
        activeClipInfo?.clip.type === 'video' ? activeClipInfo?.clip : null;

      const clipPositionMs = activeClipInfo
        ? Math.round(activeClipInfo.localTime * 1000)
        : 0;

      const trackPositionMs = activeAudioTrack
        ? Math.round(
            (activeAudioTrack.trimStart +
              (currentTime - activeAudioTrack.startTime)) *
              1000,
          )
        : -1;

      const isNativeVideoActive = !!(audioClip && !audioClip.isReversed);
      MediaEngine.playPreviewAudio({
        clipUri: isNativeVideoActive ? null : audioClip?.uri,
        clipVolume: isNativeVideoActive ? 0 : (audioClip?.volume ?? 1.0),
        clipMuted: isNativeVideoActive ? true : (audioClip?.isMuted ?? false),
        clipSpeed: audioClip?.speed ?? 1.0,
        trackUri: activeAudioTrack?.uri,
        trackVolume: activeAudioTrack?.volume ?? 1.0,
        trackMuted: activeAudioTrack?.isMuted ?? false,
        clipPositionMs,
        trackPositionMs,
      });
    } else {
      MediaEngine.pausePreviewAudio();
    }
  });

  // Read the latest playhead when playback or its sources change, without
  // restarting and seeking native players on every 50 ms timeline tick.
  useEffect(() => {
    syncPreviewAudio();
  }, [
    isPlaying,
    activeClipInfo?.clip.id,
    activeClipInfo?.clip.speed,
    activeClipInfo?.clip.volume,
    activeClipInfo?.clip.isMuted,
    activeAudioTrack?.id,
    activeAudioTrack?.volume,
    activeAudioTrack?.isMuted,
  ]);

  // Enable immersive mode (hide phone navigation buttons) and clean up native audio players on unmount
  useEffect(() => {
    MediaEngine.setImmersiveMode(true);
    return () => {
      MediaEngine.stopPreviewAudio();
    };
  }, []);

  const handleTogglePlay = () => {
    HapticsService.light();
    setIsPlaying(prev => !prev);
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    if (!isPlaying) {
      const seekClipInfo = findClipAtTimelineTime(project.clips, newTime);
      const seekTrack = project.audioTracks.find(
        t => newTime >= t.startTime && newTime <= t.startTime + t.duration,
      );
      const clipMs = seekClipInfo
        ? Math.round(seekClipInfo.localTime * 1000)
        : 0;
      const trackMs = seekTrack
        ? Math.round(
            (seekTrack.trimStart + (newTime - seekTrack.startTime)) * 1000,
          )
        : -1;
      MediaEngine.seekPreviewAudio(clipMs, trackMs);
    }
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

  // 1b. Freeze Frame: Extract frame thumbnail at playhead and insert as 3s image clip
  const handleFreezeFrame = async () => {
    if (!activeClipInfo) {
      Alert.alert(
        'Cannot Freeze',
        'Move playhead over a clip to freeze frame.',
      );
      return;
    }

    const { clip, clipIndex, localTime } = activeClipInfo;

    try {
      HapticsService.snap();
      const freezeTimeMs = Math.round(localTime * 1000);
      const freezeThumbUri = await MediaEngine.generateThumbnail(
        clip.uri,
        freezeTimeMs,
        clip.width || 1280,
        clip.height || 720,
      );

      const freezeDuration = 3.0;
      const freezeClip: MediaClip = {
        id: `freeze_${Date.now()}`,
        uri: freezeThumbUri,
        type: 'image',
        name: `${clip.name} (Freeze)`,
        duration: freezeDuration,
        originalDuration: freezeDuration,
        trimStart: 0,
        trimEnd: freezeDuration,
        volume: 0,
        speed: 1.0,
        rotation: clip.rotation || 0,
        flipHorizontal: clip.flipHorizontal || false,
        flipVertical: clip.flipVertical || false,
        crop: clip.crop ? { ...clip.crop } : null,
        filterId: clip.filterId || 'none',
        adjustments: { ...clip.adjustments },
        transition: { type: 'none', duration: 0.5 },
        thumbnailUri: freezeThumbUri,
        width: clip.width || 1280,
        height: clip.height || 720,
        isMuted: true,
      };

      const newClips = [...project.clips];
      const splitPoint = localTime;
      const isNearStart = splitPoint - clip.trimStart < 0.2;
      const isNearEnd = clip.trimEnd - splitPoint < 0.2;

      if (clip.type === 'image' || (isNearStart && isNearEnd)) {
        newClips.splice(clipIndex + 1, 0, freezeClip);
      } else if (isNearStart) {
        newClips.splice(clipIndex, 0, freezeClip);
      } else if (isNearEnd) {
        newClips.splice(clipIndex + 1, 0, freezeClip);
      } else {
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

        newClips.splice(clipIndex, 1, clip1, freezeClip, clip2);
      }

      setSelectedClipId(freezeClip.id);
      updateProject({ ...project, clips: newClips });
      Alert.alert('Freeze Frame', 'Inserted 3s freeze frame at playhead.');
    } catch (e: any) {
      Alert.alert('Freeze Failed', e?.message || 'Could not freeze frame.');
    }
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
        ? {
            ...c,
            speed,
            speedCurve: { preset: 'none', points: [] },
            duration: effectiveDuration,
          }
        : c,
    );
    updateProject({ ...project, clips: newClips });
    setSpeedModalVisible(false);
  };

  // 7b. Speed Curve clip
  const handleSelectSpeedCurve = (curve: SpeedCurve) => {
    if (!selectedClip) return;
    const effectiveDuration = calculateEffectiveClipDuration(
      selectedClip.originalDuration,
      selectedClip.trimStart,
      selectedClip.trimEnd,
      selectedClip.speed,
      curve,
    );
    const newClips = project.clips.map(c =>
      c.id === selectedClip.id
        ? {
            ...c,
            speedCurve: curve,
            duration: effectiveDuration,
          }
        : c,
    );
    updateProject({ ...project, clips: newClips });
    setSpeedModalVisible(false);
    Alert.alert(
      'Speed Curve',
      `Applied "${curve.preset}" speed curve to clip.`,
    );
  };

  // 7c. Reverse clip
  const handleToggleReverse = () => {
    if (!selectedClip) return;
    HapticsService.medium();
    const nextReversed = !selectedClip.isReversed;
    const newClips = project.clips.map(c =>
      c.id === selectedClip.id ? { ...c, isReversed: nextReversed } : c,
    );
    updateProject({ ...project, clips: newClips });
    Alert.alert(
      nextReversed ? 'Reverse Applied' : 'Reverse Removed',
      nextReversed
        ? 'Clip will now play backwards from end to start.'
        : 'Restored standard forward playback.',
    );
  };

  // 8. Volume change
  const handleVolumeChange = (vol: number) => {
    if (!selectedClip) return;
    const newClips = project.clips.map(c =>
      c.id === selectedClip.id ? { ...c, volume: vol, isMuted: false } : c,
    );
    updateProject({ ...project, clips: newClips }, false);
    MediaEngine.setPreviewAudioVolume({ clipVolume: vol, clipMuted: false });
  };

  const handleToggleMute = () => {
    if (!selectedClip) return;
    const nextMuted = !selectedClip.isMuted;
    const newClips = project.clips.map(c =>
      c.id === selectedClip.id ? { ...c, isMuted: nextMuted } : c,
    );
    updateProject({ ...project, clips: newClips });
    MediaEngine.setPreviewAudioVolume({
      clipVolume: selectedClip.volume,
      clipMuted: nextMuted,
    });
  };

  // 9. Clip Transitions
  const handleOpenTransition = (clipOrClipId?: MediaClip | string) => {
    HapticsService.light();
    const targetId =
      typeof clipOrClipId === 'string'
        ? clipOrClipId
        : clipOrClipId
        ? clipOrClipId.id
        : selectedClip?.id || null;
    setTransitionTargetClipId(targetId);
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

  const handleAddMedia = () => {
    HapticsService.light();
    AutosaveManager.flush();
    navigation.navigate('MediaPicker', {
      project,
      mode: 'append',
    });
  };

  const handleEditAction = (action: EditSubAction) => {
    switch (action) {
      case 'addMedia':
        handleAddMedia();
        break;
      case 'trim':
        setTrimModalVisible(true);
        break;
      case 'split':
        handleSplitClip();
        break;
      case 'freeze':
        handleFreezeFrame();
        break;
      case 'reverse':
        handleToggleReverse();
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
        setAudioModalTab('music');
        setAudioModalVisible(true);
        break;
      case 'voiceover':
        setSelectedAudioTrack(null);
        setAudioModalTab('voiceover');
        setAudioModalVisible(true);
        break;
      case 'sfx':
        setSelectedAudioTrack(null);
        setAudioModalTab('sfx');
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
        setAudioModalTab('music');
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

  const handleAddPip = (newPip: PipLayer) => {
    const existing = project.pipLayers || [];
    updateProject({ ...project, pipLayers: [...existing, newPip] });
  };

  const handleUpdatePip = (updatedPip: PipLayer) => {
    const existing = project.pipLayers || [];
    const updated = existing.map(p =>
      p.id === updatedPip.id ? updatedPip : p,
    );
    updateProject({ ...project, pipLayers: updated }, false);
  };

  const handleDeletePip = (id: string) => {
    const existing = project.pipLayers || [];
    const updated = existing.filter(p => p.id !== id);
    setSelectedPipId(null);
    updateProject({ ...project, pipLayers: updated });
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
        isPlaying={isPlaying}
        onPause={() => setIsPlaying(false)}
        onSelectClip={clip => setSelectedClipId(clip.id)}
        onSeek={handleSeek}
        onTrimClip={handleTrimClip}
        onAddMedia={handleAddMedia}
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
        onPipPress={() => setPipModalVisible(true)}
        onTransitionPress={() => handleOpenTransition()}
        hasSelectedClip={!!selectedClip}
      />

      {/* Modals */}
      <TrimModal
        visible={trimModalVisible}
        onClose={() => setTrimModalVisible(false)}
        clipName={selectedClip?.name || 'Selected Video'}
        originalDuration={selectedClip?.originalDuration || 10}
        trimStart={selectedClip?.trimStart || 0}
        trimEnd={selectedClip?.trimEnd || selectedClip?.originalDuration || 10}
        onApplyTrim={(newStart, newEnd) => {
          if (selectedClip) {
            handleTrimClip(selectedClip.id, newStart, newEnd);
          }
        }}
      />

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
        currentCurve={selectedClip?.speedCurve}
        onSelectSpeed={handleSelectSpeed}
        onSelectCurve={handleSelectSpeedCurve}
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
        initialTab={audioModalTab}
        currentTime={currentTime}
        onUpdateTrack={track => {
          const updated = project.audioTracks.map(t =>
            t.id === track.id ? track : t,
          );
          updateProject({ ...project, audioTracks: updated });
          MediaEngine.setPreviewAudioVolume({
            trackVolume: track.volume,
            trackMuted: track.isMuted,
          });
        }}
        onDeleteTrack={id => {
          const updated = project.audioTracks.filter(t => t.id !== id);
          setSelectedAudioTrack(null);
          updateProject({ ...project, audioTracks: updated });
          MediaEngine.setPreviewAudioVolume({
            trackVolume: 0,
            trackMuted: true,
          });
        }}
        onExtractAudio={handleExtractAudio}
        onAddRecordedVoiceover={newTrack => {
          updateProject({
            ...project,
            audioTracks: [...project.audioTracks, newTrack],
          });
          Alert.alert(
            'Voiceover Added',
            'Recorded voiceover added to timeline.',
          );
        }}
        onAddSoundEffect={sfx => {
          const sfxTrack: AudioTrack = {
            id: `sfx_${Date.now()}`,
            name: sfx.name,
            uri: sfx.uri,
            duration: sfx.duration || 1.0,
            originalDuration: sfx.duration || 1.0,
            startTime: currentTime,
            trimStart: 0,
            trimEnd: sfx.duration || 1.0,
            volume: 1.0,
            fadeInDuration: 0,
            fadeOutDuration: 0,
            isMuted: false,
          };
          updateProject({
            ...project,
            audioTracks: [...project.audioTracks, sfxTrack],
          });
          Alert.alert('Sound Effect Added', `Added "${sfx.name}" at playhead.`);
        }}
        onPickDeviceMusic={async () => {
          try {
            const picked = await MediaEngine.pickAudio();
            if (picked && picked.uri) {
              const newTrack: AudioTrack = {
                id: `music_${Date.now()}`,
                name: picked.name || 'Device Audio',
                uri: picked.uri,
                duration: Math.min(picked.duration, totalDuration || 30),
                originalDuration: picked.duration,
                startTime: currentTime,
                trimStart: 0,
                trimEnd: Math.min(picked.duration, totalDuration || 30),
                volume: 0.8,
                fadeInDuration: 0.5,
                fadeOutDuration: 0.5,
                isMuted: false,
              };
              updateProject({
                ...project,
                audioTracks: [...project.audioTracks, newTrack],
              });
              Alert.alert(
                'Music Added',
                `Added "${newTrack.name}" to project.`,
              );
            }
          } catch (e: any) {
            Alert.alert('Audio Picker', e?.message || 'Could not pick audio.');
          }
        }}
        onAddMusic={async () => {
          try {
            const starters = await MediaEngine.getStarterMusic();
            const starter = starters[0];
            const newMusic: AudioTrack = {
              id: `music_${Date.now()}`,
              name: starter?.name || 'Upbeat Reel Beat',
              uri: starter?.uri || 'asset:/sample_audio.wav',
              duration: totalDuration || 15,
              originalDuration: starter?.duration || 15,
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
            Alert.alert('Music Added', 'Added Upbeat Reel Beat to project.');
          } catch (e: any) {
            Alert.alert(
              'Music Error',
              e?.message || 'Could not load starter music.',
            );
          }
        }}
      />

      <StickersModal
        visible={stickersModalVisible}
        onClose={() => setStickersModalVisible(false)}
        onSelectEmoji={handleAddEmojiSticker}
      />

      <PipModal
        visible={pipModalVisible}
        onClose={() => setPipModalVisible(false)}
        pipLayers={project.pipLayers || []}
        selectedPipId={selectedPipId}
        currentTime={currentTime}
        totalDuration={totalDuration}
        onSelectPip={setSelectedPipId}
        onAddPip={handleAddPip}
        onUpdatePip={handleUpdatePip}
        onDeletePip={handleDeletePip}
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
