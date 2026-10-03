import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppIcon, IconName } from '../../components/icons/AppIcons';
import { HapticsService } from '../../services/hapticsService';

export type MainCategory =
  | 'edit'
  | 'audio'
  | 'pip'
  | 'text'
  | 'filters'
  | 'adjust'
  | 'ratio'
  | 'stickers'
  | 'more';

export type EditSubAction =
  | 'split'
  | 'trim'
  | 'transition'
  | 'speed'
  | 'crop'
  | 'rotate'
  | 'flip'
  | 'freeze'
  | 'reverse'
  | 'duplicate'
  | 'delete'
  | 'volume';

export type AudioSubAction =
  | 'music'
  | 'voiceover'
  | 'sfx'
  | 'extractAudio'
  | 'originalVolume'
  | 'fadeIn'
  | 'fadeOut';

export type TextSubAction =
  | 'addText'
  | 'font'
  | 'size'
  | 'color'
  | 'background'
  | 'alignment'
  | 'animation';

interface EditorBottomToolbarProps {
  activeCategory: MainCategory | null;
  onSelectCategory: (category: MainCategory) => void;
  onCloseCategory: () => void;
  onEditAction: (action: EditSubAction) => void;
  onAudioAction: (action: AudioSubAction) => void;
  onTextAction: (action: TextSubAction) => void;
  onFiltersPress: () => void;
  onAdjustPress: () => void;
  onRatioPress: () => void;
  onStickersPress: () => void;
  onPipPress?: () => void;
  onTransitionPress?: () => void;
  hasSelectedClip: boolean;
}

const MAIN_CATEGORIES: Array<{
  id: MainCategory;
  label: string;
  icon: IconName;
}> = [
  { id: 'edit', label: 'Edit', icon: 'scissors' },
  { id: 'audio', label: 'Audio', icon: 'music' },
  { id: 'pip', label: 'PIP', icon: 'pip' },
  { id: 'text', label: 'Text', icon: 'text' },
  { id: 'filters', label: 'Filters', icon: 'filter' },
  { id: 'adjust', label: 'Adjust', icon: 'adjust' },
  { id: 'ratio', label: 'Ratio', icon: 'ratio' },
  { id: 'stickers', label: 'Stickers', icon: 'sparkles' },
];

const EDIT_ACTIONS: Array<{
  id: EditSubAction;
  label: string;
  icon: IconName;
  danger?: boolean;
}> = [
  { id: 'trim', label: 'Trim', icon: 'scissors' },
  { id: 'split', label: 'Split', icon: 'scissors' },
  { id: 'transition', label: 'Transition', icon: 'layers' },
  { id: 'speed', label: 'Speed', icon: 'speed' },
  { id: 'volume', label: 'Volume', icon: 'volume' },
  { id: 'crop', label: 'Crop', icon: 'crop' },
  { id: 'freeze', label: 'Freeze', icon: 'pause' },
  { id: 'reverse', label: 'Reverse', icon: 'reverse' },
  { id: 'rotate', label: 'Rotate', icon: 'rotate' },
  { id: 'flip', label: 'Flip', icon: 'flip' },
  { id: 'duplicate', label: 'Duplicate', icon: 'copy' },
  { id: 'delete', label: 'Delete', icon: 'trash', danger: true },
];

const AUDIO_ACTIONS: Array<{
  id: AudioSubAction;
  label: string;
  icon: IconName;
}> = [
  { id: 'music', label: 'Add Music', icon: 'music' },
  { id: 'voiceover', label: 'Voiceover', icon: 'mic' },
  { id: 'sfx', label: 'Sound FX', icon: 'sparkles' },
  { id: 'extractAudio', label: 'Extract', icon: 'layers' },
  { id: 'originalVolume', label: 'Original Vol', icon: 'volume' },
  { id: 'fadeIn', label: 'Fade In', icon: 'adjust' },
  { id: 'fadeOut', label: 'Fade Out', icon: 'adjust' },
];

const TEXT_ACTIONS: Array<{
  id: TextSubAction;
  label: string;
  icon: IconName;
}> = [
  { id: 'addText', label: '+ Add Text', icon: 'plus' },
  { id: 'font', label: 'Font', icon: 'text' },
  { id: 'size', label: 'Size', icon: 'adjust' },
  { id: 'color', label: 'Color', icon: 'sparkles' },
  { id: 'background', label: 'Background', icon: 'ratio' },
  { id: 'animation', label: 'Animation', icon: 'sparkles' },
];

export const EditorBottomToolbar: React.FC<EditorBottomToolbarProps> = ({
  activeCategory,
  onSelectCategory,
  onCloseCategory,
  onEditAction,
  onAudioAction,
  onTextAction,
  onFiltersPress,
  onAdjustPress,
  onRatioPress,
  onStickersPress,
  onPipPress,
  hasSelectedClip: _hasSelectedClip,
}) => {
  const handleCategoryPress = (category: MainCategory) => {
    HapticsService.light();
    if (category === 'pip') {
      if (onPipPress) onPipPress();
      return;
    }
    if (category === 'filters') {
      onFiltersPress();
      return;
    }
    if (category === 'adjust') {
      onAdjustPress();
      return;
    }
    if (category === 'ratio') {
      onRatioPress();
      return;
    }
    if (category === 'stickers') {
      onStickersPress();
      return;
    }
    onSelectCategory(category);
  };

  const renderSubActions = () => {
    if (activeCategory === 'edit') {
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.subScroll}
        >
          <Pressable onPress={onCloseCategory} style={styles.closeSubItem}>
            <AppIcon name="back" size={16} color={colors.textSecondary} />
          </Pressable>
          {EDIT_ACTIONS.map(item => (
            <Pressable
              key={item.id}
              onPress={() => {
                HapticsService.light();
                onEditAction(item.id);
              }}
              style={styles.subItem}
            >
              <AppIcon
                name={item.icon}
                size={20}
                color={item.danger ? colors.error : colors.text}
              />
              <Text
                style={[
                  styles.subItemText,
                  item.danger && { color: colors.error },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      );
    }

    if (activeCategory === 'audio') {
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.subScroll}
        >
          <Pressable onPress={onCloseCategory} style={styles.closeSubItem}>
            <AppIcon name="back" size={16} color={colors.textSecondary} />
          </Pressable>
          {AUDIO_ACTIONS.map(item => (
            <Pressable
              key={item.id}
              onPress={() => {
                HapticsService.light();
                onAudioAction(item.id);
              }}
              style={styles.subItem}
            >
              <AppIcon name={item.icon} size={20} color={colors.text} />
              <Text style={styles.subItemText}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      );
    }

    if (activeCategory === 'text') {
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.subScroll}
        >
          <Pressable onPress={onCloseCategory} style={styles.closeSubItem}>
            <AppIcon name="back" size={16} color={colors.textSecondary} />
          </Pressable>
          {TEXT_ACTIONS.map(item => (
            <Pressable
              key={item.id}
              onPress={() => {
                HapticsService.light();
                onTextAction(item.id);
              }}
              style={styles.subItem}
            >
              <AppIcon name={item.icon} size={20} color={colors.text} />
              <Text style={styles.subItemText}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {activeCategory ? (
        renderSubActions()
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.mainScroll}
        >
          {MAIN_CATEGORIES.map(cat => (
            <Pressable
              key={cat.id}
              onPress={() => handleCategoryPress(cat.id)}
              style={styles.mainItem}
            >
              <View style={styles.iconCircle}>
                <AppIcon name={cat.icon} size={20} color={colors.text} />
              </View>
              <Text style={styles.mainItemText}>{cat.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 72,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  mainScroll: {
    paddingHorizontal: spacing.sm,
  },
  mainItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    minWidth: 64,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mainItemText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  subScroll: {
    paddingHorizontal: spacing.sm,
  },
  closeSubItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 8,
    marginVertical: 12,
    marginRight: 6,
  },
  subItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    minWidth: 60,
  },
  subItemText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
