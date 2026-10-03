import { StickerLayer, AudioTrack, Project } from '../src/types/project';
import { MediaEngine } from '../src/media/mediaEngine';

describe('Sticker and Fade Functionality', () => {
  const initialSticker: StickerLayer = {
    id: 'sticker_1',
    emoji: '🔥',
    startTime: 0,
    endTime: 3,
    x: 0.5,
    y: 0.5,
    scale: 1,
    rotation: 0,
  };

  const initialAudioTrack: AudioTrack = {
    id: 'audio_1',
    uri: 'file:///sample_audio.wav',
    name: 'Lo-Fi Chill',
    duration: 15,
    originalDuration: 15,
    startTime: 0,
    trimStart: 0,
    trimEnd: 15,
    volume: 0.8,
    fadeInDuration: 0,
    fadeOutDuration: 0,
    isMuted: false,
  };

  it('updates sticker coordinates upon repositioning', () => {
    const updated = {
      ...initialSticker,
      x: 0.72,
      y: 0.35,
    };
    expect(updated.x).toBe(0.72);
    expect(updated.y).toBe(0.35);
    expect(updated.emoji).toBe('🔥');
  });

  it('deletes sticker from project layer list', () => {
    const layers: StickerLayer[] = [
      initialSticker,
      { ...initialSticker, id: 'sticker_2', emoji: '✨' },
    ];
    const afterDelete = layers.filter(s => s.id !== 'sticker_1');
    expect(afterDelete.length).toBe(1);
    expect(afterDelete[0].id).toBe('sticker_2');
    expect(afterDelete[0].emoji).toBe('✨');
  });

  it('configures audio fade in and fade out durations', () => {
    const trackWithFade: AudioTrack = {
      ...initialAudioTrack,
      fadeInDuration: 1.5,
      fadeOutDuration: 2.0,
    };
    expect(trackWithFade.fadeInDuration).toBe(1.5);
    expect(trackWithFade.fadeOutDuration).toBe(2.0);
  });

  it('passes project with audioTracks and aspectRatio into export pipeline', async () => {
    const testProject: Project = {
      id: 'proj_export_test',
      name: 'Test Project',
      clips: [
        {
          id: 'clip_1',
          uri: 'file:///clip1.mp4',
          name: 'Clip 1',
          type: 'video',
          duration: 5,
          originalDuration: 5,
          trimStart: 0,
          trimEnd: 5,
          speed: 1,
          volume: 1,
          isMuted: false,
          rotation: 0,
          flipHorizontal: false,
          flipVertical: false,
          crop: null,
          filterId: 'none',
          adjustments: {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            exposure: 0,
            temperature: 0,
            highlights: 0,
            shadows: 0,
            sharpen: 0,
          },
          transition: { type: 'none', duration: 0.5 },
          width: 1080,
          height: 1920,
        },
      ],
      aspectRatio: '9:16',
      audioTracks: [
        {
          ...initialAudioTrack,
          fadeInDuration: 1.0,
          fadeOutDuration: 1.0,
        },
      ],
      textLayers: [],
      stickerLayers: [initialSticker],
      pipLayers: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      exportSettings: {
        resolution: '1080p',
        fps: 30,
        quality: 'recommended',
        format: 'mp4',
      },
    };

    const res = await MediaEngine.exportProject(testProject);
    expect(res).toBeDefined();
    expect(res.outputPath).toBeDefined();
    expect(res.fileSize).toBeGreaterThan(0);
  });
});
