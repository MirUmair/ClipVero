import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  PanResponder,
  Pressable,
} from 'react-native';
import { StickerLayer } from '../../types/project';
import { colors } from '../../theme/colors';
import { HapticsService } from '../../services/hapticsService';
import { AppIcon } from '../../components/icons/AppIcons';

interface DraggableStickerProps {
  sticker: StickerLayer;
  isSelected: boolean;
  previewWidth: number;
  previewHeight: number;
  onSelect: () => void;
  onUpdate: (sticker: StickerLayer) => void;
  onDelete: () => void;
}

export const DraggableSticker: React.FC<DraggableStickerProps> = ({
  sticker,
  isSelected,
  previewWidth,
  previewHeight,
  onSelect,
  onUpdate,
  onDelete,
}) => {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: sticker.x, y: sticker.y });
  const configRef = useRef({ sticker, previewWidth, previewHeight, onSelect, onUpdate });
  configRef.current = { sticker, previewWidth, previewHeight, onSelect, onUpdate };

  useEffect(() => {
    dragStartRef.current = { x: sticker.x, y: sticker.y };
  }, [sticker.x, sticker.y]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: () => {
        setIsDragging(true);
        HapticsService.light();
        const config = configRef.current;
        config.onSelect();
        dragStartRef.current = { x: config.sticker.x, y: config.sticker.y };
        setDragOffset({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        const { previewWidth, previewHeight } = configRef.current;
        if (previewWidth > 0 && previewHeight > 0) {
          const deltaX = gestureState.dx / previewWidth;
          const deltaY = gestureState.dy / previewHeight;
          setDragOffset({ x: deltaX, y: deltaY });
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const { sticker, previewWidth, previewHeight, onUpdate } = configRef.current;
        setIsDragging(false);
        if (
          previewWidth > 0 &&
          previewHeight > 0 &&
          (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2)
        ) {
          const deltaX = gestureState.dx / previewWidth;
          const deltaY = gestureState.dy / previewHeight;
          const newX = Math.max(0.05, Math.min(0.95, dragStartRef.current.x + deltaX));
          const newY = Math.max(0.05, Math.min(0.95, dragStartRef.current.y + deltaY));
          setDragOffset({ x: 0, y: 0 });
          dragStartRef.current = { x: newX, y: newY };
          HapticsService.light();
          onUpdate({
            ...sticker,
            x: Number(newX.toFixed(3)),
            y: Number(newY.toFixed(3)),
          });
        } else {
          setDragOffset({ x: 0, y: 0 });
        }
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
      },
    }),
  ).current;

  const currentX = Math.max(0.05, Math.min(0.95, sticker.x + dragOffset.x));
  const currentY = Math.max(0.05, Math.min(0.95, sticker.y + dragOffset.y));

  return (
    <View
      style={[
        styles.wrapper,
        {
          left: `${currentX * 100}%`,
          top: `${currentY * 100}%`,
          transform: [
            { translateX: -28 },
            { translateY: -28 },
            { scale: sticker.scale || 1 },
            { rotate: `${sticker.rotation || 0}deg` },
          ],
          zIndex: isSelected ? 200 : 50,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View
        style={[
          styles.contentBox,
          isSelected && styles.contentBoxSelected,
          isDragging && styles.contentBoxDragging,
        ]}
      >
        {sticker.emoji ? (
          <Text style={styles.stickerEmoji}>{sticker.emoji}</Text>
        ) : sticker.uri ? (
          <Image source={{ uri: sticker.uri }} style={styles.stickerImage} />
        ) : null}
      </View>

      {/* Delete button (X) when sticker is selected */}
      {isSelected && (
        <Pressable
          onPress={() => {
            HapticsService.medium();
            onDelete();
          }}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          style={styles.deleteBadge}
        >
          <AppIcon name="close" size={12} color="#FFFFFF" />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentBox: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  contentBoxSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderStyle: 'dashed',
  },
  contentBoxDragging: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(6, 182, 212, 0.25)',
    transform: [{ scale: 1.08 }],
  },
  stickerEmoji: {
    fontSize: 34,
    textAlign: 'center',
  },
  stickerImage: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  deleteBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.error,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
});
