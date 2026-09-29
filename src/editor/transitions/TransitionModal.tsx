import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { CustomSlider } from '../../components/common/Slider';
import { AppIcon, IconName } from '../../components/icons/AppIcons';
import { ClipTransition, TransitionType } from '../../types/project';
import { TRANSITION_PRESETS } from './transitionTypes';
import { HapticsService } from '../../services/hapticsService';

interface TransitionModalProps {
  visible: boolean;
  onClose: () => void;
  currentTransition: ClipTransition;
  onSelectTransition: (transition: ClipTransition) => void;
  onApplyToAll?: (transition: ClipTransition) => void;
}

const TRANSITION_ICONS: Record<TransitionType, IconName> = {
  none: 'close',
  fade: 'sparkles',
  dissolve: 'adjust',
  slide: 'flip',
  zoom: 'fullscreen',
};

export const TransitionModal: React.FC<TransitionModalProps> = ({
  visible,
  onClose,
  currentTransition,
  onSelectTransition,
  onApplyToAll,
}) => {
  const [selectedType, setSelectedType] = useState<TransitionType>(
    currentTransition.type,
  );
  const [duration, setDuration] = useState<number>(
    currentTransition.duration || 0.5,
  );

  const handleSelectType = (type: TransitionType) => {
    HapticsService.light();
    setSelectedType(type);
    onSelectTransition({ type, duration });
  };

  const handleDurationChange = (newDur: number) => {
    const rounded = Number(newDur.toFixed(1));
    setDuration(rounded);
    onSelectTransition({ type: selectedType, duration: rounded });
  };

  const handleApplyAll = () => {
    HapticsService.medium();
    onApplyToAll?.({ type: selectedType, duration });
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Transitions">
      <View style={styles.container}>
        {/* Preset Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsList}
        >
          {TRANSITION_PRESETS.map(preset => {
            const isSelected = selectedType === preset.type;
            const icon = TRANSITION_ICONS[preset.type] || 'sparkles';

            return (
              <Pressable
                key={preset.type}
                onPress={() => handleSelectType(preset.type)}
                style={[
                  styles.presetCard,
                  isSelected && styles.selectedPresetCard,
                ]}
              >
                <View
                  style={[
                    styles.iconCircle,
                    isSelected && styles.selectedIconCircle,
                  ]}
                >
                  <AppIcon
                    name={icon}
                    size={22}
                    color={isSelected ? '#0B0D13' : colors.textSecondary}
                  />
                </View>
                <Text
                  style={[
                    styles.presetName,
                    isSelected && styles.selectedPresetName,
                  ]}
                  numberOfLines={1}
                >
                  {preset.name}
                </Text>
                <Text style={styles.presetDesc} numberOfLines={2}>
                  {preset.description}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Transition Duration Slider (active if not none) */}
        {selectedType !== 'none' && (
          <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
              <Text style={styles.sliderLabel}>Transition Duration</Text>
              <Text style={styles.sliderValue}>{duration.toFixed(1)}s</Text>
            </View>
            <CustomSlider
              value={duration}
              min={0.2}
              max={2.0}
              step={0.1}
              onValueChange={handleDurationChange}
            />
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          {onApplyToAll && selectedType !== 'none' && (
            <Button
              title="Apply to All Clips"
              variant="secondary"
              size="sm"
              onPress={handleApplyAll}
              style={styles.applyAllBtn}
            />
          )}
          <Button
            title="Done"
            variant="primary"
            size="sm"
            onPress={onClose}
            style={styles.doneBtn}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
  },
  presetsList: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  presetCard: {
    width: 100,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedPresetCard: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.surfaceElevated,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  selectedIconCircle: {
    backgroundColor: colors.primaryLight,
  },
  presetName: {
    ...typography.captionBold,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 2,
  },
  selectedPresetName: {
    color: colors.text,
  },
  presetDesc: {
    ...typography.caption,
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
  },
  sliderContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sliderLabel: {
    ...typography.bodySecondary,
    fontSize: 13,
  },
  sliderValue: {
    ...typography.bodyMedium,
    color: colors.primaryLight,
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    justifyContent: 'flex-end',
  },
  applyAllBtn: {
    flex: 1,
  },
  doneBtn: {
    minWidth: 90,
  },
});
