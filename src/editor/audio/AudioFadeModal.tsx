import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Modal } from '../../components/common/Modal';
import { CustomSlider } from '../../components/common/Slider';
import { Button } from '../../components/common/Button';
import { AppIcon } from '../../components/icons/AppIcons';
import { AudioTrack } from '../../types/project';
import { HapticsService } from '../../services/hapticsService';

interface AudioFadeModalProps {
  visible: boolean;
  onClose: () => void;
  tracks: AudioTrack[];
  selectedTrackId?: string | null;
  initialMode?: 'fadeIn' | 'fadeOut';
  onUpdateTrack: (track: AudioTrack) => void;
}

const PRESET_DURATIONS = [0, 0.5, 1.0, 2.0, 3.0];

export const AudioFadeModal: React.FC<AudioFadeModalProps> = ({
  visible,
  onClose,
  tracks,
  selectedTrackId,
  initialMode = 'fadeIn',
  onUpdateTrack,
}) => {
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (selectedTrackId && tracks.some(t => t.id === selectedTrackId)) {
        setActiveTrackId(selectedTrackId);
      } else if (tracks.length > 0) {
        setActiveTrackId(tracks[0].id);
      } else {
        setActiveTrackId(null);
      }
    }
  }, [visible, selectedTrackId, tracks]);

  const activeTrack = tracks.find(t => t.id === activeTrackId) || tracks[0] || null;

  if (!activeTrack) {
    return null;
  }

  const fadeIn = Number((activeTrack.fadeInDuration || 0).toFixed(1));
  const fadeOut = Number((activeTrack.fadeOutDuration || 0).toFixed(1));

  return (
    <Modal visible={visible} onClose={onClose} title="Audio Fade Effects">
      <View style={styles.container}>
        {/* Track Selector Chip Row (when multiple audio tracks exist) */}
        {tracks.length > 1 && (
          <View style={styles.trackPickerContainer}>
            <Text style={styles.sectionLabel}>Select Audio Track</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trackChipsRow}
            >
              {tracks.map(t => {
                const isSelected = t.id === activeTrack.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => {
                      HapticsService.light();
                      setActiveTrackId(t.id);
                    }}
                    style={[
                      styles.trackChip,
                      isSelected && styles.trackChipActive,
                    ]}
                  >
                    <AppIcon
                      name="music"
                      size={14}
                      color={isSelected ? '#FFFFFF' : colors.textSecondary}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.trackChipText,
                        isSelected && styles.trackChipTextActive,
                      ]}
                    >
                      {t.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Active Track Header Badge */}
        <View style={styles.activeTrackBanner}>
          <View style={styles.trackIconCircle}>
            <AppIcon name="music" size={16} color={colors.primaryLight} />
          </View>
          <View style={styles.trackDetails}>
            <Text style={styles.activeTrackName} numberOfLines={1}>
              {activeTrack.name}
            </Text>
            <Text style={styles.activeTrackHint}>
              Adjust smooth volume transitions for start and end
            </Text>
          </View>
        </View>

        {/* Fade In Duration Slider & Presets */}
        <View
          style={[
            styles.sliderSection,
            initialMode === 'fadeIn' && styles.focusedSliderSection,
          ]}
        >
          <CustomSlider
            label="Fade In Duration"
            value={fadeIn}
            min={0}
            max={5}
            step={0.1}
            onValueChange={val =>
              onUpdateTrack({
                ...activeTrack,
                fadeInDuration: Number(val.toFixed(1)),
              })
            }
            formatValue={val => `${val.toFixed(1)}s`}
            activeColor={colors.primary}
          />
          <View style={styles.presetRow}>
            {PRESET_DURATIONS.map(dur => {
              const isSelected = Math.abs(fadeIn - dur) < 0.05;
              return (
                <Pressable
                  key={dur}
                  onPress={() => {
                    HapticsService.light();
                    onUpdateTrack({
                      ...activeTrack,
                      fadeInDuration: dur,
                    });
                  }}
                  style={[
                    styles.presetChip,
                    isSelected && styles.presetChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.presetText,
                      isSelected && styles.presetTextActive,
                    ]}
                  >
                    {dur === 0 ? 'Off' : `${dur}s`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Fade Out Duration Slider & Presets */}
        <View
          style={[
            styles.sliderSection,
            initialMode === 'fadeOut' && styles.focusedSliderSection,
          ]}
        >
          <CustomSlider
            label="Fade Out Duration"
            value={fadeOut}
            min={0}
            max={5}
            step={0.1}
            onValueChange={val =>
              onUpdateTrack({
                ...activeTrack,
                fadeOutDuration: Number(val.toFixed(1)),
              })
            }
            formatValue={val => `${val.toFixed(1)}s`}
            activeColor={colors.accent}
          />
          <View style={styles.presetRow}>
            {PRESET_DURATIONS.map(dur => {
              const isSelected = Math.abs(fadeOut - dur) < 0.05;
              return (
                <Pressable
                  key={dur}
                  onPress={() => {
                    HapticsService.light();
                    onUpdateTrack({
                      ...activeTrack,
                      fadeOutDuration: dur,
                    });
                  }}
                  style={[
                    styles.presetChip,
                    isSelected && styles.presetChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.presetText,
                      isSelected && styles.presetTextActive,
                    ]}
                  >
                    {dur === 0 ? 'Off' : `${dur}s`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Done Button */}
        <View style={styles.actionRow}>
          <Button
            title="Done"
            variant="primary"
            size="md"
            onPress={() => {
              HapticsService.medium();
              onClose();
            }}
            style={styles.doneButton}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.base,
  },
  trackPickerContainer: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  trackChipsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  trackChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
    maxWidth: 160,
  },
  trackChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  trackChipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  trackChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  activeTrackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  trackIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  trackDetails: {
    flex: 1,
  },
  activeTrackName: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '700',
  },
  activeTrackHint: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  sliderSection: {
    marginBottom: spacing.base,
    padding: spacing.xs,
    borderRadius: borderRadius.md,
  },
  focusedSliderSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  presetChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  presetChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  presetText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  presetTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionRow: {
    marginTop: spacing.sm,
  },
  doneButton: {
    width: '100%',
  },
});
