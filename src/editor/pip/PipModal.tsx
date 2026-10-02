import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Modal } from '../../components/common/Modal';
import { CustomSlider } from '../../components/common/Slider';
import { Button } from '../../components/common/Button';
import { AppIcon } from '../../components/icons/AppIcons';
import { PipLayer } from '../../types/project';
import { HapticsService } from '../../services/hapticsService';
import { MediaEngine } from '../../media/mediaEngine';

interface PipModalProps {
  visible: boolean;
  onClose: () => void;
  pipLayers: PipLayer[];
  selectedPipId: string | null;
  currentTime: number;
  totalDuration: number;
  onSelectPip: (id: string | null) => void;
  onAddPip: (layer: PipLayer) => void;
  onUpdatePip: (layer: PipLayer) => void;
  onDeletePip: (id: string) => void;
}

const POSITION_PRESETS = [
  { label: 'Top L', x: 0.25, y: 0.25 },
  { label: 'Top R', x: 0.75, y: 0.25 },
  { label: 'Center', x: 0.5, y: 0.5 },
  { label: 'Bottom L', x: 0.25, y: 0.75 },
  { label: 'Bottom R', x: 0.75, y: 0.75 },
];

export const PipModal: React.FC<PipModalProps> = ({
  visible,
  onClose,
  pipLayers,
  selectedPipId,
  currentTime,
  totalDuration,
  onSelectPip,
  onAddPip,
  onUpdatePip,
  onDeletePip,
}) => {
  const activePip =
    pipLayers.find(p => p.id === selectedPipId) || pipLayers[0] || null;

  const handlePickMediaForPip = async () => {
    try {
      HapticsService.light();
      // Try pick audio/video or use sample video
      const samples = await MediaEngine.getSampleVideos();
      const sample = samples[1] || samples[0];

      if (sample) {
        const newPip: PipLayer = {
          id: `pip_${Date.now()}`,
          uri: sample.uri,
          name: sample.name || 'PIP Overlay',
          type: 'video',
          startTime: currentTime,
          endTime: Math.min(totalDuration || 30, currentTime + 5.0),
          x: 0.75,
          y: 0.25,
          scale: 0.35,
          rotation: 0,
          opacity: 1.0,
          volume: 0.5,
          isMuted: false,
        };
        onAddPip(newPip);
        onSelectPip(newPip.id);
        Alert.alert('PIP Added', `Added "${newPip.name}" overlay.`);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not load media for PIP.');
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Picture-in-Picture (PIP)">
      <View style={styles.container}>
        {/* Top Action Bar */}
        <View style={styles.topActions}>
          <Button
            title="+ Add Overlay Video"
            size="small"
            variant="primary"
            icon="plus"
            onPress={handlePickMediaForPip}
          />
        </View>

        {pipLayers.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pipListScroll}
          >
            {pipLayers.map((pip, idx) => {
              const isSelected = activePip?.id === pip.id;
              return (
                <Pressable
                  key={pip.id}
                  style={[styles.pipCard, isSelected && styles.selectedPipCard]}
                  onPress={() => {
                    HapticsService.light();
                    onSelectPip(pip.id);
                  }}
                >
                  <AppIcon
                    name="pip"
                    size={16}
                    color={isSelected ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.pipCardText,
                      isSelected && styles.selectedPipCardText,
                    ]}
                  >
                    PIP #{idx + 1}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {activePip ? (
          <View style={styles.controlsContainer}>
            {/* Position presets */}
            <Text style={styles.controlLabel}>Corner Position</Text>
            <View style={styles.presetRow}>
              {POSITION_PRESETS.map(pos => {
                const isCurrent =
                  Math.abs(activePip.x - pos.x) < 0.1 &&
                  Math.abs(activePip.y - pos.y) < 0.1;
                return (
                  <Pressable
                    key={pos.label}
                    style={[
                      styles.presetBtn,
                      isCurrent && styles.activePresetBtn,
                    ]}
                    onPress={() => {
                      HapticsService.light();
                      onUpdatePip({ ...activePip, x: pos.x, y: pos.y });
                    }}
                  >
                    <Text
                      style={[
                        styles.presetBtnText,
                        isCurrent && styles.activePresetBtnText,
                      ]}
                    >
                      {pos.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Scale Slider */}
            <View style={styles.sliderGroup}>
              <View style={styles.sliderHeader}>
                <Text style={styles.controlLabel}>Scale</Text>
                <Text style={styles.sliderValue}>
                  {Math.round(activePip.scale * 100)}%
                </Text>
              </View>
              <CustomSlider
                value={activePip.scale}
                minimumValue={0.15}
                maximumValue={0.8}
                step={0.05}
                onValueChange={val => onUpdatePip({ ...activePip, scale: val })}
              />
            </View>

            {/* Opacity Slider */}
            <View style={styles.sliderGroup}>
              <View style={styles.sliderHeader}>
                <Text style={styles.controlLabel}>Opacity</Text>
                <Text style={styles.sliderValue}>
                  {Math.round(activePip.opacity * 100)}%
                </Text>
              </View>
              <CustomSlider
                value={activePip.opacity}
                minimumValue={0.1}
                maximumValue={1.0}
                step={0.05}
                onValueChange={val =>
                  onUpdatePip({ ...activePip, opacity: val })
                }
              />
            </View>

            {/* Volume Slider */}
            <View style={styles.sliderGroup}>
              <View style={styles.sliderHeader}>
                <Text style={styles.controlLabel}>Overlay Audio Volume</Text>
                <Text style={styles.sliderValue}>
                  {Math.round(activePip.volume * 100)}%
                </Text>
              </View>
              <CustomSlider
                value={activePip.volume}
                minimumValue={0}
                maximumValue={1.0}
                step={0.05}
                onValueChange={val =>
                  onUpdatePip({ ...activePip, volume: val })
                }
              />
            </View>

            {/* Delete button */}
            <View style={styles.deleteRow}>
              <Button
                title="Remove PIP Overlay"
                size="small"
                variant="danger"
                icon="trash"
                onPress={() => {
                  HapticsService.snap();
                  onDeletePip(activePip.id);
                }}
              />
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No PIP overlay yet. Tap "+ Add Overlay Video" to layer a secondary
              video or photo over your main clip.
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  pipListScroll: {
    marginBottom: spacing.md,
  },
  pipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
  },
  selectedPipCard: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(235, 77, 75, 0.1)',
  },
  pipCardText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  selectedPipCardText: {
    color: colors.primary,
    fontWeight: '700',
  },
  controlsContainer: {
    marginTop: spacing.xs,
  },
  controlLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  activePresetBtn: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  presetBtnText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  activePresetBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sliderGroup: {
    marginBottom: spacing.sm,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderValue: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  deleteRow: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
});
