import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Modal } from '../../components/common/Modal';
import { HapticsService } from '../../services/hapticsService';

interface StickersModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
}

const BUILT_IN_EMOJIS = [
  '🔥',
  '✨',
  '⚡',
  '🎬',
  '🚀',
  '💯',
  '❤️',
  '👏',
  '🎉',
  '⭐',
  '💥',
  '👀',
  '😎',
  '🤩',
  '🎯',
  '💡',
  '🔥',
  '📸',
  '🎵',
  '🏆',
  '💎',
  '🌈',
  '🍕',
  '☕',
];

export const StickersModal: React.FC<StickersModalProps> = ({
  visible,
  onClose,
  onSelectEmoji,
}) => {
  return (
    <Modal visible={visible} onClose={onClose} title="Stickers & Overlays">
      <View style={styles.container}>
        <Text style={styles.hint}>Tap an element to add to timeline</Text>
        <ScrollView contentContainerStyle={styles.grid}>
          {BUILT_IN_EMOJIS.map((emoji, idx) => (
            <Pressable
              key={`${emoji}_${idx}`}
              onPress={() => {
                HapticsService.light();
                onSelectEmoji(emoji);
                onClose();
              }}
              style={styles.emojiCard}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingBottom: spacing.base,
  },
  emojiCard: {
    width: 54,
    height: 54,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 28,
  },
});
