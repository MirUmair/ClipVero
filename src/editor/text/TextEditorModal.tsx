import React, { useState, useEffect, useCallback } from 'react';
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
import {
  TEXT_FONTS,
  TEXT_COLORS,
  TEXT_ANIMATIONS,
  TEXT_BACKGROUND_COLORS,
} from './textUtils';
import { HapticsService } from '../../services/hapticsService';

export type TextTabType =
  | 'text'
  | 'font'
  | 'size'
  | 'color'
  | 'background'
  | 'animation';

interface TextEditorModalProps {
  visible: boolean;
  onClose: () => void;
  layer: TextLayer | null;
  initialTab?: TextTabType;
  onSaveLayer: (layer: TextLayer) => void;
  onLiveUpdate?: (layer: TextLayer) => void;
  onDeleteLayer?: (layerId: string) => void;
}

const TABS: Array<{ id: TextTabType; label: string }> = [
  { id: 'text', label: 'Text' },
  { id: 'font', label: 'Font' },
  { id: 'size', label: 'Size' },
  { id: 'color', label: 'Color' },
  { id: 'background', label: 'Backdrop' },
  { id: 'animation', label: 'Motion' },
];

export const TextEditorModal: React.FC<TextEditorModalProps> = ({
  visible,
  onClose,
  layer,
  initialTab = 'text',
  onSaveLayer,
  onLiveUpdate,
  onDeleteLayer,
}) => {
  const [activeTab, setActiveTab] = useState<TextTabType>(initialTab);
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
    if (visible) {
      setActiveTab(initialTab || 'text');
    }
  }, [visible, initialTab]);

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

  const emitLiveUpdate = useCallback(
    (overrides: Partial<TextLayer>) => {
      if (!layer) return;
      const updated: TextLayer = {
        ...layer,
        text: draftText,
        fontFamily,
        fontSize,
        color,
        backgroundColor,
        textAlign,
        animation,
        ...overrides,
      };
      if (onLiveUpdate) {
        onLiveUpdate(updated);
      }
    },
    [
      layer,
      draftText,
      fontFamily,
      fontSize,
      color,
      backgroundColor,
      textAlign,
      animation,
      onLiveUpdate,
    ],
  );

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
      {/* Top Tab Bar */}
      <View style={styles.tabBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => {
                  HapticsService.light();
                  setActiveTab(tab.id);
                }}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    isActive && styles.tabButtonTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Tab Content */}
      <View style={styles.tabContentContainer}>
        {activeTab === 'text' && (
          <View>
            <TextInput
              value={draftText}
              onChangeText={val => {
                setDraftText(val);
                emitLiveUpdate({ text: val });
              }}
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
              autoFocus
            />

            <Text style={styles.sectionTitle}>Alignment</Text>
            <View style={styles.alignRow}>
              {(['left', 'center', 'right'] as const).map(align => (
                <Pressable
                  key={align}
                  onPress={() => {
                    HapticsService.light();
                    setTextAlign(align);
                    emitLiveUpdate({ textAlign: align });
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
          </View>
        )}

        {activeTab === 'font' && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.fontListScroll}
          >
            {TEXT_FONTS.map(f => {
              const isSelected = fontFamily === f.fontFamily;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => {
                    HapticsService.light();
                    setFontFamily(f.fontFamily);
                    emitLiveUpdate({ fontFamily: f.fontFamily });
                  }}
                  style={[
                    styles.fontCard,
                    isSelected && styles.fontCardSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.fontCardName,
                      isSelected && styles.fontCardNameSelected,
                    ]}
                  >
                    {f.name}
                  </Text>
                  <Text
                    style={[
                      styles.fontCardPreview,
                      { fontFamily: f.fontFamily },
                      isSelected && styles.fontCardPreviewSelected,
                    ]}
                  >
                    Aa Bb Gg 123
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {activeTab === 'size' && (
          <View style={styles.sliderContainer}>
            <CustomSlider
              label="Font Size"
              value={fontSize}
              min={12}
              max={64}
              onValueChange={size => {
                setFontSize(size);
                emitLiveUpdate({ fontSize: size });
              }}
              formatValue={v => `${v}px`}
            />

            <View style={styles.previewBox}>
              <Text
                style={[
                  styles.previewText,
                  {
                    fontSize,
                    fontFamily,
                    color,
                    textAlign,
                  },
                ]}
                numberOfLines={2}
              >
                {draftText || 'Preview Text'}
              </Text>
            </View>
          </View>
        )}

        {activeTab === 'color' && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.colorPaletteGrid}
          >
            {TEXT_COLORS.map(c => {
              const isSelected = color === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => {
                    HapticsService.light();
                    setColor(c);
                    emitLiveUpdate({ color: c });
                  }}
                  style={[
                    styles.colorCircleWrapper,
                    isSelected && styles.colorCircleWrapperSelected,
                  ]}
                >
                  <View style={[styles.colorCircle, { backgroundColor: c }]} />
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {activeTab === 'background' && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.bgOptionsList}
          >
            {TEXT_BACKGROUND_COLORS.map(bg => {
              const isSelected = backgroundColor === bg.value;
              return (
                <Pressable
                  key={bg.id}
                  onPress={() => {
                    HapticsService.light();
                    setBackgroundColor(bg.value);
                    emitLiveUpdate({ backgroundColor: bg.value });
                  }}
                  style={[styles.bgCard, isSelected && styles.bgCardSelected]}
                >
                  <View
                    style={[
                      styles.bgSwatch,
                      { backgroundColor: bg.value || 'transparent' },
                    ]}
                  />
                  <Text
                    style={[styles.bgName, isSelected && styles.bgNameSelected]}
                  >
                    {bg.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {activeTab === 'animation' && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.animGrid}
          >
            {TEXT_ANIMATIONS.map(anim => {
              const isSelected = animation === anim.type;
              return (
                <Pressable
                  key={anim.type}
                  onPress={() => {
                    HapticsService.light();
                    setAnimation(anim.type);
                    emitLiveUpdate({ animation: anim.type });
                  }}
                  style={[
                    styles.animCard,
                    isSelected && styles.animCardSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.animLabel,
                      isSelected && styles.animLabelSelected,
                    ]}
                  >
                    {anim.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

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
    </Modal>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    padding: 3,
  },
  tabBarContent: {
    flexDirection: 'row',
    gap: 4,
  },
  tabButton: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabButtonText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 12,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  tabContentContainer: {
    minHeight: 180,
    maxHeight: 260,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 18,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 65,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
  },
  alignRow: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  fontListScroll: {
    flex: 1,
  },
  fontCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  fontCardSelected: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.surfaceElevated,
  },
  fontCardName: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontSize: 14,
  },
  fontCardNameSelected: {
    color: colors.text,
    fontWeight: '700',
  },
  fontCardPreview: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  fontCardPreviewSelected: {
    color: colors.primaryLight,
  },
  sliderContainer: {
    paddingVertical: spacing.sm,
  },
  previewBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 70,
  },
  previewText: {
    maxWidth: '90%',
  },
  colorPaletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  colorCircleWrapper: {
    padding: 3,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleWrapperSelected: {
    borderColor: colors.primaryLight,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  bgOptionsList: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  bgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bgCardSelected: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.surfaceElevated,
  },
  bgSwatch: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: spacing.md,
  },
  bgName: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  bgNameSelected: {
    color: colors.text,
    fontWeight: '700',
  },
  animGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  animCard: {
    width: '48%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  animCardSelected: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.surfaceElevated,
  },
  animLabel: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontSize: 13,
  },
  animLabelSelected: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  doneButton: {
    minWidth: 90,
  },
});
