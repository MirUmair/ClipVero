import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Modal } from '../../components/common/Modal';
import { HapticsService } from '../../services/hapticsService';

interface SpeedSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  currentSpeed: number;
  onSelectSpeed: (speed: number) => void;
  originalDuration: number;
  trimDuration: number;
}

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0];

export const SpeedSelectorModal: React.FC<SpeedSelectorModalProps> = ({
  visible,
  onClose,
  currentSpeed,
  onSelectSpeed,
  trimDuration,
}) => {
  const calculateEffective = (speed: number) => {
    return (trimDuration / speed).toFixed(1);
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Speed">
      <View style={styles.container}>
        <Text style={styles.hint}>
          New Duration: {calculateEffective(currentSpeed)}s
        </Text>

        <View style={styles.grid}>
          {SPEED_OPTIONS.map(speed => {
            const isSelected = currentSpeed === speed;
            return (
              <Pressable
                key={speed}
                onPress={() => {
                  HapticsService.light();
                  onSelectSpeed(speed);
                }}
                style={[styles.chip, isSelected && styles.selectedChip]}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.selectedChipText,
                  ]}
                >
                  {speed}x
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 64,
    alignItems: 'center',
  },
  selectedChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  chipText: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  selectedChipText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
