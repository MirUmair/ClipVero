import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { HapticsService } from '../../services/hapticsService';
import { formatDuration } from '../../utils/timeUtils';

interface TrimModalProps {
  visible: boolean;
  onClose: () => void;
  clipName: string;
  originalDuration: number;
  trimStart: number;
  trimEnd: number;
  onApplyTrim: (newStart: number, newEnd: number) => void;
}

export const TrimModal: React.FC<TrimModalProps> = ({
  visible,
  onClose,
  clipName,
  originalDuration,
  trimStart,
  trimEnd,
  onApplyTrim,
}) => {
  const safeOriginal = Math.max(0.5, originalDuration || 10.0);
  const [start, setStart] = useState<number>(trimStart);
  const [end, setEnd] = useState<number>(trimEnd > 0 ? trimEnd : safeOriginal);

  useEffect(() => {
    if (visible) {
      setStart(Math.max(0, trimStart));
      setEnd(trimEnd > 0 ? Math.min(safeOriginal, trimEnd) : safeOriginal);
    }
  }, [visible, trimStart, trimEnd, safeOriginal]);

  const currentDuration = Math.max(0.1, end - start);

  const adjustStart = (delta: number) => {
    HapticsService.light();
    setStart(prev => {
      const next = Math.max(0, Math.min(end - 0.2, Number((prev + delta).toFixed(2))));
      return next;
    });
  };

  const adjustEnd = (delta: number) => {
    HapticsService.light();
    setEnd(prev => {
      const next = Math.min(safeOriginal, Math.max(start + 0.2, Number((prev + delta).toFixed(2))));
      return next;
    });
  };

  const handleApplyPreset = (targetSec: number) => {
    HapticsService.medium();
    setStart(0);
    setEnd(Math.min(safeOriginal, targetSec));
  };

  const handleReset = () => {
    HapticsService.light();
    setStart(0);
    setEnd(safeOriginal);
  };

  const handleApply = () => {
    HapticsService.medium();
    onApplyTrim(Number(start.toFixed(2)), Number(end.toFixed(2)));
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Trim Video">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Clip Title & Duration Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.clipTitle} numberOfLines={1}>
            {clipName || 'Selected Clip'}
          </Text>
          <View style={styles.durationRow}>
            <View style={styles.durationCol}>
              <Text style={styles.durationLabel}>Original</Text>
              <Text style={styles.durationValue}>{formatDuration(safeOriginal)}</Text>
            </View>
            <View style={styles.durationCol}>
              <Text style={styles.durationLabel}>Trimmed Duration</Text>
              <Text style={[styles.durationValue, { color: colors.primary }]}>
                {formatDuration(currentDuration)}
              </Text>
            </View>
          </View>
        </View>

        {/* Start Time Fine Adjust */}
        <View style={styles.adjustSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trim Start Point</Text>
            <Text style={styles.timeBadge}>{start.toFixed(1)}s</Text>
          </View>
          <View style={styles.buttonsRow}>
            <Pressable style={styles.stepBtn} onPress={() => adjustStart(-1.0)}>
              <Text style={styles.stepBtnText}>-1s</Text>
            </Pressable>
            <Pressable style={styles.stepBtn} onPress={() => adjustStart(-0.1)}>
              <Text style={styles.stepBtnText}>-0.1s</Text>
            </Pressable>
            <Pressable style={styles.stepBtn} onPress={() => adjustStart(0.1)}>
              <Text style={styles.stepBtnText}>+0.1s</Text>
            </Pressable>
            <Pressable style={styles.stepBtn} onPress={() => adjustStart(1.0)}>
              <Text style={styles.stepBtnText}>+1s</Text>
            </Pressable>
          </View>
        </View>

        {/* End Time Fine Adjust */}
        <View style={styles.adjustSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trim End Point</Text>
            <Text style={styles.timeBadge}>{end.toFixed(1)}s</Text>
          </View>
          <View style={styles.buttonsRow}>
            <Pressable style={styles.stepBtn} onPress={() => adjustEnd(-1.0)}>
              <Text style={styles.stepBtnText}>-1s</Text>
            </Pressable>
            <Pressable style={styles.stepBtn} onPress={() => adjustEnd(-0.1)}>
              <Text style={styles.stepBtnText}>-0.1s</Text>
            </Pressable>
            <Pressable style={styles.stepBtn} onPress={() => adjustEnd(0.1)}>
              <Text style={styles.stepBtnText}>+0.1s</Text>
            </Pressable>
            <Pressable style={styles.stepBtn} onPress={() => adjustEnd(1.0)}>
              <Text style={styles.stepBtnText}>+1s</Text>
            </Pressable>
          </View>
        </View>

        {/* Quick Trim Presets */}
        <View style={styles.presetsSection}>
          <Text style={styles.sectionTitle}>Quick Cut Presets</Text>
          <View style={styles.presetsRow}>
            <Pressable style={styles.presetChip} onPress={handleReset}>
              <Text style={styles.presetChipText}>Full Video</Text>
            </Pressable>
            {safeOriginal > 15 && (
              <Pressable style={styles.presetChip} onPress={() => handleApplyPreset(15)}>
                <Text style={styles.presetChipText}>First 15s</Text>
              </Pressable>
            )}
            {safeOriginal > 30 && (
              <Pressable style={styles.presetChip} onPress={() => handleApplyPreset(30)}>
                <Text style={styles.presetChipText}>First 30s</Text>
              </Pressable>
            )}
            {safeOriginal > 60 && (
              <Pressable style={styles.presetChip} onPress={() => handleApplyPreset(60)}>
                <Text style={styles.presetChipText}>First 60s</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <Button
            title="Reset"
            variant="ghost"
            onPress={handleReset}
            style={styles.actionBtn}
          />
          <Button
            title="Apply Trim"
            variant="primary"
            onPress={handleApply}
            style={styles.actionBtn}
          />
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.lg,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  clipTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationCol: {
    alignItems: 'flex-start',
  },
  durationLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  durationValue: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 18,
  },
  adjustSection: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.bodyBold,
    color: colors.text,
  },
  timeBadge: {
    ...typography.caption,
    color: colors.primary,
    backgroundColor: 'rgba(235, 77, 75, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    fontWeight: '700',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  stepBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  stepBtnText: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 14,
  },
  presetsSection: {
    marginBottom: spacing.lg,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  presetChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
  },
  presetChipText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionBtn: {
    flex: 1,
  },
});
