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
  volume: number; // 0 to 1
  isMuted: boolean;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
}

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
    <Modal visible={visible} onClose={onClose} title="Clip Volume">
      <View style={styles.container}>
        <CustomSlider
          label="Volume"
          value={percent}
          min={0}
          max={100}
          step={1}
          onValueChange={val => onVolumeChange(val / 100)}
          formatValue={val => `${val}%`}
        />

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
              {isMuted ? 'Unmute Clip' : 'Mute Clip'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
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
