import React, { useRef } from 'react';
import {
  Text,
  StyleSheet,
  Animated,
  Pressable,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { HapticsService } from '../../services/hapticsService';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled || loading) return;
    HapticsService.light();
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  const getContainerStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: colors.primary };
      case 'accent':
        return { backgroundColor: colors.accent };
      case 'secondary':
        return {
          backgroundColor: colors.surfaceElevated,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'danger':
        return { backgroundColor: colors.error };
      case 'ghost':
        return { backgroundColor: 'transparent' };
    }
  };

  const getTextColor = (): string => {
    if (disabled) return colors.textDisabled;
    switch (variant) {
      case 'ghost':
        return colors.textSecondary;
      case 'secondary':
        return colors.text;
      case 'accent':
        return '#0B0D13'; // Dark text on cyan accent
      default:
        return colors.text;
    }
  };

  const getSizeStyle = (): { container: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'sm':
        return {
          container: {
            paddingVertical: spacing.xs + 2,
            paddingHorizontal: spacing.md,
            borderRadius: borderRadius.sm,
          },
          text: { fontSize: 13 },
        };
      case 'lg':
        return {
          container: {
            paddingVertical: spacing.base,
            paddingHorizontal: spacing.xl,
            borderRadius: borderRadius.lg,
          },
          text: { fontSize: 16 },
        };
      default:
        return {
          container: {
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            borderRadius: borderRadius.md,
          },
          text: { fontSize: 14 },
        };
    }
  };

  const { container: sizeContainerStyle, text: sizeTextStyle } = getSizeStyle();

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.baseButton,
          getContainerStyle(),
          sizeContainerStyle,
          disabled && styles.disabledButton,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={getTextColor()} />
        ) : (
          <View style={styles.contentRow}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <Text
              style={[
                typography.button,
                sizeTextStyle,
                { color: getTextColor() },
                textStyle,
              ]}
            >
              {title}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
