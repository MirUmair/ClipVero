import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AdService, AdPlacement } from '../../services/adService';
import { AppIcon } from '../icons/AppIcons';

interface AdBannerViewProps {
  placement: AdPlacement;
  style?: StyleProp<ViewStyle>;
  onDismiss?: () => void;
}

export const AdBannerView: React.FC<AdBannerViewProps> = ({
  placement,
  style,
  onDismiss,
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !AdService.shouldShowAd(placement)) {
    return null;
  }

  const adUnitId = AdService.getAdUnitId(placement);
  const truncatedUnit = adUnitId.substring(0, 24) + '...';

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Ad</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            Test AdMob Banner
          </Text>
          <Text style={styles.unitId} numberOfLines={1}>
            Unit: {truncatedUnit}
          </Text>
        </View>

        <Pressable
          onPress={handleDismiss}
          hitSlop={8}
          style={styles.closeBtn}
          accessibilityLabel="Dismiss ad"
        >
          <AppIcon name="close" size={12} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.base,
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  badgeText: {
    ...typography.captionBold,
    fontSize: 10,
    color: colors.primaryLight,
  },
  info: {
    flex: 1,
  },
  title: {
    ...typography.captionBold,
    fontSize: 12,
    color: colors.text,
  },
  unitId: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    padding: spacing.xs,
  },
});
