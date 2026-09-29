import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Modal } from '../../components/common/Modal';
import { AspectRatioType, CanvasBackgroundType } from '../../types/project';
import { ASPECT_RATIOS } from './canvasUtils';
import { HapticsService } from '../../services/hapticsService';

interface RatioModalProps {
  visible: boolean;
  onClose: () => void;
  currentRatio: AspectRatioType;
  currentBgType: CanvasBackgroundType;
  onSelectRatio: (ratio: AspectRatioType) => void;
  onSelectBgType: (bgType: CanvasBackgroundType) => void;
}

const BG_TYPES: Array<{ id: CanvasBackgroundType; label: string }> = [
  { id: 'fit', label: 'Fit' },
  { id: 'fill', label: 'Fill' },
  { id: 'solid', label: 'Solid Black' },
  { id: 'blur', label: 'Blur BG' },
];

export const RatioModal: React.FC<RatioModalProps> = ({
  visible,
  onClose,
  currentRatio,
  currentBgType,
  onSelectRatio,
  onSelectBgType,
}) => {
  return (
    <Modal visible={visible} onClose={onClose} title="Canvas & Ratio">
      <View style={styles.container}>
        <Text style={styles.sectionHeader}>Aspect Ratio</Text>
        <View style={styles.chipRow}>
          {ASPECT_RATIOS.map(item => {
            const isSelected = currentRatio === item.ratio;
            return (
              <Pressable
                key={item.ratio}
                onPress={() => {
                  HapticsService.light();
                  onSelectRatio(item.ratio);
                }}
                style={[styles.ratioChip, isSelected && styles.selectedChip]}
              >
                <Text
                  style={[styles.ratioLabel, isSelected && styles.selectedText]}
                >
                  {item.label}
                </Text>
                <Text style={styles.ratioDesc}>{item.description}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionHeader, { marginTop: spacing.base }]}>
          Canvas Background
        </Text>
        <View style={styles.bgRow}>
          {BG_TYPES.map(item => {
            const isSelected = currentBgType === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  HapticsService.light();
                  onSelectBgType(item.id);
                }}
                style={[styles.bgChip, isSelected && styles.selectedChip]}
              >
                <Text
                  style={[styles.bgText, isSelected && styles.selectedText]}
                >
                  {item.label}
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
    paddingVertical: spacing.xs,
  },
  sectionHeader: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  ratioChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 95,
  },
  ratioLabel: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  ratioDesc: {
    ...typography.caption,
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
  },
  bgRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bgChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  bgText: {
    ...typography.captionBold,
    color: colors.text,
  },
  selectedChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  selectedText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
