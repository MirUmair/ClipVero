import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ViewStyle,
  Dimensions,
} from 'react-native';
import { colors } from '../../theme/colors';
import { Project, MediaClip, TextLayer } from '../../types/project';
import { calculateCanvasPreviewBounds } from '../canvas/canvasUtils';
import { FILTER_PRESETS } from '../filters/filterPresets';

interface VideoPreviewPlayerProps {
  project: Project;
  activeClip: MediaClip | null;
  currentTime: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSelectTextLayer?: (layer: TextLayer) => void;
  selectedTextLayerId?: string | null;
  style?: ViewStyle;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const VideoPreviewPlayer: React.FC<VideoPreviewPlayerProps> = ({
  project,
  activeClip,
  currentTime,
  onTogglePlay,
  onSelectTextLayer,
  selectedTextLayerId,
  style,
}) => {
  const containerMaxHeight = 360;
  const containerMaxWidth = SCREEN_WIDTH - 24;

  const previewBounds = calculateCanvasPreviewBounds(
    project.aspectRatio,
    containerMaxWidth,
    containerMaxHeight,
    activeClip?.width || 1080,
    activeClip?.height || 1920,
  );

  const activeFilter = FILTER_PRESETS.find(f => f.id === activeClip?.filterId);

  // Active transforms for current clip
  const rotation = activeClip?.rotation || 0;
  const flipH = activeClip?.flipHorizontal ? -1 : 1;
  const flipV = activeClip?.flipVertical ? -1 : 1;

  // Active text layers at currentTime
  const visibleTextLayers = project.textLayers.filter(
    t => currentTime >= t.startTime && currentTime <= t.endTime,
  );

  // Active sticker layers at currentTime
  const visibleStickerLayers = project.stickerLayers.filter(
    s => currentTime >= s.startTime && currentTime <= s.endTime,
  );

  return (
    <View style={[styles.wrapper, style]}>
      <Pressable
        onPress={onTogglePlay}
        style={[
          styles.canvasContainer,
          { width: previewBounds.width, height: previewBounds.height },
        ]}
      >
        {activeClip ? (
          <View
            style={[
              styles.mediaContainer,
              {
                transform: [
                  { rotate: `${rotation}deg` },
                  { scaleX: flipH },
                  { scaleY: flipV },
                ],
              },
            ]}
          >
            {activeClip.thumbnailUri || activeClip.uri ? (
              <Image
                source={{ uri: activeClip.thumbnailUri || activeClip.uri }}
                style={styles.mediaImage}
                resizeMode={
                  project.canvasBackground.type === 'fill' ? 'cover' : 'contain'
                }
              />
            ) : (
              <View style={styles.placeholderMedia}>
                <Text style={styles.placeholderText}>No Media</Text>
              </View>
            )}

            {/* Filter Color Tint Overlay */}
            {activeFilter?.colorOverlay && (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: activeFilter.colorOverlay },
                ]}
                pointerEvents="none"
              />
            )}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Clipvero Editor</Text>
            <Text style={styles.emptySubtitle}>No clips in timeline</Text>
          </View>
        )}

        {/* Text Layers Overlay */}
        {visibleTextLayers.map(layer => {
          const isSelected = selectedTextLayerId === layer.id;
          return (
            <Pressable
              key={layer.id}
              onPress={() => onSelectTextLayer?.(layer)}
              style={[
                styles.textLayerWrapper,
                {
                  left: `${layer.x * 100}%`,
                  top: `${layer.y * 100}%`,
                  transform: [
                    { translateX: -50 },
                    { translateY: -20 },
                    { scale: layer.scale },
                    { rotate: `${layer.rotation}deg` },
                  ],
                },
                isSelected && styles.selectedLayerBox,
              ]}
            >
              <Text
                style={[
                  styles.overlayText,
                  {
                    color: layer.color,
                    fontSize: layer.fontSize,
                    backgroundColor: layer.backgroundColor || 'transparent',
                    opacity: layer.opacity,
                    textAlign: layer.textAlign,
                    fontFamily: layer.fontFamily,
                  },
                ]}
              >
                {layer.text}
              </Text>
            </Pressable>
          );
        })}

        {/* Sticker Layers Overlay */}
        {visibleStickerLayers.map(sticker => (
          <View
            key={sticker.id}
            style={[
              styles.stickerLayerWrapper,
              {
                left: `${sticker.x * 100}%`,
                top: `${sticker.y * 100}%`,
                transform: [
                  { translateX: -20 },
                  { translateY: -20 },
                  { scale: sticker.scale },
                  { rotate: `${sticker.rotation}deg` },
                ],
              },
            ]}
          >
            {sticker.emoji ? (
              <Text style={styles.stickerEmoji}>{sticker.emoji}</Text>
            ) : sticker.uri ? (
              <Image
                source={{ uri: sticker.uri }}
                style={styles.stickerImage}
              />
            ) : null}
          </View>
        ))}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: colors.background,
  },
  canvasContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  mediaContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  placeholderMedia: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  textLayerWrapper: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  selectedLayerBox: {
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    borderStyle: 'dashed',
    borderRadius: 4,
  },
  overlayText: {
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stickerLayerWrapper: {
    position: 'absolute',
  },
  stickerEmoji: {
    fontSize: 36,
  },
  stickerImage: {
    width: 44,
    height: 44,
  },
});
