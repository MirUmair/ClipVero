/**
 * Clipvero Production Vector Icon System
 * Ultra-crisp, resolution-independent vector icons rendered via native views.
 * 100% theme-aware, zero-font dependency, zero missing glyphs across Android OEM skins.
 */

import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

export type IconName =
  | 'plus'
  | 'play'
  | 'pause'
  | 'scissors'
  | 'crop'
  | 'speed'
  | 'rotate'
  | 'flip'
  | 'music'
  | 'text'
  | 'filter'
  | 'adjust'
  | 'ratio'
  | 'layers'
  | 'trash'
  | 'copy'
  | 'volume'
  | 'mute'
  | 'back'
  | 'close'
  | 'check'
  | 'export'
  | 'share'
  | 'dots'
  | 'merge'
  | 'compress'
  | 'sparkles'
  | 'undo'
  | 'redo'
  | 'fullscreen'
  | 'folder'
  | 'mic'
  | 'chevronRight';

interface AppIconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = 20,
  color = colors.text,
  style,
}) => {
  const renderVectorGlyph = () => {
    switch (name) {
      case 'play':
        return (
          <View
            style={{
              width: 0,
              height: 0,
              borderTopWidth: size * 0.3,
              borderBottomWidth: size * 0.3,
              borderLeftWidth: size * 0.52,
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: color,
              marginLeft: size * 0.1,
            }}
          />
        );

      case 'pause':
        return (
          <View
            style={{
              flexDirection: 'row',
              gap: size * 0.18,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: Math.max(2, size * 0.18),
                height: size * 0.6,
                backgroundColor: color,
                borderRadius: size * 0.06,
              }}
            />
            <View
              style={{
                width: Math.max(2, size * 0.18),
                height: size * 0.6,
                backgroundColor: color,
                borderRadius: size * 0.06,
              }}
            />
          </View>
        );

      case 'plus':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                position: 'absolute',
                width: size * 0.65,
                height: Math.max(2, size * 0.1),
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: Math.max(2, size * 0.1),
                height: size * 0.65,
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
          </View>
        );

      case 'close':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                position: 'absolute',
                width: size * 0.65,
                height: Math.max(2, size * 0.09),
                backgroundColor: color,
                borderRadius: 1,
                transform: [{ rotate: '45deg' }],
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: size * 0.65,
                height: Math.max(2, size * 0.09),
                backgroundColor: color,
                borderRadius: 1,
                transform: [{ rotate: '-45deg' }],
              }}
            />
          </View>
        );

      case 'check':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.52,
                height: size * 0.26,
                borderBottomWidth: Math.max(2, size * 0.11),
                borderLeftWidth: Math.max(2, size * 0.11),
                borderColor: color,
                transform: [{ rotate: '-45deg' }, { translateY: -size * 0.06 }],
              }}
            />
          </View>
        );

      case 'back':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.38,
                height: size * 0.38,
                borderTopWidth: Math.max(2, size * 0.11),
                borderLeftWidth: Math.max(2, size * 0.11),
                borderColor: color,
                transform: [{ rotate: '-45deg' }, { translateX: size * 0.08 }],
              }}
            />
          </View>
        );

      case 'chevronRight':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.38,
                height: size * 0.38,
                borderTopWidth: Math.max(2, size * 0.11),
                borderRightWidth: Math.max(2, size * 0.11),
                borderColor: color,
                transform: [{ rotate: '45deg' }, { translateX: -size * 0.08 }],
              }}
            />
          </View>
        );

      case 'scissors':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                position: 'absolute',
                top: size * 0.12,
                width: size * 0.6,
                height: Math.max(1.5, size * 0.08),
                backgroundColor: color,
                borderRadius: 1,
                transform: [{ rotate: '36deg' }],
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: size * 0.12,
                width: size * 0.6,
                height: Math.max(1.5, size * 0.08),
                backgroundColor: color,
                borderRadius: 1,
                transform: [{ rotate: '-36deg' }],
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: size * 0.12,
                left: size * 0.12,
                width: size * 0.28,
                height: size * 0.28,
                borderRadius: size * 0.14,
                borderWidth: Math.max(1.5, size * 0.08),
                borderColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: size * 0.12,
                right: size * 0.12,
                width: size * 0.28,
                height: size * 0.28,
                borderRadius: size * 0.14,
                borderWidth: Math.max(1.5, size * 0.08),
                borderColor: color,
              }}
            />
          </View>
        );

      case 'crop':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                position: 'absolute',
                top: size * 0.18,
                left: size * 0.18,
                width: size * 0.46,
                height: size * 0.46,
                borderTopWidth: Math.max(2, size * 0.09),
                borderLeftWidth: Math.max(2, size * 0.09),
                borderColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: size * 0.18,
                right: size * 0.18,
                width: size * 0.46,
                height: size * 0.46,
                borderBottomWidth: Math.max(2, size * 0.09),
                borderRightWidth: Math.max(2, size * 0.09),
                borderColor: color,
              }}
            />
          </View>
        );

      case 'speed':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                position: 'absolute',
                top: size * 0.12,
                left: size * 0.32,
                width: 0,
                height: 0,
                borderTopWidth: size * 0.38,
                borderRightWidth: size * 0.26,
                borderTopColor: 'transparent',
                borderRightColor: color,
                transform: [{ rotate: '12deg' }],
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: size * 0.12,
                right: size * 0.32,
                width: 0,
                height: 0,
                borderBottomWidth: size * 0.38,
                borderLeftWidth: size * 0.26,
                borderBottomColor: 'transparent',
                borderLeftColor: color,
                transform: [{ rotate: '12deg' }],
              }}
            />
          </View>
        );

      case 'rotate':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.62,
                height: size * 0.62,
                borderRadius: size * 0.31,
                borderWidth: Math.max(2, size * 0.09),
                borderColor: color,
                borderBottomColor: 'transparent',
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: size * 0.14,
                right: size * 0.15,
                width: 0,
                height: 0,
                borderLeftWidth: size * 0.13,
                borderRightWidth: size * 0.13,
                borderTopWidth: size * 0.18,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderTopColor: color,
                transform: [{ rotate: '-35deg' }],
              }}
            />
          </View>
        );

      case 'flip':
        return (
          <View
            style={[
              styles.center,
              {
                width: size,
                height: size,
                flexDirection: 'row',
                gap: size * 0.1,
              },
            ]}
          >
            <View
              style={{
                width: 0,
                height: 0,
                borderTopWidth: size * 0.18,
                borderBottomWidth: size * 0.18,
                borderRightWidth: size * 0.24,
                borderTopColor: 'transparent',
                borderBottomColor: 'transparent',
                borderRightColor: color,
              }}
            />
            <View
              style={{
                width: Math.max(1.5, size * 0.08),
                height: size * 0.6,
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
            <View
              style={{
                width: 0,
                height: 0,
                borderTopWidth: size * 0.18,
                borderBottomWidth: size * 0.18,
                borderLeftWidth: size * 0.24,
                borderTopColor: 'transparent',
                borderBottomColor: 'transparent',
                borderLeftColor: color,
              }}
            />
          </View>
        );

      case 'music':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.58,
                height: size * 0.65,
                position: 'relative',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: Math.max(2, size * 0.14),
                  backgroundColor: color,
                  borderRadius: 1,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: Math.max(1.5, size * 0.08),
                  height: size * 0.54,
                  backgroundColor: color,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: Math.max(1.5, size * 0.08),
                  height: size * 0.54,
                  backgroundColor: color,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: -size * 0.06,
                  width: size * 0.24,
                  height: size * 0.18,
                  borderRadius: size * 0.09,
                  backgroundColor: color,
                  transform: [{ rotate: '-20deg' }],
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: -size * 0.06,
                  width: size * 0.24,
                  height: size * 0.18,
                  borderRadius: size * 0.09,
                  backgroundColor: color,
                  transform: [{ rotate: '-20deg' }],
                }}
              />
            </View>
          </View>
        );

      case 'text':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.68,
                height: Math.max(2, size * 0.11),
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
            <View
              style={{
                width: Math.max(2, size * 0.11),
                height: size * 0.52,
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
          </View>
        );

      case 'filter':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.42,
                height: size * 0.42,
                backgroundColor: color,
                borderRadius: 2,
                transform: [{ rotate: '45deg' }],
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: Math.max(1.5, size * 0.1),
                height: size * 0.78,
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: size * 0.78,
                height: Math.max(1.5, size * 0.1),
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
          </View>
        );

      case 'adjust':
        return (
          <View
            style={[
              styles.center,
              {
                width: size,
                height: size,
                paddingHorizontal: size * 0.15,
                gap: size * 0.14,
              },
            ]}
          >
            <View
              style={{
                height: Math.max(1.5, size * 0.08),
                backgroundColor: color,
                position: 'relative',
                borderRadius: 1,
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  left: size * 0.12,
                  top: -size * 0.08,
                  width: size * 0.22,
                  height: size * 0.22,
                  borderRadius: size * 0.11,
                  backgroundColor: color,
                }}
              />
            </View>
            <View
              style={{
                height: Math.max(1.5, size * 0.08),
                backgroundColor: color,
                position: 'relative',
                borderRadius: 1,
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  right: size * 0.12,
                  top: -size * 0.08,
                  width: size * 0.22,
                  height: size * 0.22,
                  borderRadius: size * 0.11,
                  backgroundColor: color,
                }}
              />
            </View>
            <View
              style={{
                height: Math.max(1.5, size * 0.08),
                backgroundColor: color,
                position: 'relative',
                borderRadius: 1,
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  left: size * 0.32,
                  top: -size * 0.08,
                  width: size * 0.22,
                  height: size * 0.22,
                  borderRadius: size * 0.11,
                  backgroundColor: color,
                }}
              />
            </View>
          </View>
        );

      case 'ratio':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.65,
                height: size * 0.65,
                borderWidth: Math.max(1.5, size * 0.09),
                borderColor: color,
                borderRadius: 4,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: size * 0.32,
                  height: size * 0.32,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: color,
                  borderRadius: 2,
                }}
              />
            </View>
          </View>
        );

      case 'layers':
        return (
          <View
            style={[
              styles.center,
              { width: size, height: size, gap: size * 0.1 },
            ]}
          >
            <View
              style={{
                width: size * 0.68,
                height: Math.max(2, size * 0.09),
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
            <View
              style={{
                width: size * 0.52,
                height: Math.max(2, size * 0.09),
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
            <View
              style={{
                width: size * 0.68,
                height: Math.max(2, size * 0.09),
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
          </View>
        );

      case 'trash':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.3,
                height: Math.max(1.5, size * 0.07),
                backgroundColor: color,
                marginBottom: 1,
              }}
            />
            <View
              style={{
                width: size * 0.65,
                height: Math.max(1.5, size * 0.07),
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
            <View
              style={{
                width: size * 0.48,
                height: size * 0.45,
                borderLeftWidth: Math.max(1.5, size * 0.08),
                borderRightWidth: Math.max(1.5, size * 0.08),
                borderBottomWidth: Math.max(1.5, size * 0.08),
                borderColor: color,
                borderBottomLeftRadius: 3,
                borderBottomRightRadius: 3,
                marginTop: 1,
                flexDirection: 'row',
                justifyContent: 'space-evenly',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 1.5,
                  height: size * 0.24,
                  backgroundColor: color,
                }}
              />
              <View
                style={{
                  width: 1.5,
                  height: size * 0.24,
                  backgroundColor: color,
                }}
              />
            </View>
          </View>
        );

      case 'copy':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                position: 'absolute',
                top: size * 0.16,
                right: size * 0.16,
                width: size * 0.48,
                height: size * 0.48,
                borderWidth: Math.max(1.5, size * 0.08),
                borderColor: color,
                borderRadius: 3,
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: size * 0.16,
                left: size * 0.16,
                width: size * 0.48,
                height: size * 0.48,
                backgroundColor: color,
                borderRadius: 3,
              }}
            />
          </View>
        );

      case 'volume':
        return (
          <View
            style={[
              styles.center,
              { width: size, height: size, flexDirection: 'row' },
            ]}
          >
            <View
              style={{
                width: size * 0.14,
                height: size * 0.28,
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
            <View
              style={{
                width: 0,
                height: 0,
                borderTopWidth: size * 0.22,
                borderBottomWidth: size * 0.22,
                borderRightWidth: size * 0.24,
                borderTopColor: 'transparent',
                borderBottomColor: 'transparent',
                borderRightColor: color,
              }}
            />
            <View
              style={{
                width: size * 0.18,
                height: size * 0.42,
                borderRightWidth: Math.max(1.5, size * 0.08),
                borderColor: color,
                borderTopRightRadius: size * 0.2,
                borderBottomRightRadius: size * 0.2,
                marginLeft: 2,
              }}
            />
          </View>
        );

      case 'mute':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: size * 0.14,
                  height: size * 0.28,
                  backgroundColor: color,
                  borderRadius: 1,
                }}
              />
              <View
                style={{
                  width: 0,
                  height: 0,
                  borderTopWidth: size * 0.22,
                  borderBottomWidth: size * 0.22,
                  borderRightWidth: size * 0.24,
                  borderTopColor: 'transparent',
                  borderBottomColor: 'transparent',
                  borderRightColor: color,
                }}
              />
            </View>
            <View
              style={{
                position: 'absolute',
                width: size * 0.65,
                height: Math.max(1.5, size * 0.08),
                backgroundColor: colors.error,
                transform: [{ rotate: '45deg' }],
              }}
            />
          </View>
        );

      case 'export':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                position: 'absolute',
                bottom: size * 0.15,
                width: size * 0.6,
                height: size * 0.35,
                borderLeftWidth: Math.max(1.5, size * 0.08),
                borderRightWidth: Math.max(1.5, size * 0.08),
                borderBottomWidth: Math.max(1.5, size * 0.08),
                borderColor: color,
                borderRadius: 2,
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: size * 0.12,
                width: Math.max(1.5, size * 0.08),
                height: size * 0.45,
                backgroundColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: size * 0.1,
                width: size * 0.24,
                height: size * 0.24,
                borderTopWidth: Math.max(1.5, size * 0.08),
                borderRightWidth: Math.max(1.5, size * 0.08),
                borderColor: color,
                transform: [{ rotate: '-45deg' }],
              }}
            />
          </View>
        );

      case 'share':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                position: 'absolute',
                left: size * 0.15,
                top: size * 0.4,
                width: size * 0.2,
                height: size * 0.2,
                borderRadius: size * 0.1,
                backgroundColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                right: size * 0.15,
                top: size * 0.18,
                width: size * 0.2,
                height: size * 0.2,
                borderRadius: size * 0.1,
                backgroundColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                right: size * 0.15,
                bottom: size * 0.18,
                width: size * 0.2,
                height: size * 0.2,
                borderRadius: size * 0.1,
                backgroundColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: size * 0.34,
                left: size * 0.26,
                width: size * 0.44,
                height: Math.max(1.5, size * 0.07),
                backgroundColor: color,
                transform: [{ rotate: '-28deg' }],
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: size * 0.34,
                left: size * 0.26,
                width: size * 0.44,
                height: Math.max(1.5, size * 0.07),
                backgroundColor: color,
                transform: [{ rotate: '28deg' }],
              }}
            />
          </View>
        );

      case 'dots':
        return (
          <View
            style={[
              styles.center,
              {
                width: size,
                height: size,
                justifyContent: 'space-evenly',
                paddingVertical: size * 0.18,
              },
            ]}
          >
            <View
              style={{
                width: Math.max(2.5, size * 0.14),
                height: Math.max(2.5, size * 0.14),
                borderRadius: size * 0.07,
                backgroundColor: color,
              }}
            />
            <View
              style={{
                width: Math.max(2.5, size * 0.14),
                height: Math.max(2.5, size * 0.14),
                borderRadius: size * 0.07,
                backgroundColor: color,
              }}
            />
            <View
              style={{
                width: Math.max(2.5, size * 0.14),
                height: Math.max(2.5, size * 0.14),
                borderRadius: size * 0.07,
                backgroundColor: color,
              }}
            />
          </View>
        );

      case 'merge':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                position: 'absolute',
                left: size * 0.16,
                top: size * 0.24,
                width: size * 0.35,
                height: Math.max(1.5, size * 0.08),
                backgroundColor: color,
                transform: [{ rotate: '28deg' }],
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: size * 0.16,
                bottom: size * 0.24,
                width: size * 0.35,
                height: Math.max(1.5, size * 0.08),
                backgroundColor: color,
                transform: [{ rotate: '-28deg' }],
              }}
            />
            <View
              style={{
                position: 'absolute',
                right: size * 0.16,
                width: size * 0.45,
                height: Math.max(1.5, size * 0.08),
                backgroundColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                right: size * 0.14,
                width: size * 0.2,
                height: size * 0.2,
                borderTopWidth: Math.max(1.5, size * 0.08),
                borderRightWidth: Math.max(1.5, size * 0.08),
                borderColor: color,
                transform: [{ rotate: '45deg' }],
              }}
            />
          </View>
        );

      case 'compress':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                position: 'absolute',
                top: size * 0.12,
                width: Math.max(1.5, size * 0.08),
                height: size * 0.26,
                backgroundColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: size * 0.26,
                width: size * 0.18,
                height: size * 0.18,
                borderBottomWidth: Math.max(1.5, size * 0.08),
                borderRightWidth: Math.max(1.5, size * 0.08),
                borderColor: color,
                transform: [{ rotate: '45deg' }],
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: size * 0.12,
                width: Math.max(1.5, size * 0.08),
                height: size * 0.26,
                backgroundColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: size * 0.26,
                width: size * 0.18,
                height: size * 0.18,
                borderTopWidth: Math.max(1.5, size * 0.08),
                borderRightWidth: Math.max(1.5, size * 0.08),
                borderColor: color,
                transform: [{ rotate: '-45deg' }],
              }}
            />
            <View
              style={{
                width: size * 0.58,
                height: Math.max(1.5, size * 0.08),
                backgroundColor: color,
              }}
            />
          </View>
        );

      case 'sparkles':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                position: 'absolute',
                top: size * 0.14,
                left: size * 0.18,
                width: size * 0.44,
                height: size * 0.44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: size * 0.22,
                  height: size * 0.22,
                  backgroundColor: color,
                  borderRadius: 2,
                  transform: [{ rotate: '45deg' }],
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  width: Math.max(1.5, size * 0.08),
                  height: size * 0.44,
                  backgroundColor: color,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  width: size * 0.44,
                  height: Math.max(1.5, size * 0.08),
                  backgroundColor: color,
                }}
              />
            </View>
            <View
              style={{
                position: 'absolute',
                bottom: size * 0.16,
                right: size * 0.16,
                width: size * 0.26,
                height: size * 0.26,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: size * 0.14,
                  height: size * 0.14,
                  backgroundColor: color,
                  borderRadius: 1,
                  transform: [{ rotate: '45deg' }],
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  width: 1.5,
                  height: size * 0.26,
                  backgroundColor: color,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  width: size * 0.26,
                  height: 1.5,
                  backgroundColor: color,
                }}
              />
            </View>
          </View>
        );

      case 'undo':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.52,
                height: size * 0.38,
                borderTopWidth: Math.max(1.5, size * 0.09),
                borderLeftWidth: Math.max(1.5, size * 0.09),
                borderColor: color,
                borderTopLeftRadius: size * 0.32,
                position: 'absolute',
                top: size * 0.26,
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: size * 0.26,
                left: size * 0.14,
                width: 0,
                height: 0,
                borderTopWidth: size * 0.12,
                borderBottomWidth: size * 0.12,
                borderRightWidth: size * 0.18,
                borderTopColor: 'transparent',
                borderBottomColor: 'transparent',
                borderRightColor: color,
              }}
            />
          </View>
        );

      case 'redo':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                width: size * 0.52,
                height: size * 0.38,
                borderTopWidth: Math.max(1.5, size * 0.09),
                borderRightWidth: Math.max(1.5, size * 0.09),
                borderColor: color,
                borderTopRightRadius: size * 0.32,
                position: 'absolute',
                top: size * 0.26,
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: size * 0.26,
                right: size * 0.14,
                width: 0,
                height: 0,
                borderTopWidth: size * 0.12,
                borderBottomWidth: size * 0.12,
                borderLeftWidth: size * 0.18,
                borderTopColor: 'transparent',
                borderBottomColor: 'transparent',
                borderLeftColor: color,
              }}
            />
          </View>
        );

      case 'fullscreen':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                position: 'absolute',
                top: size * 0.16,
                left: size * 0.16,
                width: size * 0.24,
                height: size * 0.24,
                borderTopWidth: Math.max(1.5, size * 0.08),
                borderLeftWidth: Math.max(1.5, size * 0.08),
                borderColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: size * 0.16,
                right: size * 0.16,
                width: size * 0.24,
                height: size * 0.24,
                borderTopWidth: Math.max(1.5, size * 0.08),
                borderRightWidth: Math.max(1.5, size * 0.08),
                borderColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: size * 0.16,
                left: size * 0.16,
                width: size * 0.24,
                height: size * 0.24,
                borderBottomWidth: Math.max(1.5, size * 0.08),
                borderLeftWidth: Math.max(1.5, size * 0.08),
                borderColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: size * 0.16,
                right: size * 0.16,
                width: size * 0.24,
                height: size * 0.24,
                borderBottomWidth: Math.max(1.5, size * 0.08),
                borderRightWidth: Math.max(1.5, size * 0.08),
                borderColor: color,
              }}
            />
          </View>
        );

      case 'folder':
        return (
          <View style={[styles.center, { width: size, height: size }]}>
            <View
              style={{
                position: 'absolute',
                top: size * 0.22,
                left: size * 0.16,
                width: size * 0.28,
                height: size * 0.14,
                backgroundColor: color,
                borderTopLeftRadius: 2,
                borderTopRightRadius: 2,
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: size * 0.32,
                left: size * 0.16,
                width: size * 0.68,
                height: size * 0.42,
                backgroundColor: color,
                borderRadius: 2,
              }}
            />
          </View>
        );

      case 'mic':
        return (
          <View
            style={{
              width: size,
              height: size,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: size * 0.36,
                height: size * 0.48,
                borderRadius: size * 0.18,
                backgroundColor: color,
                marginTop: -size * 0.12,
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: size * 0.18,
                width: size * 0.54,
                height: size * 0.38,
                borderBottomLeftRadius: size * 0.27,
                borderBottomRightRadius: size * 0.27,
                borderWidth: Math.max(1.5, size * 0.08),
                borderTopWidth: 0,
                borderColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: size * 0.14,
                width: Math.max(1.5, size * 0.08),
                height: size * 0.18,
                backgroundColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: size * 0.1,
                width: size * 0.4,
                height: Math.max(1.5, size * 0.08),
                borderRadius: 1,
                backgroundColor: color,
              }}
            />
          </View>
        );

      default:
        return (
          <View
            style={{
              width: size * 0.3,
              height: size * 0.3,
              borderRadius: size * 0.15,
              backgroundColor: color,
            }}
          />
        );
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {renderVectorGlyph()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
