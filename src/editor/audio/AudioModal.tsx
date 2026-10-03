import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Modal } from '../../components/common/Modal';
import { CustomSlider } from '../../components/common/Slider';
import { Button } from '../../components/common/Button';
import { AppIcon } from '../../components/icons/AppIcons';
import { AudioTrack } from '../../types/project';
import { HapticsService } from '../../services/hapticsService';
import { MediaEngine } from '../../media/mediaEngine';
import { formatDuration } from '../../utils/timeUtils';

export type AudioModalTab = 'music' | 'voiceover' | 'sfx';

interface AudioModalProps {
  visible: boolean;
  onClose: () => void;
  track: AudioTrack | null;
  initialTab?: AudioModalTab;
  currentTime?: number;
  onUpdateTrack: (track: AudioTrack) => void;
  onDeleteTrack?: (trackId: string) => void;
  onExtractAudio?: () => void;
  onAddMusic?: () => void;
  onPickDeviceMusic?: () => void;
  onAddRecordedVoiceover?: (track: AudioTrack) => void;
  onAddSoundEffect?: (sfx: {
    id: string;
    name: string;
    uri: string;
    duration: number;
  }) => void;
}

export const AudioModal: React.FC<AudioModalProps> = ({
  visible,
  onClose,
  track,
  initialTab = 'music',
  currentTime = 0,
  onUpdateTrack,
  onDeleteTrack,
  onExtractAudio,
  onAddMusic,
  onPickDeviceMusic,
  onAddRecordedVoiceover,
  onAddSoundEffect,
}) => {
  const [activeTab, setActiveTab] = useState<AudioModalTab>(initialTab);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [soundEffects, setSoundEffects] = useState<
    Array<{ id: string; name: string; uri: string; duration: number }>
  >([]);
  const [previewingSfxId, setPreviewingSfxId] = useState<string | null>(null);

  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab || 'music');
      setIsRecording(false);
      setRecordingSeconds(0);
      MediaEngine.getSoundEffects().then(sfx => {
        if (sfx) setSoundEffects(sfx);
      });
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [visible, initialTab]);

  const requestMicrophonePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const check = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        );
        if (check) return true;

        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message:
              'EditMate needs access to your microphone to record voiceover audio tracks.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Microphone permission check failed:', err);
        return false;
      }
    }
    return true;
  };

  const handleStartVoiceover = async () => {
    try {
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        Alert.alert(
          'Microphone Permission Required',
          'Please enable microphone access for EditMate in your device settings to record voiceovers.',
        );
        return;
      }

      HapticsService.medium();
      const res = await MediaEngine.startVoiceoverRecording();
      if (res.isRecording) {
        setIsRecording(true);
        setRecordingSeconds(0);
        timerRef.current = setInterval(() => {
          setRecordingSeconds(s => s + 1);
        }, 1000);
      }
    } catch (e: any) {
      Alert.alert(
        'Microphone Error',
        'Could not access microphone: ' + (e?.message || 'Permission required'),
      );
    }
  };

  const handleStopVoiceover = async () => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      HapticsService.success();
      setIsRecording(false);
      const res = await MediaEngine.stopVoiceoverRecording();
      if (res && res.uri) {
        const newTrack: AudioTrack = {
          id: `vo_${Date.now()}`,
          name: `Voiceover (${formatDuration(res.duration)})`,
          uri: res.uri,
          duration: res.duration,
          originalDuration: res.duration,
          startTime: currentTime,
          trimStart: 0,
          trimEnd: res.duration,
          volume: 1.0,
          fadeInDuration: 0,
          fadeOutDuration: 0,
          isMuted: false,
        };
        onAddRecordedVoiceover?.(newTrack);
        onClose();
        Alert.alert(
          'Voiceover Added',
          `Recorded ${res.duration.toFixed(
            1,
          )}s voiceover placed at timeline position.`,
        );
      }
    } catch (e: any) {
      Alert.alert('Recording Error', e?.message || 'Failed to stop recording');
    }
  };

  const handlePreviewSfx = (sfx: {
    id: string;
    uri: string;
    duration: number;
  }) => {
    HapticsService.light();
    setPreviewingSfxId(sfx.id);
    MediaEngine.playPreviewAudio({
      trackUri: sfx.uri,
      trackVolume: 1.0,
      trackMuted: false,
      trackPositionMs: 0,
    });
    setTimeout(() => {
      setPreviewingSfxId(null);
    }, Math.max(500, Math.round(sfx.duration * 1000)));
  };

  const handleAddSfx = (sfx: {
    id: string;
    name: string;
    uri: string;
    duration: number;
  }) => {
    HapticsService.medium();
    onAddSoundEffect?.(sfx);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={track ? track.name : 'Audio & Sound Suite'}
    >
      <View style={styles.container}>
        {track ? (
          /* Track Editing Controls */
          <>
            <CustomSlider
              label={
                track.volume > 1 ? 'Track Volume (Boosted)' : 'Track Volume'
              }
              value={Math.round(track.volume * 100)}
              min={0}
              max={200}
              step={1}
              onValueChange={val =>
                onUpdateTrack({ ...track, volume: val / 100 })
              }
              formatValue={val => `${val}%`}
              activeColor={track.volume > 1 ? colors.accent : colors.primary}
            />

            <CustomSlider
              label="Fade In"
              value={Number(track.fadeInDuration.toFixed(1))}
              min={0}
              max={5}
              step={0.5}
              onValueChange={val =>
                onUpdateTrack({ ...track, fadeInDuration: val })
              }
              formatValue={val => `${val}s`}
            />

            <CustomSlider
              label="Fade Out"
              value={Number(track.fadeOutDuration.toFixed(1))}
              min={0}
              max={5}
              step={0.5}
              onValueChange={val =>
                onUpdateTrack({ ...track, fadeOutDuration: val })
              }
              formatValue={val => `${val}s`}
            />

            <View style={styles.actionRow}>
              {onDeleteTrack && (
                <Button
                  title="Remove Audio"
                  variant="danger"
                  size="sm"
                  onPress={() => {
                    HapticsService.snap();
                    onDeleteTrack(track.id);
                    onClose();
                  }}
                />
              )}
              <Button
                title="Done"
                variant="primary"
                size="sm"
                onPress={onClose}
              />
            </View>
          </>
        ) : (
          /* Audio Browser: Music, Voiceover, Sound FX */
          <View style={styles.browserContainer}>
            {/* Top Tabs */}
            <View style={styles.tabRow}>
              {(
                [
                  { id: 'music', label: 'Music', icon: 'music' },
                  { id: 'voiceover', label: 'Voiceover', icon: 'mic' },
                  { id: 'sfx', label: 'Sound FX', icon: 'sparkles' },
                ] as const
              ).map(t => {
                const isActive = activeTab === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => {
                      HapticsService.light();
                      setActiveTab(t.id);
                    }}
                    style={[styles.tabChip, isActive && styles.tabChipActive]}
                  >
                    <AppIcon
                      name={t.icon}
                      size={14}
                      color={isActive ? '#FFFFFF' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.tabChipText,
                        isActive && styles.tabChipTextActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Tab 1: Music */}
            {activeTab === 'music' && (
              <View style={styles.tabContent}>
                <Text style={styles.infoText}>
                  Add soundtracks from your device storage, starter reel beats,
                  or extract audio from video clips.
                </Text>

                <View style={styles.quickButtons}>
                  {onPickDeviceMusic && (
                    <Button
                      title="Choose from Device Gallery"
                      variant="primary"
                      size="md"
                      onPress={() => {
                        HapticsService.light();
                        onPickDeviceMusic();
                        onClose();
                      }}
                      icon={<AppIcon name="folder" size={16} color="#FFFFFF" />}
                    />
                  )}

                  {onAddMusic && (
                    <Button
                      title="+ Add Starter Beat (Upbeat Reel)"
                      variant="secondary"
                      size="md"
                      onPress={() => {
                        HapticsService.light();
                        onAddMusic();
                        onClose();
                      }}
                      icon={
                        <AppIcon name="music" size={16} color={colors.text} />
                      }
                    />
                  )}

                  {onExtractAudio && (
                    <Button
                      title="Extract Audio from Video Clip"
                      variant="secondary"
                      size="md"
                      onPress={() => {
                        HapticsService.light();
                        onExtractAudio();
                        onClose();
                      }}
                      icon={
                        <AppIcon name="layers" size={16} color={colors.text} />
                      }
                    />
                  )}
                </View>
              </View>
            )}

            {/* Tab 2: Voiceover */}
            {activeTab === 'voiceover' && (
              <View style={styles.voiceoverContainer}>
                <Text style={styles.infoText}>
                  Record voiceover directly from your microphone and place it at
                  the current playhead.
                </Text>

                <View style={styles.voRecordArea}>
                  <Pressable
                    onPress={
                      isRecording ? handleStopVoiceover : handleStartVoiceover
                    }
                    style={[
                      styles.recordButton,
                      isRecording && styles.recordButtonActive,
                    ]}
                  >
                    <AppIcon
                      name="mic"
                      size={32}
                      color={isRecording ? colors.error : '#FFFFFF'}
                    />
                  </Pressable>

                  <Text
                    style={[
                      styles.recordTimeText,
                      isRecording && styles.recordTimeTextActive,
                    ]}
                  >
                    {isRecording
                      ? `Recording: ${formatDuration(recordingSeconds)}`
                      : 'Tap to Record Voiceover'}
                  </Text>
                  <Text style={styles.recordHint}>
                    {isRecording
                      ? 'Tap mic to stop and save'
                      : '100% on-device AAC audio'}
                  </Text>
                </View>
              </View>
            )}

            {/* Tab 3: Sound FX (SFX) */}
            {activeTab === 'sfx' && (
              <ScrollView
                style={styles.sfxScroll}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.infoText}>
                  Tap to preview and add sound effects at the playhead position:
                </Text>
                <View style={styles.sfxList}>
                  {soundEffects.map(item => {
                    const isPreviewing = previewingSfxId === item.id;
                    return (
                      <View key={item.id} style={styles.sfxCard}>
                        <View style={styles.sfxInfo}>
                          <Text style={styles.sfxName}>{item.name}</Text>
                          <Text style={styles.sfxDuration}>
                            {item.duration.toFixed(2)}s • Offline SFX
                          </Text>
                        </View>

                        <View style={styles.sfxActions}>
                          <Pressable
                            onPress={() => handlePreviewSfx(item)}
                            style={styles.sfxPreviewBtn}
                          >
                            <AppIcon
                              name={isPreviewing ? 'volume' : 'play'}
                              size={14}
                              color={colors.primaryLight}
                            />
                          </Pressable>

                          <Pressable
                            onPress={() => handleAddSfx(item)}
                            style={styles.sfxAddBtn}
                          >
                            <Text style={styles.sfxAddText}>+ Add</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  browserContainer: {
    paddingVertical: spacing.xs,
  },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  tabChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
  },
  tabChipActive: {
    backgroundColor: colors.primary,
  },
  tabChipText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 12,
  },
  tabChipTextActive: {
    color: '#FFFFFF',
  },
  tabContent: {
    paddingVertical: spacing.xs,
  },
  infoText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  quickButtons: {
    gap: spacing.sm,
  },
  voiceoverContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  voRecordArea: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    marginBottom: spacing.md,
  },
  recordButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 3,
    borderColor: colors.error,
  },
  recordTimeText: {
    ...typography.bodyMedium,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  recordTimeTextActive: {
    color: colors.error,
  },
  recordHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
  sfxScroll: {
    maxHeight: 280,
  },
  sfxList: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  sfxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sfxInfo: {
    flex: 1,
  },
  sfxName: {
    ...typography.bodyMedium,
    color: colors.text,
    fontSize: 13,
  },
  sfxDuration: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  sfxActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sfxPreviewBtn: {
    padding: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceHighlight,
  },
  sfxAddBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
  },
  sfxAddText: {
    ...typography.captionBold,
    color: '#FFFFFF',
    fontSize: 11,
  },
});
