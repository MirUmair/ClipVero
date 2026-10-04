import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  PanResponder,
} from 'react-native';
import { colors } from '../../theme/colors';
import { MediaClip } from '../../types/project';
import { ThumbnailCache } from '../../media/thumbnailCache';
import { formatDuration } from '../../utils/timeUtils';
import { HapticsService } from '../../services/hapticsService';

interface ClipItemProps {
  clip: MediaClip;
  isSelected: boolean;
  pixelsPerSecond: number;
  onSelect: () => void;
  onTrimChange: (newStart: number, newEnd: number) => void;
}

export const ClipItem: React.FC<ClipItemProps> = ({
  clip,
  isSelected,
  pixelsPerSecond,
  onSelect,
  onTrimChange,
}) => {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const clipWidth = Math.max(36, clip.duration * pixelsPerSecond);

  const trimStartRef = useRef(clip.trimStart);
  const trimEndRef = useRef(clip.trimEnd);
  trimStartRef.current = clip.trimStart;
  trimEndRef.current = clip.trimEnd;
  const configRef = useRef({ clip, pixelsPerSecond, onTrimChange });
  configRef.current = { clip, pixelsPerSecond, onTrimChange };
  const dragBoundsRef = useRef({ start: clip.trimStart, end: clip.trimEnd });

  const numThumbs = Math.max(4, Math.min(10, Math.ceil(clipWidth / 48)));

  useEffect(() => {
    let isMounted = true;
    ThumbnailCache.getTimelineThumbnails(clip.id, clip.uri, numThumbs).then(
      thumbs => {
        if (isMounted) setThumbnails(thumbs);
      },
    );
    return () => {
      isMounted = false;
    };
  }, [clip.id, clip.uri, numThumbs]);

  // Start Trim Handle PanResponder
  const startPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragBoundsRef.current = { start: trimStartRef.current, end: trimEndRef.current };
        HapticsService.light();
      },
      onPanResponderMove: (_, gestureState) => {
        const config = configRef.current;
        const bounds = dragBoundsRef.current;
        const deltaSeconds = gestureState.dx * config.clip.speed / config.pixelsPerSecond;
        const newStart = Math.max(
          0,
          Math.min(
            bounds.end - 0.2,
            bounds.start + deltaSeconds,
          ),
        );
        config.onTrimChange(Number(newStart.toFixed(2)), bounds.end);
      },
      onPanResponderRelease: () => {
        HapticsService.snap();
      },
    }),
  ).current;

  // End Trim Handle PanResponder
  const endPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragBoundsRef.current = { start: trimStartRef.current, end: trimEndRef.current };
        HapticsService.light();
      },
      onPanResponderMove: (_, gestureState) => {
        const config = configRef.current;
        const bounds = dragBoundsRef.current;
        const deltaSeconds = gestureState.dx * config.clip.speed / config.pixelsPerSecond;
        const newEnd = Math.min(
          config.clip.originalDuration,
          Math.max(
            bounds.start + 0.2,
            bounds.end + deltaSeconds,
          ),
        );
        config.onTrimChange(bounds.start, Number(newEnd.toFixed(2)));
      },
      onPanResponderRelease: () => {
        HapticsService.snap();
      },
    }),
  ).current;

  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.container,
        { width: clipWidth },
        isSelected && styles.selectedContainer,
      ]}
    >
      {/* Filmstrip thumbnails */}
      <View style={styles.thumbnailStrip}>
        {thumbnails.length > 0 ? (
          thumbnails.map((thumbUri, idx) => (
            <Image
              key={`${clip.id}_${idx}`}
              source={{ uri: thumbUri }}
              style={styles.thumbnailImage}
              resizeMode="cover"
            />
          ))
        ) : (
          <View style={styles.fallbackTrack}>
            <Text style={styles.clipName} numberOfLines={1}>
              {clip.name}
            </Text>
          </View>
        )}
      </View>

      {/* Duration badge */}
      <View style={styles.durationBadge}>
        <Text style={styles.durationText}>{formatDuration(clip.duration)}</Text>
      </View>

      {/* Interactive Trim Handles */}
      {isSelected && (
        <>
          <View
            style={[styles.handle, styles.startHandle]}
            {...startPanResponder.panHandlers}
          >
            <View style={styles.handleBar} />
          </View>

          <View
            style={[styles.handle, styles.endHandle]}
            {...endPanResponder.panHandlers}
          >
            <View style={styles.handleBar} />
          </View>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surfaceHighlight,
    marginRight: 4,
    position: 'relative',
    borderWidth: 1.5,
    borderColor: colors.transparent,
  },
  selectedContainer: {
    borderColor: colors.primaryLight,
  },
  thumbnailStrip: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
    overflow: 'hidden',
  },
  thumbnailImage: {
    flex: 1,
    height: '100%',
  },
  fallbackTrack: {
    flex: 1,
    backgroundColor: colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  clipName: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  durationText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  handle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  startHandle: {
    left: 0,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  endHandle: {
    right: 0,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  handleBar: {
    width: 3,
    height: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 1.5,
  },
});
