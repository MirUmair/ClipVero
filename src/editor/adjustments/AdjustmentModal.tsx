import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { spacing } from '../../theme/spacing';
import { Modal } from '../../components/common/Modal';
import { CustomSlider } from '../../components/common/Slider';
import { Button } from '../../components/common/Button';
import { ClipAdjustments } from '../../types/project';
import { HapticsService } from '../../services/hapticsService';

interface AdjustmentModalProps {
  visible: boolean;
  onClose: () => void;
  adjustments: ClipAdjustments;
  onChangeAdjustments: (newAdjustments: ClipAdjustments) => void;
}

const DEFAULT_ADJUSTMENTS: ClipAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  temperature: 0,
  highlights: 0,
  shadows: 0,
  sharpen: 0,
};

export const AdjustmentModal: React.FC<AdjustmentModalProps> = ({
  visible,
  onClose,
  adjustments,
  onChangeAdjustments,
}) => {
  const updateField = (field: keyof ClipAdjustments, value: number) => {
    onChangeAdjustments({
      ...adjustments,
      [field]: value,
    });
  };

  const handleReset = () => {
    HapticsService.snap();
    onChangeAdjustments(DEFAULT_ADJUSTMENTS);
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Adjustments">
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <CustomSlider
          label="Brightness"
          value={adjustments.brightness}
          min={-100}
          max={100}
          onValueChange={val => updateField('brightness', val)}
          formatValue={val => `${val > 0 ? '+' : ''}${val}`}
        />

        <CustomSlider
          label="Contrast"
          value={adjustments.contrast}
          min={-100}
          max={100}
          onValueChange={val => updateField('contrast', val)}
          formatValue={val => `${val > 0 ? '+' : ''}${val}`}
        />

        <CustomSlider
          label="Saturation"
          value={adjustments.saturation}
          min={-100}
          max={100}
          onValueChange={val => updateField('saturation', val)}
          formatValue={val => `${val > 0 ? '+' : ''}${val}`}
        />

        <CustomSlider
          label="Exposure"
          value={adjustments.exposure}
          min={-100}
          max={100}
          onValueChange={val => updateField('exposure', val)}
          formatValue={val => `${val > 0 ? '+' : ''}${val}`}
        />

        <CustomSlider
          label="Temperature"
          value={adjustments.temperature}
          min={-100}
          max={100}
          onValueChange={val => updateField('temperature', val)}
          formatValue={val => `${val > 0 ? '+' : ''}${val}`}
        />

        <CustomSlider
          label="Highlights"
          value={adjustments.highlights}
          min={-100}
          max={100}
          onValueChange={val => updateField('highlights', val)}
          formatValue={val => `${val > 0 ? '+' : ''}${val}`}
        />

        <CustomSlider
          label="Shadows"
          value={adjustments.shadows}
          min={-100}
          max={100}
          onValueChange={val => updateField('shadows', val)}
          formatValue={val => `${val > 0 ? '+' : ''}${val}`}
        />

        <CustomSlider
          label="Sharpen"
          value={adjustments.sharpen}
          min={0}
          max={100}
          onValueChange={val => updateField('sharpen', val)}
          formatValue={val => `${val}`}
        />

        <View style={styles.buttonRow}>
          <Button
            title="Reset All"
            variant="secondary"
            size="sm"
            onPress={handleReset}
          />
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    maxHeight: 380,
    paddingVertical: spacing.xs,
  },
  buttonRow: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
});
