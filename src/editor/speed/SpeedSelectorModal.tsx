import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Modal } from '../../components/common/Modal';
import { HapticsService } from '../../services/hapticsService';
import { SpeedCurve, SpeedCurvePreset } from '../../types/project';
import { calculateCurveAverageSpeed } from '../../utils/timeUtils';

interface SpeedSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  currentSpeed: number;
  currentCurve?: SpeedCurve;
  onSelectSpeed: (speed: number) => void;
  onSelectCurve?: (curve: SpeedCurve) => void;
  originalDuration: number;
  trimDuration: number;
}

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0];

interface CurveDefinition {
  preset: SpeedCurvePreset;
  name: string;
  description: string;
  points: Array<{ time: number; speed: number }>;
}

const CURVE_DEFINITIONS: CurveDefinition[] = [
  {
    preset: 'none',
    name: 'Normal',
    description: 'Flat constant speed (1.0x)',
    points: [
      { time: 0, speed: 1.0 },
      { time: 0.5, speed: 1.0 },
      { time: 1.0, speed: 1.0 },
    ],
  },
  {
    preset: 'montage',
    name: 'Montage',
    description: 'Fast intro, slow-mo focus, fast exit',
    points: [
      { time: 0, speed: 2.5 },
      { time: 0.3, speed: 1.2 },
      { time: 0.5, speed: 0.4 },
      { time: 0.7, speed: 1.2 },
      { time: 1.0, speed: 2.0 },
    ],
  },
  {
    preset: 'hero',
    name: 'Hero Flash',
    description: 'Fast zoom-in (3.0x) decelerating to real-time',
    points: [
      { time: 0, speed: 3.0 },
      { time: 0.4, speed: 1.8 },
      { time: 0.7, speed: 1.0 },
      { time: 1.0, speed: 1.0 },
    ],
  },
  {
    preset: 'bullet',
    name: 'Bullet Time',
    description: 'Real-time to dramatic slow-mo (0.25x) impact',
    points: [
      { time: 0, speed: 1.0 },
      { time: 0.3, speed: 1.0 },
      { time: 0.5, speed: 0.25 },
      { time: 0.7, speed: 1.0 },
      { time: 1.0, speed: 1.0 },
    ],
  },
  {
    preset: 'jump',
    name: 'Jump Cut',
    description: 'Rhythmic speed pulses for beat-synced video',
    points: [
      { time: 0, speed: 2.2 },
      { time: 0.25, speed: 0.6 },
      { time: 0.5, speed: 2.2 },
      { time: 0.75, speed: 0.6 },
      { time: 1.0, speed: 2.0 },
    ],
  },
];

export const SpeedSelectorModal: React.FC<SpeedSelectorModalProps> = ({
  visible,
  onClose,
  currentSpeed,
  currentCurve,
  onSelectSpeed,
  onSelectCurve,
  trimDuration,
}) => {
  const [activeTab, setActiveTab] = useState<'standard' | 'curve'>(
    currentCurve && currentCurve.preset !== 'none' ? 'curve' : 'standard',
  );

  const selectedCurvePreset = currentCurve?.preset || 'none';

  const calculateEffective = (speed: number) => {
    return (trimDuration / Math.max(0.1, speed)).toFixed(1);
  };

  const calculateCurveEffective = (curve: SpeedCurve) => {
    const avg = calculateCurveAverageSpeed(curve);
    return (trimDuration / Math.max(0.1, avg)).toFixed(1);
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Speed Control">
      <View style={styles.container}>
        {/* Tab Toggle: Standard vs Curve */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[
              styles.tabButton,
              activeTab === 'standard' && styles.activeTabButton,
            ]}
            onPress={() => {
              HapticsService.light();
              setActiveTab('standard');
            }}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'standard' && styles.activeTabButtonText,
              ]}
            >
              Standard
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tabButton,
              activeTab === 'curve' && styles.activeTabButton,
            ]}
            onPress={() => {
              HapticsService.light();
              setActiveTab('curve');
            }}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'curve' && styles.activeTabButtonText,
              ]}
            >
              Speed Curve ⚡
            </Text>
          </Pressable>
        </View>

        {activeTab === 'standard' ? (
          <View>
            <Text style={styles.hint}>
              Duration: {calculateEffective(currentSpeed)}s (Current:{' '}
              {currentSpeed}x)
            </Text>

            <View style={styles.grid}>
              {SPEED_OPTIONS.map(speed => {
                const isSelected =
                  currentSpeed === speed &&
                  (!currentCurve || currentCurve.preset === 'none');
                return (
                  <Pressable
                    key={speed}
                    onPress={() => {
                      HapticsService.light();
                      if (onSelectCurve) {
                        onSelectCurve({ preset: 'none', points: [] });
                      }
                      onSelectSpeed(speed);
                    }}
                    style={[styles.chip, isSelected && styles.selectedChip]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.selectedChipText,
                      ]}
                    >
                      {speed}x
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.curveScroll}
          >
            <Text style={styles.hint}>Dynamic Speed Ramping Presets</Text>

            {CURVE_DEFINITIONS.map(c => {
              const isSelected = selectedCurvePreset === c.preset;
              const curveObj: SpeedCurve = {
                preset: c.preset,
                points: c.points,
              };
              const effDuration = calculateCurveEffective(curveObj);

              return (
                <Pressable
                  key={c.preset}
                  style={[
                    styles.curveCard,
                    isSelected && styles.selectedCurveCard,
                  ]}
                  onPress={() => {
                    HapticsService.medium();
                    if (onSelectCurve) {
                      onSelectCurve(curveObj);
                    }
                  }}
                >
                  <View style={styles.curveHeader}>
                    <View>
                      <Text
                        style={[
                          styles.curveName,
                          isSelected && styles.selectedCurveText,
                        ]}
                      >
                        {c.name}
                      </Text>
                      <Text style={styles.curveDesc}>{c.description}</Text>
                    </View>
                    <Text
                      style={[
                        styles.curveDuration,
                        isSelected && styles.selectedDuration,
                      ]}
                    >
                      ~{effDuration}s
                    </Text>
                  </View>

                  {/* Visual Speed Curve Bar Graph */}
                  <View style={styles.waveformContainer}>
                    {c.points.map((pt, idx) => {
                      // Normalize bar height based on speed (0.2x to 3.0x -> 10% to 100%)
                      const heightPct = Math.min(
                        100,
                        Math.max(15, (pt.speed / 3.0) * 100),
                      );
                      return (
                        <View key={idx} style={styles.barColumn}>
                          <View
                            style={[
                              styles.bar,
                              { height: `${heightPct}%` },
                              isSelected
                                ? styles.activeBar
                                : styles.inactiveBar,
                            ]}
                          />
                          <Text style={styles.barLabel}>{pt.speed}x</Text>
                        </View>
                      );
                    })}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
    padding: 3,
    marginBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  activeTabButton: {
    backgroundColor: colors.primary,
  },
  tabButtonText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 64,
    alignItems: 'center',
  },
  selectedChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  chipText: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  selectedChipText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  curveScroll: {
    maxHeight: 380,
  },
  curveCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  selectedCurveCard: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(235, 77, 75, 0.08)',
  },
  curveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  curveName: {
    ...typography.subtitle2,
    color: colors.text,
    fontWeight: '700',
  },
  selectedCurveText: {
    color: colors.primary,
  },
  curveDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    maxWidth: 220,
  },
  curveDuration: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  selectedDuration: {
    color: colors.primary,
  },
  waveformContainer: {
    flexDirection: 'row',
    height: 48,
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: 4,
    paddingTop: 8,
  },
  barColumn: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: 14,
    borderRadius: 3,
    minHeight: 6,
  },
  activeBar: {
    backgroundColor: colors.primary,
  },
  inactiveBar: {
    backgroundColor: colors.textSecondary,
  },
  barLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
