/**
 * Clipvero App Icons
 * High performance, zero-dependency icon renderer using vector shapes and styled elements
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
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
  | 'folder';

interface AppIconProps {
  name: IconName;
  size?: number;
  color?: string;
}

// Icon glyph mapping using clean, universally rendered typography and geometric symbols
const ICON_GLYPHS: Record<IconName, string> = {
  plus: '+',
  play: '▶',
  pause: '❚❚',
  scissors: '✂',
  crop: '⛶',
  speed: '⚡',
  rotate: '↻',
  flip: '⇄',
  music: '♫',
  text: 'T',
  filter: '✦',
  adjust: '⚙',
  ratio: '⬚',
  layers: '≡',
  trash: '✕',
  copy: '❐',
  volume: '🔊',
  mute: '🔇',
  back: '‹',
  close: '✕',
  check: '✓',
  export: '↗',
  share: '⤤',
  dots: '⋮',
  merge: '⧉',
  compress: '⤓',
  sparkles: '✨',
  undo: '↶',
  redo: '↷',
  fullscreen: '⛶',
  folder: '📁',
};

export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = 20,
  color = colors.text,
}) => {
  const glyph = ICON_GLYPHS[name] || '•';

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Text
        style={[
          styles.glyph,
          {
            fontSize: size * 0.85,
            color,
            lineHeight: size,
          },
        ]}
        numberOfLines={1}
      >
        {glyph}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glyph: {
    textAlign: 'center',
    fontWeight: '600',
    includeFontPadding: false,
  },
});
