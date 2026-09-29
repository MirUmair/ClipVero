import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { IconButton } from './IconButton';
import { Button } from './Button';
import { AppIcon } from '../icons/AppIcons';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  onTitlePress?: () => void;
  rightAction?: React.ReactNode;
  exportAction?: {
    onPress: () => void;
    label?: string;
    loading?: boolean;
  };
  style?: ViewStyle;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBack,
  onTitlePress,
  rightAction,
  exportAction,
  style,
}) => {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.leftContainer}>
        {onBack && (
          <IconButton
            name="back"
            size={38}
            iconSize={22}
            onPress={onBack}
            style={styles.backButton}
          />
        )}
      </View>

      <View style={styles.titleContainer}>
        {title && (
          <Pressable onPress={onTitlePress} disabled={!onTitlePress}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </Pressable>
        )}
      </View>

      <View style={styles.rightContainer}>
        {exportAction ? (
          <Button
            title={exportAction.label || 'Export'}
            onPress={exportAction.onPress}
            size="sm"
            variant="primary"
            loading={exportAction.loading}
            icon={<AppIcon name="export" size={14} color={colors.text} />}
          />
        ) : (
          rightAction || null
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  leftContainer: {
    width: 60,
    alignItems: 'flex-start',
  },
  backButton: {
    marginLeft: -spacing.xs,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h3,
    fontSize: 16,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  rightContainer: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
});
