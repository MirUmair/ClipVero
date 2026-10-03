import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ViewStyle,
  Dimensions,
  ActivityIndicator,
  LayoutChangeEvent,
} from 'react-native';
import { colors } from '../../theme/colors';
import { Project, MediaClip, TextLayer } from '../../types/project';
import { calculateCanvasPreviewBounds } from '../canvas/canvasUtils';
import { FILTER_PRESETS } from '../filters/filterPresets';
import { findClipAtTimelineTime } from '../../utils/timeUtils';
import { ThumbnailCache } from '../../media/thumbnailCache';
import { MediaEngine } from '../../media/mediaEngine';
import { NativeVideoView } from '../../components/common/NativeVideoView';

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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const VideoPreviewPlayer: React.FC<VideoPreviewPlayerProps> = ({
  project,
  activeClip,
  currentTime,
  isPlaying = false,
  onTogglePlay,
  onSelectTextLayer,
  selectedTextLayerId,
  style,
}) => {
  const [measuredSize, setMeasuredSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setMeasuredSize(prev => {
        if (
          prev &&
          Math.abs(prev.width - width) < 1 &&
          Math.abs(prev.height - height) < 1
        ) {
          return prev;
        }
        return { width, height };
      });
    }
  };

  // Generous, screen-aware fallback if layout has not yet fired
  const fallbackMaxWidth = Math.max(300, SCREEN_WIDTH - 20);
  const fallbackMaxHeight = Math.max(
    380,
    Math.min(
      Math.round(SCREEN_HEIGHT - 330),
      Math.round(SCREEN_HEIGHT * 0.52),
    ),
  );

  const containerMaxWidth = measuredSize
    ? Math.max(100, Math.floor(measuredSize.width - 16))
    : fallbackMaxWidth;
  const containerMaxHeight = measuredSize
    ? Math.max(100, Math.floor(measuredSize.height - 16))
    : fallbackMaxHeight;

  const safeClips = project?.clips || [];
  const safeTextLayers = project?.textLayers || [];
  const safeStickerLayers = project?.stickerLayers || [];

  const previewBounds = calculateCanvasPreviewBounds(
    project?.aspectRatio || '9:16',
    containerMaxWidth,
    containerMaxHeight,
    activeClip?.width || 1080,
    activeClip?.height || 1920,
  );

  const activeClipInfo = findClipAtTimelineTime(safeClips, currentTime);
  const currentClip =
    activeClipInfo?.clip || activeClip || safeClips[0] || null;

  const activeFilter = FILTER_PRESETS.find(f => f.id === currentClip?.filterId);

  // Active transforms for currentClip
  const rotation = currentClip?.rotation || 0;
  const flipH = currentClip?.flipHorizontal ? -1 : 1;
  const flipV = currentClip?.flipVertical ? -1 : 1;

  const isVideoUri = (uri?: string | null): boolean => {
    if (!uri) return false;
    const clean = uri.split('?')[0].toLowerCase();
    return (
      clean.endsWith('.mp4') ||
      clean.endsWith('.mov') ||
      clean.endsWith('.m4v') ||
      clean.endsWith('.mkv') ||
      clean.endsWith('.webm') ||
      clean.endsWith('.3gp')
    );
  };

  const isCurrentVideo =
    currentClip?.type === 'video' || isVideoUri(currentClip?.uri);

  // Retrieve cached timeline frames to dynamically animate preview across playback and scrub
  const clipId = currentClip?.id;
  const clipUri = currentClip?.uri;
  const [extractedThumb, setExtractedThumb] = useState<string | null>(null);
  const [frameCache, setFrameCache] = useState<{
    clipId: string;
    uri: string;
    frames: string[];
  } | null>(null);
  const cachedFrames =
    frameCache?.clipId === clipId && frameCache?.uri === clipUri
      ? frameCache?.frames
      : null;

  useEffect(() => {
    if (!clipId || !clipUri) return;
    let cancelled = false;

    // 1. Immediately extract high-res poster if thumbnailUri is missing or video
    if (!currentClip?.thumbnailUri || isVideoUri(currentClip?.thumbnailUri)) {
      MediaEngine.generateThumbnail(clipUri, 0, 480, 640)
        .then(thumb => {
          if (!cancelled && thumb && !isVideoUri(thumb)) {
            setExtractedThumb(thumb);
          }
        })
        .catch(() => {});
    }

    // 2. Fetch 24-frame timeline thumbnail sequence for smooth live playback & scrubbing
    ThumbnailCache.getTimelineThumbnails(clipId, clipUri, 24)
      .then(frames => {
        if (!cancelled && frames && frames.length > 0) {
          setFrameCache({ clipId, uri: clipUri, frames });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [clipId, clipUri, currentClip?.thumbnailUri]);

  // Determine active displayed frame
  let activeFrameUri: string | null = null;

  if (cachedFrames && cachedFrames.length > 0 && activeClipInfo) {
    const span = Math.max(0.1, activeClipInfo.clip.originalDuration);
    let progress = Math.min(1, Math.max(0, activeClipInfo.localTime / span));
    if (currentClip?.isReversed) {
      progress = 1 - progress;
    }
    const frameIndex = Math.min(
      cachedFrames.length - 1,
      Math.round(progress * (cachedFrames.length - 1)),
    );
    const candidate = cachedFrames[frameIndex];
    if (candidate && !isVideoUri(candidate)) {
      activeFrameUri = candidate;
    }
  }

  // Fallback to static clip thumbnail or extracted poster
  if (!activeFrameUri) {
    if (currentClip?.thumbnailUri && !isVideoUri(currentClip.thumbnailUri)) {
      activeFrameUri = currentClip.thumbnailUri;
    } else if (extractedThumb && !isVideoUri(extractedThumb)) {
      activeFrameUri = extractedThumb;
    } else if (currentClip?.uri && !isVideoUri(currentClip.uri)) {
      activeFrameUri = currentClip.uri;
    }
  }

  // Active text layers at currentTime
  const visibleTextLayers = safeTextLayers.filter(
    t => currentTime >= t.startTime && currentTime <= t.endTime,
  );

  // Active sticker layers at currentTime
  const visibleStickerLayers = safeStickerLayers.filter(
    s => currentTime >= s.startTime && currentTime <= s.endTime,
  );

  // Active PIP overlay layers at currentTime
  const visiblePipLayers = (project?.pipLayers || []).filter(
    p => currentTime >= p.startTime && currentTime <= p.endTime,
  );

  return (
    <View style={[styles.wrapper, style]} onLayout={handleLayout}>
      <Pressable
        onPress={onTogglePlay}
        style={[
          styles.canvasContainer,
          {
            width: Math.round(previewBounds.width),
            height: Math.round(previewBounds.height),
          },
        ]}
      >
        {/* Blur Canvas Background */}
        {project?.canvasBackground?.type === 'blur' && activeFrameUri && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Image
              source={{ uri: activeFrameUri }}
              style={[StyleSheet.absoluteFill, { opacity: 0.65 }]}
              resizeMode="cover"
              blurRadius={20}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: 'rgba(0,0,0,0.35)' },
              ]}
            />
          </View>
        )}
        {currentClip ? (
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
            {isCurrentVideo && currentClip?.uri && !currentClip?.isReversed ? (
              <NativeVideoView
                key={currentClip.id}
                videoUri={currentClip.uri}
                isPlaying={isPlaying}
                currentTimeMs={Math.max(
                  0,
                  Math.round((activeClipInfo?.localTime ?? 0) * 1000),
                )}
                speed={currentClip.speed || 1.0}
                volume={currentClip.volume ?? 1.0}
                isMuted={currentClip.isMuted ?? false}
                resizeMode={
                  project?.canvasBackground?.type === 'fill'
                    ? 'cover'
                    : 'contain'
                }
                style={styles.mediaImage}
              />
            ) : activeFrameUri ? (
              <Image
                key={currentClip?.id}
                source={{ uri: activeFrameUri }}
                style={styles.mediaImage}
                resizeMode={
                  project?.canvasBackground?.type === 'fill'
                    ? 'cover'
                    : 'contain'
                }
              />
            ) : (
              <View style={styles.placeholderMedia}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.placeholderText, { marginTop: 8 }]}>
                  Loading Preview...
                </Text>
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

            {/* Reverse Playback Indicator Badge */}
            {currentClip?.isReversed && (
              <View style={styles.reverseBadge} pointerEvents="none">
                <Text style={styles.reverseBadgeText}>◀ REVERSED</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>ClipVero Editor</Text>
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

        {/* Picture-in-Picture (PIP) Overlays */}
        {visiblePipLayers.map(pip => {
          const pipW = previewBounds.width * (pip.scale || 0.35);
          const pipH = previewBounds.height * (pip.scale || 0.35);
          return (
            <View
              key={pip.id}
              style={[
                styles.pipOverlayWrapper,
                {
                  left: `${pip.x * 100}%`,
                  top: `${pip.y * 100}%`,
                  width: pipW,
                  height: pipH,
                  opacity: pip.opacity ?? 1.0,
                  transform: [
                    { translateX: -pipW / 2 },
                    { translateY: -pipH / 2 },
                    { rotate: `${pip.rotation || 0}deg` },
                  ],
                },
              ]}
              pointerEvents="none"
            >
              <Image
                source={{ uri: pip.uri }}
                style={styles.pipImage}
                resizeMode="cover"
              />
              <View style={styles.pipTag}>
                <Text style={styles.pipTagText}>PIP</Text>
              </View>
            </View>
          );
        })}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
  reverseBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  reverseBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  pipOverlayWrapper: {
    position: 'absolute',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: '#000000',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  pipImage: {
    width: '100%',
    height: '100%',
  },
  pipTag: {
    position: 'absolute',
    top: 3,
    left: 3,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  pipTagText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
