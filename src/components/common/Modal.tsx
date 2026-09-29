import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal as RNModal,
  Animated,
  Pressable,
  ViewStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { IconButton } from './IconButton';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  type?: 'bottomSheet' | 'center';
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  style,
  type = 'bottomSheet',
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 20,
        stiffness: 180,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  if (!visible) return null;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [type === 'bottomSheet' ? 400 : 80, 0],
  });

  const opacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={[
          styles.backdropContainer,
          type === 'center' && styles.centerContainer,
        ]}
      >
        <Animated.View style={[styles.backdrop, { opacity }]}>
          <Pressable style={styles.backdropPressable} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            type === 'bottomSheet' ? styles.sheetContent : styles.centerContent,
            { transform: [{ translateY }], opacity },
            style,
          ]}
        >
          {type === 'bottomSheet' && <View style={styles.sheetHandle} />}

          <View style={styles.headerRow}>
            {title ? <Text style={styles.title}>{title}</Text> : <View />}
            <IconButton
              name="close"
              size={32}
              iconSize={16}
              onPress={onClose}
            />
          </View>

          <View style={styles.body}>{children}</View>
        </Animated.View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  backdropContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  backdropPressable: {
    flex: 1,
  },
  sheetContent: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxl,
    borderTopWidth: 1,
    borderColor: colors.borderLight,
    maxHeight: '85%',
  },
  centerContent: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.xl,
    padding: spacing.base,
    width: '92%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  body: {
    marginTop: spacing.xs,
  },
});
