import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Modal } from '../../components/common/Modal';
import { CustomSlider } from '../../components/common/Slider';
import { Button } from '../../components/common/Button';
import { AppIcon } from '../../components/icons/AppIcons';
import { AudioTrack } from '../../types/project';
import { HapticsService } from '../../services/hapticsService';

interface AudioModalProps {
  visible: boolean;
  onClose: () => void;
  track: AudioTrack | null;
  onUpdateTrack: (track: AudioTrack) => void;
  onDeleteTrack?: (trackId: string) => void;
  onExtractAudio?: () => void;
  onAddMusic?: () => void;
}

export const AudioModal: React.FC<AudioModalProps> = ({
  visible,
  onClose,
  track,
  onUpdateTrack,
  onDeleteTrack,
  onExtractAudio,
  onAddMusic,
}) => {
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={track ? track.name : 'Audio & Music'}
    >
      <View style={styles.container}>
        {track ? (
          <>
            <CustomSlider
              label="Track Volume"
              value={Math.round(track.volume * 100)}
              min={0}
              max={100}
              onValueChange={val =>
                onUpdateTrack({ ...track, volume: val / 100 })
              }
              formatValue={val => `${val}%`}
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
          <View style={styles.emptyAudioContainer}>
            <Text style={styles.infoText}>
              Add background music or extract audio track from any clip in your
              project.
            </Text>

            <View style={styles.quickButtons}>
              {onAddMusic && (
                <Button
                  title="+ Add Music"
                  variant="primary"
                  size="md"
                  onPress={() => {
                    HapticsService.light();
                    onAddMusic();
                    onClose();
                  }}
                  icon={<AppIcon name="music" size={16} color={colors.text} />}
                  style={{ marginBottom: spacing.sm }}
                />
              )}

              {onExtractAudio && (
                <Button
                  title="Extract Audio from Clip"
                  variant="secondary"
                  size="md"
                  onPress={() => {
                    HapticsService.light();
                    onExtractAudio();
                    onClose();
                  }}
                  icon={
                    <AppIcon name="sparkles" size={16} color={colors.text} />
                  }
                />
              )}
            </View>
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
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  emptyAudioContainer: {
    paddingVertical: spacing.base,
  },
  infoText: {
    ...typography.bodySecondary,
    marginBottom: spacing.base,
    textAlign: 'center',
  },
  quickButtons: {
    gap: spacing.sm,
  },
});
