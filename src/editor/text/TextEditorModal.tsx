import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Modal } from '../../components/common/Modal';
import { CustomSlider } from '../../components/common/Slider';
import { Button } from '../../components/common/Button';
import { TextLayer } from '../../types/project';
import { TEXT_FONTS, TEXT_COLORS, TEXT_ANIMATIONS } from './textUtils';
import { HapticsService } from '../../services/hapticsService';

interface TextEditorModalProps {
  visible: boolean;
  onClose: () => void;
  layer: TextLayer | null;
  onSaveLayer: (layer: TextLayer) => void;
  onDeleteLayer?: (layerId: string) => void;
}

export const TextEditorModal: React.FC<TextEditorModalProps> = ({
  visible,
  onClose,
  layer,
  onSaveLayer,
  onDeleteLayer,
}) => {
  const [draftText, setDraftText] = useState('');
  const [fontFamily, setFontFamily] = useState('System');
  const [fontSize, setFontSize] = useState(24);
  const [color, setColor] = useState('#FFFFFF');
  const [backgroundColor, setBackgroundColor] = useState<string | undefined>(
    'rgba(0,0,0,0.5)',
  );
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>(
    'center',
  );
  const [animation, setAnimation] = useState<TextLayer['animation']>('fadeIn');

  useEffect(() => {
    if (layer) {
      setDraftText(layer.text);
      setFontFamily(layer.fontFamily);
      setFontSize(layer.fontSize);
      setColor(layer.color);
      setBackgroundColor(layer.backgroundColor);
      setTextAlign(layer.textAlign);
      setAnimation(layer.animation);
    }
  }, [layer]);

  if (!layer) return null;

  const handleSave = () => {
    HapticsService.light();
    onSaveLayer({
      ...layer,
      text: draftText.trim() || 'Text',
      fontFamily,
      fontSize,
      color,
      backgroundColor,
      textAlign,
      animation,
    });
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Text Overlay">
      <ScrollView
        style={styles.scrollArea}
        showsVerticalScrollIndicator={false}
      >
        {/* Text Input */}
        <TextInput
          value={draftText}
          onChangeText={setDraftText}
          placeholder="Enter text..."
          placeholderTextColor={colors.textMuted}
          style={[
            styles.textInput,
            {
              fontFamily,
              color,
              textAlign,
            },
          ]}
          multiline
        />

        {/* Font Family */}
        <Text style={styles.sectionTitle}>Font</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalRow}
        >
          {TEXT_FONTS.map(f => (
            <Pressable
              key={f.id}
              onPress={() => {
                HapticsService.light();
                setFontFamily(f.fontFamily);
              }}
              style={[
                styles.chip,
                fontFamily === f.fontFamily && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  fontFamily === f.fontFamily && styles.chipTextActive,
                ]}
              >
                {f.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Font Size Slider */}
        <CustomSlider
          label="Font Size"
          value={fontSize}
          min={14}
          max={60}
          onValueChange={setFontSize}
          formatValue={v => `${v}px`}
        />

        {/* Color Palette */}
        <Text style={styles.sectionTitle}>Color</Text>
        <View style={styles.colorPalette}>
          {TEXT_COLORS.map(c => (
            <Pressable
              key={c}
              onPress={() => {
                HapticsService.light();
                setColor(c);
              }}
              style={[
                styles.colorCircle,
                { backgroundColor: c },
                color === c && styles.colorCircleSelected,
              ]}
            />
          ))}
        </View>

        {/* Alignment */}
        <Text style={styles.sectionTitle}>Alignment</Text>
        <View style={styles.alignRow}>
          {(['left', 'center', 'right'] as const).map(align => (
            <Pressable
              key={align}
              onPress={() => {
                HapticsService.light();
                setTextAlign(align);
              }}
              style={[
                styles.alignChip,
                textAlign === align && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  textAlign === align && styles.chipTextActive,
                ]}
              >
                {align.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Animation */}
        <Text style={styles.sectionTitle}>Animation</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalRow}
        >
          {TEXT_ANIMATIONS.map(anim => (
            <Pressable
              key={anim.type}
              onPress={() => {
                HapticsService.light();
                setAnimation(anim.type);
              }}
              style={[
                styles.chip,
                animation === anim.type && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  animation === anim.type && styles.chipTextActive,
                ]}
              >
                {anim.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          {onDeleteLayer && (
            <Button
              title="Delete"
              variant="danger"
              size="sm"
              onPress={() => {
                HapticsService.snap();
                onDeleteLayer(layer.id);
                onClose();
              }}
            />
          )}
          <Button
            title="Done"
            variant="primary"
            size="sm"
            onPress={handleSave}
            style={styles.doneButton}
          />
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrollArea: {
    maxHeight: 460,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 18,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 60,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
  },
  horizontalRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  chipText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: colors.primaryLight,
  },
  alignRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  alignChip: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginVertical: spacing.base,
  },
  doneButton: {
    minWidth: 90,
  },
});
