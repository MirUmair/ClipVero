import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  Dimensions,
} from 'react-native';
import { colors } from '../../theme/colors';
import { Project, MediaClip, TextLayer, AudioTrack } from '../../types/project';
import { ClipItem } from './ClipItem';
import { TimelineRuler } from './TimelineRuler';
import { AppIcon } from '../../components/icons/AppIcons';
import { HapticsService } from '../../services/hapticsService';

interface TimelineViewProps {
  project: Project;
  selectedClipId: string | null;
  currentTime: number;
  totalDuration: number;
  onSelectClip: (clip: MediaClip) => void;
  onSeek: (time: number) => void;
  onTrimClip: (clipId: string, newStart: number, newEnd: number) => void;
  onAddMedia: () => void;
  onSelectTextLayer?: (layer: TextLayer) => void;
  onSelectAudioTrack?: (track: AudioTrack) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PIXELS_PER_SECOND = 40; // 1 second = 40px
const HALF_SCREEN = SCREEN_WIDTH / 2;

export const TimelineView: React.FC<TimelineViewProps> = ({
  project,
  selectedClipId,
  currentTime: _currentTime,
  totalDuration,
  onSelectClip,
  onSeek,
  onTrimClip,
  onAddMedia,
  onSelectTextLayer,
  onSelectAudioTrack,
}) => {
  const scrollRef = useRef<any>(null);
  const isUserScrolling = useRef(false);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!isUserScrolling.current) return;
    const scrollX = event.nativeEvent.contentOffset.x;
    const time = Math.max(0, scrollX / PIXELS_PER_SECOND);
    onSeek(Number(Math.min(totalDuration, time).toFixed(2)));
  };

  const handleScrollBeginDrag = () => {
    isUserScrolling.current = true;
    HapticsService.light();
  };

  const handleScrollEndDrag = () => {
    isUserScrolling.current = false;
  };

  const timelineContentWidth = Math.max(
    SCREEN_WIDTH,
    totalDuration * PIXELS_PER_SECOND,
  );

  return (
    <View style={styles.container}>
      {/* Central Playhead Indicator */}
      <View style={styles.playheadOverlay} pointerEvents="none">
        <View style={styles.playheadHead} />
        <View style={styles.playheadLine} />
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingLeft: HALF_SCREEN,
            paddingRight: HALF_SCREEN,
          },
        ]}
      >
        <View style={{ width: timelineContentWidth }}>
          {/* Ruler */}
          <TimelineRuler
            totalDuration={totalDuration}
            pixelsPerSecond={PIXELS_PER_SECOND}
          />

          {/* Video Clips Track */}
          <View style={styles.trackRow}>
            {project.clips.map(clip => (
              <ClipItem
                key={clip.id}
                clip={clip}
                isSelected={selectedClipId === clip.id}
                pixelsPerSecond={PIXELS_PER_SECOND}
                onSelect={() => onSelectClip(clip)}
                onTrimChange={(start, end) => onTrimClip(clip.id, start, end)}
              />
            ))}

            {/* Add Media Button */}
            <Pressable onPress={onAddMedia} style={styles.addMediaButton}>
              <AppIcon name="plus" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Text Layers Track */}
          {project.textLayers.length > 0 && (
            <View style={styles.textTrack}>
              {project.textLayers.map(layer => {
                const layerLeft = layer.startTime * PIXELS_PER_SECOND;
                const layerWidth = Math.max(
                  28,
                  (layer.endTime - layer.startTime) * PIXELS_PER_SECOND,
                );
                return (
                  <Pressable
                    key={layer.id}
                    onPress={() => onSelectTextLayer?.(layer)}
                    style={[
                      styles.textLayerItem,
                      {
                        left: layerLeft,
                        width: layerWidth,
                      },
                    ]}
                  >
                    <Text style={styles.textLayerTitle} numberOfLines={1}>
                      {layer.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Audio Tracks */}
          {project.audioTracks.length > 0 && (
            <View style={styles.audioTrack}>
              {project.audioTracks.map(track => {
                const trackLeft = track.startTime * PIXELS_PER_SECOND;
                const trackWidth = Math.max(
                  32,
                  track.duration * PIXELS_PER_SECOND,
                );
                return (
                  <Pressable
                    key={track.id}
                    onPress={() => onSelectAudioTrack?.(track)}
                    style={[
                      styles.audioTrackItem,
                      {
                        left: trackLeft,
                        width: trackWidth,
                      },
                    ]}
                  >
                    <AppIcon name="music" size={12} color="#FFFFFF" />
                    <Text style={styles.audioTrackTitle} numberOfLines={1}>
                      {track.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 146,
    backgroundColor: colors.timelineBg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    position: 'relative',
  },
  scrollContent: {
    paddingVertical: 4,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    height: 68,
  },
  addMediaButton: {
    width: 44,
    height: 64,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  textTrack: {
    height: 22,
    marginTop: 4,
    position: 'relative',
  },
  textLayerItem: {
    position: 'absolute',
    height: 20,
    backgroundColor: colors.timelineTextTrack,
    borderRadius: 4,
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  textLayerTitle: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '700',
  },
  audioTrack: {
    height: 22,
    marginTop: 4,
    position: 'relative',
  },
  audioTrackItem: {
    position: 'absolute',
    height: 20,
    backgroundColor: colors.timelineAudioTrack,
    borderRadius: 4,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  audioTrackTitle: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  playheadOverlay: {
    position: 'absolute',
    left: HALF_SCREEN - 1,
    top: 0,
    bottom: 0,
    width: 2,
    zIndex: 99,
    alignItems: 'center',
  },
  playheadHead: {
    width: 10,
    height: 8,
    backgroundColor: colors.timelinePlayhead,
    borderRadius: 2,
  },
  playheadLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.timelinePlayhead,
  },
});
