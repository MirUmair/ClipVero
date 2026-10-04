import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Animated,
  BackHandler,
} from 'react-native';
import { ThemedAlert as Alert } from '../services/alertService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';
import { AppIcon } from '../components/icons/AppIcons';
import {
  Project,
  ExportResolution,
  ExportFps,
  ExportQuality,
  ExportResult,
} from '../types/project';
import { useAppNavigation } from '../navigation/navigationContext';
import { MediaEngine } from '../media/mediaEngine';
import { ProjectStorage } from '../storage/projectStorage';
import { SharingService } from '../services/sharingService';
import { HapticsService } from '../services/hapticsService';
import { formatDuration, calculateProjectTotalDuration } from '../utils/timeUtils';
import { formatFileSize } from '../utils/fileUtils';

const RESOLUTION_OPTIONS: ExportResolution[] = ['1080p', '720p', '480p'];
const FPS_OPTIONS: ExportFps[] = ['original'];
const QUALITY_OPTIONS: Array<{
  id: ExportQuality;
  label: string;
  desc: string;
}> = [
  { id: 'recommended', label: 'Recommended', desc: 'Balanced quality & speed' },
];

export const ExportScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useAppNavigation();
  const project = navigation.params.project;

  const [resolution, setResolution] = useState<ExportResolution>('1080p');
  const [fps, setFps] = useState<ExportFps>('original');
  const [quality, setQuality] = useState<ExportQuality>('recommended');

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const exportBusy = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (exportBusy.current) MediaEngine.cancelExport().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => exportBusy.current);
    return () => subscription.remove();
  }, [isExporting]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress / 100,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  if (!project) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header title="Export" onBack={() => navigation.goBack()} />
        <View style={styles.centerError}>
          <Text style={styles.errorText}>No active project found.</Text>
        </View>
      </View>
    );
  }

  const handleStartExport = async () => {
    if (exportBusy.current) return;
    exportBusy.current = true;
    setIsExporting(true);
    setProgress(0);
    HapticsService.medium();

    try {
      const updatedProject: Project = {
        ...project,
        exportSettings: {
          resolution,
          fps,
          quality,
          format: 'mp4',
        },
      };

      const result = await MediaEngine.exportProject(updatedProject, p => {
        if (mounted.current) setProgress(p);
      });
      if (!mounted.current) return;

      HapticsService.success();

      const newExportResult: ExportResult = {
        id: `exp_${Date.now()}`,
        projectId: project.id,
        projectName: project.name,
        outputPath: result.outputPath,
        thumbnailUri: project.thumbnailUri || project.clips[0]?.thumbnailUri,
        duration: calculateProjectTotalDuration(project.clips),
        fileSizeBytes: result.fileSize,
        resolution: result.resolution || resolution,
        createdAt: Date.now(),
      };

      await ProjectStorage.saveExport(newExportResult);
      if (!mounted.current) return;
      setExportResult(newExportResult);
      setIsExporting(false);
    } catch (e: any) {
      if (!mounted.current) return;
      setIsExporting(false);
      if (e.code === 'EXPORT_CANCELLED') return;
      Alert.alert(
        'Export Failed',
        e.message || 'An error occurred during video rendering.',
      );
    } finally {
      exportBusy.current = false;
    }
  };

  const handleCancelExport = async () => {
    HapticsService.snap();
    try {
      await MediaEngine.cancelExport();
      setIsExporting(false);
      setProgress(0);
    } catch (e: any) {
      Alert.alert('Cancel Failed', e.message || 'Could not cancel export.');
    }
  };

  const handleShare = async () => {
    if (!exportResult) return;
    HapticsService.light();
    const shared = await SharingService.shareVideo(
      exportResult.outputPath,
      exportResult.projectName,
    );
    if (!shared) Alert.alert('Sharing Failed', 'Could not open the video share sheet.');
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <Header
        title={
          exportResult
            ? 'Export Complete'
            : isExporting
            ? 'Exporting...'
            : 'Export Settings'
        }
        onBack={isExporting ? undefined : () => navigation.goBack()}
      />

      <View style={styles.content}>
        {exportResult ? (
          /* Success Screen */
          <View style={styles.successContainer}>
            <View style={styles.successIconCircle}>
              <AppIcon name="check" size={32} color={colors.success} />
            </View>
            <Text style={styles.successTitle}>Your video is ready!</Text>
            <Text style={styles.successSubtitle}>
              Rendered and saved to device
            </Text>

            {/* Thumbnail and Stats Card */}
            <View style={styles.resultCard}>
              {exportResult.thumbnailUri ? (
                <Image
                  source={{ uri: exportResult.thumbnailUri }}
                  style={styles.resultThumb}
                />
              ) : (
                <View style={styles.resultThumbPlaceholder}>
                  <AppIcon
                    name="sparkles"
                    size={24}
                    color={colors.textSecondary}
                  />
                </View>
              )}
              <View style={styles.resultDetails}>
                <Text style={styles.resultName} numberOfLines={1}>
                  {exportResult.projectName}
                </Text>
                <Text style={styles.resultMeta}>
                  Duration: {formatDuration(exportResult.duration)}
                </Text>
                <Text style={styles.resultMeta}>
                  Resolution: {exportResult.resolution}
                </Text>
                <Text style={styles.resultMeta}>
                  Size: {formatFileSize(exportResult.fileSizeBytes)}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.resultActions}>
              <Button
                title="Share Video"
                variant="accent"
                size="lg"
                onPress={handleShare}
                icon={<AppIcon name="share" size={18} color="#0B0D13" />}
                style={styles.actionBtn}
              />

              <Button
                title="Edit Again"
                variant="secondary"
                size="md"
                onPress={() => navigation.goBack()}
                style={styles.actionBtn}
              />

              <Button
                title="Home"
                variant="ghost"
                size="md"
                onPress={() => navigation.navigate('Home')}
                style={styles.actionBtn}
              />
            </View>
          </View>
        ) : isExporting ? (
          /* Active Processing Screen */
          <View style={styles.exportingContainer}>
            <View style={styles.pulseCircle}>
              <AppIcon name="sparkles" size={36} color={colors.primaryLight} />
            </View>
            <Text style={styles.exportingTitle}>Exporting Project...</Text>
            <Text style={styles.progressPercentText}>{progress}%</Text>

            {/* Animated Progress Bar */}
            <View style={styles.progressBarBg}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>

            <Text style={styles.exportingHint}>
              Processing on-device with Media3 Transformer
            </Text>

            <Button
              title="Cancel Export"
              variant="danger"
              size="md"
              onPress={handleCancelExport}
              style={styles.cancelBtn}
            />
          </View>
        ) : (
          /* Settings Configuration Screen */
          <View style={styles.settingsContainer}>
            {/* Resolution */}
            <Text style={styles.groupLabel}>Resolution</Text>
            <View style={styles.chipRow}>
              {RESOLUTION_OPTIONS.map(res => {
                const isSelected = resolution === res;
                return (
                  <Pressable
                    key={res}
                    onPress={() => {
                      HapticsService.light();
                      setResolution(res);
                    }}
                    style={[styles.chip, isSelected && styles.chipActive]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextActive,
                      ]}
                    >
                      {res}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Frame Rate */}
            <Text style={[styles.groupLabel, { marginTop: spacing.base }]}>
              Frame Rate
            </Text>
            <View style={styles.chipRow}>
              {FPS_OPTIONS.map(f => {
                const isSelected = fps === f;
                return (
                  <Pressable
                    key={f.toString()}
                    onPress={() => {
                      HapticsService.light();
                      setFps(f);
                    }}
                    style={[styles.chip, isSelected && styles.chipActive]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextActive,
                      ]}
                    >
                      {f === 'original' ? 'Original' : `${f} FPS`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Quality Preset */}
            <Text style={[styles.groupLabel, { marginTop: spacing.base }]}>
              Quality Profile
            </Text>
            <View style={styles.qualityList}>
              {QUALITY_OPTIONS.map(q => {
                const isSelected = quality === q.id;
                return (
                  <Pressable
                    key={q.id}
                    onPress={() => {
                      HapticsService.light();
                      setQuality(q.id);
                    }}
                    style={[
                      styles.qualityCard,
                      isSelected && styles.qualityCardActive,
                    ]}
                  >
                    <View style={styles.qualityRadio}>
                      {isSelected && <View style={styles.qualityRadioInner} />}
                    </View>
                    <View style={styles.qualityInfo}>
                      <Text
                        style={[
                          styles.qualityTitle,
                          isSelected && styles.qualityTitleActive,
                        ]}
                      >
                        {q.label}
                      </Text>
                      <Text style={styles.qualityDesc}>{q.desc}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Start Export CTA */}
            <View style={styles.startExportBox}>
              <Button
                title="Start Export"
                variant="primary"
                size="lg"
                onPress={handleStartExport}
                icon={<AppIcon name="export" size={18} color="#FFFFFF" />}
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  centerError: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.error,
    ...typography.body,
  },
  settingsContainer: {
    flex: 1,
  },
  groupLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  chipText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  qualityList: {
    gap: spacing.sm,
  },
  qualityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qualityCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
  },
  qualityRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  qualityRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  qualityInfo: {
    flex: 1,
  },
  qualityTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  qualityTitleActive: {
    color: colors.text,
    fontWeight: '700',
  },
  qualityDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  startExportBox: {
    marginTop: 'auto',
    marginBottom: spacing.base,
  },
  exportingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  pulseCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: spacing.lg,
  },
  exportingTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  progressPercentText: {
    ...typography.mono,
    fontSize: 32,
    color: colors.primaryLight,
    marginVertical: spacing.md,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  exportingHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  cancelBtn: {
    marginTop: spacing.xxl,
    minWidth: 140,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.success,
    marginBottom: spacing.md,
  },
  successTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 4,
  },
  successSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  resultCard: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.xl,
  },
  resultThumb: {
    width: 80,
    height: 100,
    borderRadius: borderRadius.md,
  },
  resultThumbPlaceholder: {
    width: 80,
    height: 100,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultDetails: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  resultName: {
    ...typography.h3,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  resultMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  resultActions: {
    width: '100%',
    gap: spacing.sm,
  },
  actionBtn: {
    width: '100%',
  },
});
