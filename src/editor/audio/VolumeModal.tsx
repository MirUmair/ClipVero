import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Modal } from '../../components/common/Modal';
import { CustomSlider } from '../../components/common/Slider';
import { AppIcon } from '../../components/icons/AppIcons';
import { HapticsService } from '../../services/hapticsService';

interface VolumeModalProps {
  visible: boolean;
  onClose: () => void;
  volume: number; // 0 to 2
  isMuted: boolean;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
}

const PRESETS = [0, 50, 100, 150, 200];

export const VolumeModal: React.FC<VolumeModalProps> = ({
  visible,
  onClose,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}) => {
  const percent = Math.round((isMuted ? 0 : volume) * 100);

  return (
    <Modal visible={visible} onClose={onClose} title="Volume & Boost">
      <View style={styles.container}>
        <CustomSlider
          label={percent > 100 ? 'Volume (Boosted)' : 'Volume'}
          value={percent}
          min={0}
          max={200}
          step={1}
          onValueChange={val => onVolumeChange(val / 100)}
          formatValue={val => `${val}%`}
          activeColor={percent > 100 ? colors.accent : colors.primary}
        />

        {/* Quick Presets */}
        <View style={styles.presetRow}>
          {PRESETS.map(p => {
            const isSelected = percent === p;
            return (
              <Pressable
                key={p}
                onPress={() => {
                  HapticsService.light();
                  if (p === 0) {
                    if (!isMuted) onToggleMute();
                  } else {
                    if (isMuted) onToggleMute();
                    onVolumeChange(p / 100);
                  }
                }}
                style={[
                  styles.presetChip,
                  isSelected && styles.presetChipActive,
                  p > 100 && styles.boostChip,
                ]}
              >
                <Text
                  style={[
                    styles.presetText,
                    isSelected && styles.presetTextActive,
                    p > 100 && styles.boostText,
                  ]}
                >
                  {p === 100 ? '100%' : p > 100 ? `${p}% ⚡` : `${p}%`}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.actionRow}>
          <Pressable
            onPress={() => {
              HapticsService.light();
              onToggleMute();
            }}
            style={[styles.muteButton, isMuted && styles.mutedActive]}
          >
            <AppIcon
              name={isMuted ? 'mute' : 'volume'}
              size={18}
              color={isMuted ? colors.error : colors.text}
            />
            <Text style={[styles.muteText, isMuted && { color: colors.error }]}>
              {isMuted ? 'Unmute Clip' : 'Mute Original Audio'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  presetChip: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  presetChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  presetText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 11,
  },
  presetTextActive: {
    color: '#FFFFFF',
  },
  boostChip: {
    borderColor: colors.accent,
  },
  boostText: {
    color: colors.accent,
  },
  actionRow: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  muteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mutedActive: {
    borderColor: colors.error,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  muteText: {
    ...typography.bodyMedium,
    color: colors.text,
    marginLeft: spacing.sm,
  },
});
