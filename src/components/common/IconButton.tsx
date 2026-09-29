import React, { useRef } from 'react';
import { StyleSheet, Animated, Pressable, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { AppIcon, IconName } from '../icons/AppIcons';
import { HapticsService } from '../../services/hapticsService';

interface IconButtonProps {
  name: IconName;
  onPress: () => void;
  size?: number;
  iconSize?: number;
  color?: string;
  backgroundColor?: string;
  active?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export const IconButton: React.FC<IconButtonProps> = ({
  name,
  onPress,
  size = 40,
  iconSize = 20,
  color,
  backgroundColor = colors.transparent,
  active = false,
  disabled = false,
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    HapticsService.light();
    Animated.spring(scaleAnim, {
      toValue: 0.9,
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

  const resolvedColor = color || (active ? colors.primaryLight : colors.text);
  const resolvedBg = active ? colors.surfaceHighlight : backgroundColor;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: resolvedBg,
          },
          disabled && styles.disabled,
        ]}
      >
        <AppIcon name={name} size={iconSize} color={resolvedColor} />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
});
