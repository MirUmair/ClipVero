import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { IconButton } from '../../components/common/IconButton';
import { formatDuration } from '../../utils/timeUtils';

interface PreviewControlsProps {
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  onTogglePlay: () => void;
  onSeekBackward?: () => void;
  onSeekForward?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onToggleFullscreen?: () => void;
}

export const PreviewControls: React.FC<PreviewControlsProps> = ({
  isPlaying,
  currentTime,
  totalDuration,
  onTogglePlay,
  onSeekBackward,
  onSeekForward,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onToggleFullscreen,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.historyGroup}>
        {onUndo && (
          <IconButton
            name="undo"
            size={34}
            iconSize={16}
            onPress={onUndo}
            disabled={!canUndo}
            color={canUndo ? colors.text : colors.textDisabled}
          />
        )}
        {onRedo && (
          <IconButton
            name="redo"
            size={34}
            iconSize={16}
            onPress={onRedo}
            disabled={!canRedo}
            color={canRedo ? colors.text : colors.textDisabled}
          />
        )}
      </View>

      <View style={styles.centerPlayGroup}>
        {onSeekBackward && (
          <IconButton
            name="undo"
            size={32}
            iconSize={14}
            onPress={onSeekBackward}
            color={colors.textSecondary}
          />
        )}

        <IconButton
          name={isPlaying ? 'pause' : 'play'}
          size={42}
          iconSize={20}
          onPress={onTogglePlay}
          backgroundColor={colors.surfaceElevated}
          color={colors.primaryLight}
          style={styles.playButton}
        />

        {onSeekForward && (
          <IconButton
            name="redo"
            size={32}
            iconSize={14}
            onPress={onSeekForward}
            color={colors.textSecondary}
          />
        )}

        <View style={styles.timeBadge}>
          <Text style={styles.timeCurrent}>{formatDuration(currentTime)}</Text>
          <Text style={styles.timeDivider}> / </Text>
          <Text style={styles.timeTotal}>{formatDuration(totalDuration)}</Text>
        </View>
      </View>

      <View style={styles.extraGroup}>
        {onToggleFullscreen && (
          <IconButton
            name="fullscreen"
            size={34}
            iconSize={16}
            onPress={onToggleFullscreen}
            color={colors.textSecondary}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  historyGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 72,
  },
  centerPlayGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    marginHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeCurrent: {
    ...typography.mono,
    fontSize: 12,
    color: colors.text,
  },
  timeDivider: {
    ...typography.mono,
    fontSize: 12,
    color: colors.textSecondary,
  },
  timeTotal: {
    ...typography.mono,
    fontSize: 12,
    color: colors.textSecondary,
  },
  extraGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 72,
  },
});
