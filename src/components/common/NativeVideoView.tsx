import React from 'react';
import { requireNativeComponent, ViewStyle } from 'react-native';

export interface NativeVideoViewProps {
  videoUri: string | null;
  isPlaying: boolean;
  currentTimeMs: number;
  speed?: number;
  volume?: number;
  isMuted?: boolean;
  resizeMode?: 'contain' | 'cover';
  style?: ViewStyle | ViewStyle[];
}

const RCTClipveroVideoView =
  requireNativeComponent<NativeVideoViewProps>('ClipveroVideoView');

export const NativeVideoView: React.FC<NativeVideoViewProps> = props => {
  return <RCTClipveroVideoView {...props} />;
};
