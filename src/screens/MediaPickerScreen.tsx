import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
} from 'react-native';
import { ThemedAlert as Alert } from '../services/alertService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';
import { IconButton } from '../components/common/IconButton';
import { AppIcon } from '../components/icons/AppIcons';
import { MediaClip, Project } from '../types/project';
import { useAppNavigation } from '../navigation/navigationContext';
import { HapticsService } from '../services/hapticsService';
import { MediaEngine } from '../media/mediaEngine';
import { formatDuration } from '../utils/timeUtils';
import { AutosaveManager } from '../storage/autosaveManager';

// Sample royalty-free starter footage clips for testing and out-of-the-box editing
const SAMPLE_MEDIA: Array<Omit<MediaClip, 'id'>> = [
  {
    name: 'Sunset Reel.mp4',
    uri: 'asset:/sample_videos/sample1.mp4',
    type: 'video',
    duration: 15.0,
    originalDuration: 15.0,
    trimStart: 0,
    trimEnd: 15.0,
    speed: 1.0,
    volume: 1.0,
    isMuted: false,
    rotation: 0,
    flipHorizontal: false,
    flipVertical: false,
    crop: null,
    filterId: 'none',
    adjustments: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      exposure: 0,
      temperature: 0,
      highlights: 0,
      shadows: 0,
      sharpen: 0,
    },
    transition: { type: 'none', duration: 0.5 },
    width: 1080,
    height: 1920,
    thumbnailUri: 'asset:/sample_videos/sample1.mp4',
  },
  {
    name: 'Urban Street.mp4',
    uri: 'asset:/sample_videos/sample2.mp4',
    type: 'video',
    duration: 12.0,
    originalDuration: 12.0,
    trimStart: 0,
    trimEnd: 12.0,
    speed: 1.0,
    volume: 1.0,
    isMuted: false,
    rotation: 0,
    flipHorizontal: false,
    flipVertical: false,
    crop: null,
    filterId: 'none',
    adjustments: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      exposure: 0,
      temperature: 0,
      highlights: 0,
      shadows: 0,
      sharpen: 0,
    },
    transition: { type: 'none', duration: 0.5 },
    width: 1080,
    height: 1920,
    thumbnailUri: 'asset:/sample_videos/sample2.mp4',
  },
  {
    name: 'Action Shorts.mp4',
    uri: 'asset:/sample_videos/sample3.mp4',
    type: 'video',
    duration: 10.0,
    originalDuration: 10.0,
    trimStart: 0,
    trimEnd: 10.0,
    speed: 1.0,
    volume: 1.0,
    isMuted: false,
    rotation: 0,
    flipHorizontal: false,
    flipVertical: false,
    crop: null,
    filterId: 'none',
    adjustments: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      exposure: 0,
      temperature: 0,
      highlights: 0,
      shadows: 0,
      sharpen: 0,
    },
    transition: { type: 'none', duration: 0.5 },
    width: 1080,
    height: 1920,
    thumbnailUri: 'asset:/sample_videos/sample3.mp4',
  },
];

export const MediaPickerScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const [selectedClips, setSelectedClips] = useState<MediaClip[]>([]);
  const [sampleClips, setSampleClips] =
    useState<Array<Omit<MediaClip, 'id'>>>(SAMPLE_MEDIA);
  const [isPickingFromDevice, setIsPickingFromDevice] = useState(false);

  useEffect(() => {
    MediaEngine.getSampleVideos().then(nativeSamples => {
      if (nativeSamples && nativeSamples.length > 0) {
        setSampleClips(nativeSamples);
      }
    });
  }, []);

  const handlePickFromDevice = async () => {
    try {
      setIsPickingFromDevice(true);
      HapticsService.medium();
      const picked = await MediaEngine.pickMedia();
      if (picked && picked.length > 0) {
        HapticsService.success();
        setSelectedClips(prev => [...prev, ...picked]);
      }
    } catch (e: any) {
      console.warn('Device media pick error:', e);
      Alert.alert(
        'Media Picker',
        'Could not load videos/photos: ' +
          (e?.message || 'Permission denied or cancelled'),
      );
    } finally {
      setIsPickingFromDevice(false);
    }
  };

  const handleAddSample = (sample: Omit<MediaClip, 'id'>) => {
    HapticsService.light();
    const newClip: MediaClip = {
      ...sample,
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    setSelectedClips(prev => [...prev, newClip]);
  };

  const handleRemoveClip = (id: string) => {
    HapticsService.light();
    setSelectedClips(prev => prev.filter(c => c.id !== id));
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    HapticsService.light();
    setSelectedClips(prev => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= selectedClips.length - 1) return;
    HapticsService.light();
    setSelectedClips(prev => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const existingProject = navigation.params?.project;
  const isAppendMode =
    navigation.params?.mode === 'append' ||
    (!!existingProject && !navigation.params?.quickToolMode);
  const quickToolMode = navigation.params?.quickToolMode;

  const handleProceedToEditor = () => {
    if (selectedClips.length === 0) {
      Alert.alert(
        'No Media Selected',
        isAppendMode
          ? 'Please select at least one video to add to your project.'
          : 'Please select at least one video to start editing.',
      );
      return;
    }

    HapticsService.medium();

    if (isAppendMode && existingProject) {
      const updatedClips = [...existingProject.clips, ...selectedClips];
      const updatedProject: Project = {
        ...existingProject,
        clips: updatedClips,
        updatedAt: Date.now(),
        thumbnailUri:
          existingProject.thumbnailUri ||
          selectedClips[0]?.thumbnailUri ||
          selectedClips[0]?.uri,
      };

      AutosaveManager.scheduleSave(updatedProject);
      navigation.navigate('Editor', {
        project: updatedProject,
        addedClipsCount: selectedClips.length,
      });
      return;
    }

    const newProject: Project = {
      id: `proj_${Date.now()}`,
      name: `Reel ${new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      aspectRatio: '9:16',
      canvasBackground: { type: 'fit', color: '#000000' },
      clips: selectedClips,
      textLayers: [],
      stickerLayers: [],
      audioTracks: [],
      exportSettings: {
        resolution: '1080p',
        fps: 30,
        quality: 'recommended',
        format: 'mp4',
      },
      thumbnailUri: selectedClips[0]?.thumbnailUri || selectedClips[0]?.uri,
    };

    navigation.navigate('Editor', { project: newProject, quickToolMode });
  };

  const handleBack = () => {
    if (isAppendMode && existingProject) {
      navigation.navigate('Editor', { project: existingProject });
    } else {
      navigation.goBack();
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <Header
        title={
          isAppendMode
            ? 'Add Media'
            : quickToolMode === 'trim'
            ? 'Trim Video'
            : 'Select Media'
        }
        subtitle={
          isAppendMode
            ? selectedClips.length > 0
              ? `${selectedClips.length} new clip${
                  selectedClips.length === 1 ? '' : 's'
                } selected`
              : `Add to "${existingProject?.name || 'Project'}"`
            : selectedClips.length > 0
            ? `${selectedClips.length} items selected`
            : quickToolMode === 'trim'
            ? 'Select a video to trim'
            : 'Pick footage to edit'
        }
        onBack={handleBack}
      />

      <View style={styles.content}>
        {/* Context Banner when appending to an existing project */}
        {isAppendMode && existingProject && (
          <View style={styles.projectContextCard}>
            <View style={styles.projectContextBadge}>
              <AppIcon name="layers" size={16} color={colors.primaryLight} />
            </View>
            <View style={styles.projectContextInfo}>
              <Text style={styles.projectContextTitle} numberOfLines={1}>
                Adding to: {existingProject.name}
              </Text>
              <Text style={styles.projectContextSubtitle}>
                {existingProject.clips.length} existing clip{existingProject.clips.length === 1 ? '' : 's'} · New footage will append to timeline
              </Text>
            </View>
          </View>
        )}

        {/* Device Photo / Video Gallery Picker */}
        <Pressable
          style={[
            styles.devicePickerCard,
            isPickingFromDevice && styles.devicePickerCardDisabled,
          ]}
          onPress={handlePickFromDevice}
          disabled={isPickingFromDevice}
        >
          <View style={styles.devicePickerIconCircle}>
            <AppIcon name="plus" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.devicePickerTextContainer}>
            <Text style={styles.devicePickerTitle}>
              {isPickingFromDevice
                ? 'Opening Gallery...'
                : 'Choose from Device Gallery'}
            </Text>
            <Text style={styles.devicePickerSubtitle}>
              Select photos and videos stored on your device
            </Text>
          </View>
          <AppIcon name="chevronRight" size={18} color={colors.textMuted} />
        </Pressable>

        {/* Sample / Available Media Gallery */}
        <Text style={styles.sectionHeader}>Available Footage & Samples</Text>
        <View style={styles.samplesGrid}>
          {sampleClips.map((item, idx) => (
            <Pressable
              key={`sample_${idx}`}
              onPress={() => handleAddSample(item)}
              style={styles.sampleCard}
            >
              <Image
                source={{ uri: item.thumbnailUri }}
                style={styles.sampleThumb}
              />
              <View style={styles.sampleBadge}>
                <Text style={styles.sampleDuration}>
                  {formatDuration(item.duration)}
                </Text>
              </View>
              <View style={styles.sampleAddOverlay}>
                <AppIcon name="plus" size={16} color="#FFFFFF" />
              </View>
            </Pressable>
          ))}
        </View>

        {/* Selected Media Sequence */}
        <Text style={[styles.sectionHeader, { marginTop: spacing.lg }]}>
          {isAppendMode
            ? `New Clips to Add (${selectedClips.length})`
            : `Project Sequence (${selectedClips.length})`}
        </Text>

        {selectedClips.length === 0 ? (
          <View style={styles.emptyBox}>
            <AppIcon name="sparkles" size={28} color={colors.textSecondary} />
            <Text style={styles.emptyText}>
              {isAppendMode
                ? 'Tap footage above to append to your project timeline'
                : 'Tap footage above to add to your project'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={selectedClips}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <View style={styles.selectedRow}>
                <Image
                  source={{ uri: item.thumbnailUri || item.uri }}
                  style={styles.selectedThumb}
                />
                <View style={styles.selectedMeta}>
                  <Text style={styles.clipTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.clipDuration}>
                    {formatDuration(item.duration)}
                  </Text>
                </View>

                {/* Reorder Buttons */}
                <View style={styles.reorderButtons}>
                  <IconButton
                    name="undo"
                    size={28}
                    iconSize={14}
                    onPress={() => handleMoveUp(index)}
                    color={
                      index === 0 ? colors.textMuted : colors.textSecondary
                    }
                  />
                  <IconButton
                    name="redo"
                    size={28}
                    iconSize={14}
                    onPress={() => handleMoveDown(index)}
                    color={
                      index === selectedClips.length - 1
                        ? colors.textMuted
                        : colors.textSecondary
                    }
                  />
                </View>

                {/* Remove Button */}
                <IconButton
                  name="trash"
                  size={32}
                  iconSize={16}
                  color={colors.error}
                  onPress={() => handleRemoveClip(item.id)}
                />
              </View>
            )}
            style={styles.selectedList}
          />
        )}
      </View>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <Button
          title={
            isAppendMode
              ? selectedClips.length > 0
                ? `Add ${selectedClips.length} Clip${
                    selectedClips.length === 1 ? '' : 's'
                  } to Timeline`
                : 'Select Media to Add'
              : `Open Editor (${selectedClips.length})`
          }
          variant="primary"
          size="lg"
          onPress={handleProceedToEditor}
          disabled={selectedClips.length === 0}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.base,
  },
  projectContextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 77, 255, 0.12)',
    borderRadius: borderRadius.md,
    padding: spacing.sm + 4,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(124, 77, 255, 0.3)',
  },
  projectContextBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(124, 77, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 2,
  },
  projectContextInfo: {
    flex: 1,
  },
  projectContextTitle: {
    ...typography.bodyMedium,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  projectContextSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  devicePickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  devicePickerCardDisabled: {
    opacity: 0.6,
  },
  devicePickerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  devicePickerTextContainer: {
    flex: 1,
  },
  devicePickerTitle: {
    ...typography.bodyMedium,
    color: colors.text,
    fontSize: 15,
  },
  devicePickerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginVertical: spacing.sm,
    textTransform: 'uppercase',
  },
  samplesGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sampleCard: {
    width: 90,
    height: 120,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  sampleThumb: {
    width: '100%',
    height: '100%',
  },
  sampleBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  sampleDuration: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sampleAddOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginVertical: spacing.md,
  },
  emptyText: {
    ...typography.bodySecondary,
    marginTop: spacing.sm,
  },
  selectedList: {
    flex: 1,
    marginTop: spacing.xs,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedThumb: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
  },
  selectedMeta: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  clipTitle: {
    ...typography.bodyMedium,
    fontSize: 13,
    color: colors.text,
  },
  clipDuration: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  reorderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  bottomBar: {
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
