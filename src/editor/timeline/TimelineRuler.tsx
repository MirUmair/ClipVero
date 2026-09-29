import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { formatDuration } from '../../utils/timeUtils';

interface TimelineRulerProps {
  totalDuration: number;
  pixelsPerSecond: number;
}

export const TimelineRuler: React.FC<TimelineRulerProps> = ({
  totalDuration,
  pixelsPerSecond,
}) => {
  const stepSeconds = totalDuration > 60 ? 5 : totalDuration > 20 ? 2 : 1;
  const numSteps = Math.ceil(totalDuration / stepSeconds);
  const steps = Array.from({ length: numSteps + 1 }, (_, i) => i * stepSeconds);

  return (
    <View
      style={[
        styles.container,
        { width: Math.max(300, totalDuration * pixelsPerSecond) },
      ]}
    >
      {steps.map(sec => (
        <View
          key={sec}
          style={[styles.tickMark, { left: sec * pixelsPerSecond }]}
        >
          <View style={styles.tickLine} />
          <Text style={styles.tickText}>{formatDuration(sec)}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 22,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tickMark: {
    position: 'absolute',
    top: 0,
    alignItems: 'flex-start',
  },
  tickLine: {
    width: 1,
    height: 6,
    backgroundColor: colors.textSecondary,
  },
  tickText: {
    fontSize: 9,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
    marginLeft: 2,
  },
});
