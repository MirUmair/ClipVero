import { NativeModules } from 'react-native';
import { MediaEngine } from '../src/media/mediaEngine';

jest.mock('react-native', () => ({
  NativeModules: {
    ClipveroMediaEngine: {
      playPreviewAudio: jest.fn().mockResolvedValue(true),
      pausePreviewAudio: jest.fn().mockResolvedValue(true),
      stopPreviewAudio: jest.fn().mockResolvedValue(true),
      seekPreviewAudio: jest.fn().mockResolvedValue(true),
      setPreviewAudioVolume: jest.fn().mockResolvedValue(true),
      pickAudio: jest.fn(),
      getStarterMusic: jest.fn(),
    },
  },
}));

const nativeAudio = NativeModules.ClipveroMediaEngine;

beforeEach(async () => {
  await MediaEngine.stopPreviewAudio();
  jest.clearAllMocks();
});

test('adapts editor playback options to the native positional contract', async () => {
  await MediaEngine.playPreviewAudio({
    clipUri: 'file:///clip.mp4',
    clipVolume: 0.5,
    clipMuted: false,
    clipSpeed: 2,
    trackUri: 'file:///music.wav',
    trackVolume: 0.8,
    trackMuted: true,
    clipPositionMs: 1200,
    trackPositionMs: 400,
  });
  expect(nativeAudio.playPreviewAudio).toHaveBeenCalledWith(
    'file:///clip.mp4',
    0.5,
    false,
    2,
    'file:///music.wav',
    0.8,
    true,
    1200,
    400,
  );
  await MediaEngine.seekPreviewAudio(3000, -1);
  expect(nativeAudio.seekPreviewAudio).toHaveBeenCalledWith(3000, -1);
});

test('changing clip volume preserves the music volume and mute state', async () => {
  await MediaEngine.setPreviewAudioVolume({
    trackVolume: 0.3,
    trackMuted: true,
  });
  await MediaEngine.setPreviewAudioVolume({ clipVolume: 0.6 });
  expect(nativeAudio.setPreviewAudioVolume).toHaveBeenLastCalledWith(
    0.6,
    false,
    0.3,
    true,
  );
});

test('handles a native playback rejection without crashing the editor', async () => {
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  nativeAudio.pausePreviewAudio.mockRejectedValueOnce(
    new Error('Player released'),
  );
  await expect(MediaEngine.pausePreviewAudio()).resolves.toBe(false);
  warning.mockRestore();
});

test('returns audio picker cancellation and bundled music from native', async () => {
  nativeAudio.pickAudio.mockResolvedValueOnce(null);
  await expect(MediaEngine.pickAudio()).resolves.toBeNull();
  const music = [{ uri: 'file:///sample.wav', name: 'Beat', duration: 15 }];
  nativeAudio.getStarterMusic.mockResolvedValueOnce(music);
  await expect(MediaEngine.getStarterMusic()).resolves.toEqual(music);
});
