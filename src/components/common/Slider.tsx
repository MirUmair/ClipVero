import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  LayoutChangeEvent,
  ViewStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { HapticsService } from '../../services/hapticsService';
import { clamp } from '../../utils/mathUtils';

interface CustomSliderProps {
  label?: string;
  value: number; // Current value
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number) => void;
  formatValue?: (value: number) => string;
  style?: ViewStyle;
  activeColor?: string;
}

export const CustomSlider: React.FC<CustomSliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  onValueChange,
  formatValue,
  style,
  activeColor = colors.primary,
}) => {
  const [trackWidth, setTrackWidth] = useState(200);
  const trackRef = useRef<any>(null);
  const currentValRef = useRef(value);
  currentValRef.current = value;

  const normalized = (value - min) / (max - min);
  const progressPercent = Math.max(0, Math.min(1, normalized));

  const calculateValueFromX = (x: number) => {
    const ratio = clamp(x / trackWidth, 0, 1);
    const rawVal = min + ratio * (max - min);
    const steppedVal = Math.round(rawVal / step) * step;
    return clamp(steppedVal, min, max);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: evt => {
        HapticsService.light();
        const touchX = evt.nativeEvent.locationX;
        const newVal = calculateValueFromX(touchX);
        onValueChange(newVal);
      },
      onPanResponderMove: (_, gestureState) => {
        const startX =
          ((currentValRef.current - min) / (max - min)) * trackWidth;
        const currentX = startX + gestureState.dx;
        const newVal = calculateValueFromX(currentX);
        if (newVal !== currentValRef.current) {
          HapticsService.light();
          onValueChange(newVal);
        }
      },
    }),
  ).current;

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0) {
      setTrackWidth(width);
    }
  };

  const displayString = formatValue ? formatValue(value) : value.toString();

  return (
    <View style={[styles.container, style]}>
      {label && (
        <View style={styles.headerRow}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.valueText}>{displayString}</Text>
        </View>
      )}

      <View
        ref={trackRef}
        onLayout={handleLayout}
        style={styles.trackContainer}
        {...panResponder.panHandlers}
      >
        <View style={styles.trackBackground}>
          <View
            style={[
              styles.trackFill,
              {
                width: `${progressPercent * 100}%`,
                backgroundColor: activeColor,
              },
            ]}
          />
        </View>
        <View
          style={[
            styles.thumb,
            {
              left: Math.max(
                0,
                Math.min(trackWidth - 20, progressPercent * trackWidth - 10),
              ),
              borderColor: activeColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  valueText: {
    ...typography.mono,
    fontSize: 12,
    color: colors.text,
  },
  trackContainer: {
    height: 36,
    justifyContent: 'center',
  },
  trackBackground: {
    height: 6,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.round,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: borderRadius.round,
  },
  thumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.text,
    borderWidth: 2,
    top: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
});
