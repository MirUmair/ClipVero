import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  style?: ViewStyle;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showTagline = true,
  style,
}) => {
  const iconDimensions =
    size === 'sm' ? { width: 28, height: 28 } : size === 'lg' ? { width: 56, height: 56 } : { width: 38, height: 38 };

  const titleFontSize = size === 'sm' ? 18 : size === 'lg' ? 32 : 24;
  const taglineFontSize = size === 'sm' ? 8 : size === 'lg' ? 11 : 9;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.headerRow}>
        <Image
          source={require('../../assets/logo.png')}
          style={[styles.logoIcon, iconDimensions]}
          resizeMode="contain"
        />
        <View style={styles.textColumn}>
          <Text style={[styles.brandTitle, { fontSize: titleFontSize }]}>
            Clip<Text style={styles.brandTitleAccent}>Vero</Text>
          </Text>
          {showTagline && (
            <Text style={[styles.brandTagline, { fontSize: taglineFontSize }]}>
              CREATE · EDIT · SHARE
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    borderRadius: 8,
    marginRight: spacing.sm,
  },
  textColumn: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  brandTitleAccent: {
    color: colors.primaryLight,
  },
  brandTagline: {
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 2,
    marginTop: 1,
  },
});
