import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import { AppIcon, IconName } from '../icons/AppIcons';
import { ThemedAlert, AlertOptions, AlertButton, AlertType } from '../../services/alertService';
import { HapticsService } from '../../services/hapticsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ThemedAlertModal: React.FC = () => {
  const [alert, setAlert] = useState<AlertOptions | null>(null);
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = ThemedAlert.subscribe(newAlert => {
      if (newAlert) {
        setAlert(newAlert);
        HapticsService.light();
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 7,
            tension: 70,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0.9,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 120,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setAlert(null);
        });
      }
    });

    return unsubscribe;
  }, [scaleAnim, opacityAnim]);

  if (!alert) return null;

  const type: AlertType = alert.type || 'info';

  const getTypeConfig = (): {
    iconName: IconName;
    accentColor: string;
    bgColor: string;
  } => {
    switch (type) {
      case 'success':
        return {
          iconName: 'check',
          accentColor: '#10B981',
          bgColor: 'rgba(16, 185, 129, 0.15)',
        };
      case 'error':
        return {
          iconName: 'trash',
          accentColor: '#EF4444',
          bgColor: 'rgba(239, 68, 68, 0.15)',
        };
      case 'warning':
        return {
          iconName: 'sparkles',
          accentColor: '#F59E0B',
          bgColor: 'rgba(245, 158, 11, 0.15)',
        };
      case 'confirm':
        return {
          iconName: 'scissors',
          accentColor: colors.primary,
          bgColor: 'rgba(139, 92, 246, 0.15)',
        };
      case 'info':
      default:
        return {
          iconName: 'sparkles',
          accentColor: colors.accent,
          bgColor: 'rgba(0, 210, 255, 0.15)',
        };
    }
  };

  const typeConfig = getTypeConfig();
  const icon = alert.icon || typeConfig.iconName;
  const buttons: AlertButton[] =
    alert.buttons && alert.buttons.length > 0
      ? alert.buttons
      : [{ text: 'OK', style: 'default' }];

  const handleButtonPress = (btn: AlertButton) => {
    if (btn.style === 'destructive') {
      HapticsService.medium();
    } else {
      HapticsService.light();
    }
    ThemedAlert.hide();
    btn.onPress?.();
  };

  const handleBackdropPress = () => {
    if (alert.cancelable !== false) {
      HapticsService.light();
      ThemedAlert.hide();
    }
  };

  return (
    <Modal
      transparent
      visible={!!alert}
      animationType="none"
      onRequestClose={handleBackdropPress}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleBackdropPress} />

        <Animated.View
          style={[
            styles.card,
            {
              borderColor: typeConfig.accentColor + '55',
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Top Badge Icon */}
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: typeConfig.bgColor,
                borderColor: typeConfig.accentColor,
              },
            ]}
          >
            <AppIcon name={icon} size={24} color={typeConfig.accentColor} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{alert.title}</Text>

          {/* Message */}
          {!!alert.message && (
            <Text style={styles.message}>{alert.message}</Text>
          )}

          {/* Action Buttons */}
          <View
            style={[
              styles.buttonRow,
              buttons.length > 2 && styles.buttonColumn,
            ]}
          >
            {buttons.map((btn, index) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';

              let buttonBg = colors.primary;
              let textColor = '#FFFFFF';
              let borderColor = 'transparent';

              if (isDestructive) {
                buttonBg = '#EF4444';
              } else if (isCancel) {
                buttonBg = '#161F36';
                textColor = '#94A3B8';
                borderColor = '#2A3756';
              } else if (type === 'success') {
                buttonBg = '#10B981';
              } else if (type === 'info') {
                buttonBg = colors.primary;
              }

              return (
                <Pressable
                  key={index}
                  onPress={() => handleButtonPress(btn)}
                  style={({ pressed }) => [
                    styles.button,
                    {
                      backgroundColor: buttonBg,
                      borderColor,
                      borderWidth: isCancel ? 1 : 0,
                      opacity: pressed ? 0.85 : 1,
                    },
                    buttons.length === 2 && styles.buttonHalf,
                    buttons.length > 2 && styles.buttonFull,
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      { color: textColor },
                      isCancel && styles.buttonTextCancel,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 15, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: Math.min(SCREEN_WIDTH - 48, 360),
    backgroundColor: '#0F1526',
    borderRadius: borderRadius.xl,
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: 4,
  },
  buttonColumn: {
    flexDirection: 'column',
  },
  button: {
    flex: 1,
    height: 46,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  buttonHalf: {
    flex: 1,
  },
  buttonFull: {
    width: '100%',
    marginBottom: 8,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  buttonTextCancel: {
    fontWeight: '600',
  },
});
