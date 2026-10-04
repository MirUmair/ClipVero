import { NativeModules } from 'react-native';
import { MediaEngine } from '../src/media/mediaEngine';
import { ProjectStorage } from '../src/storage/projectStorage';
import { SharingService } from '../src/services/sharingService';
import { Project } from '../src/types/project';
import { getUnsupportedExportFeatures } from '../src/media/exportCapabilities';

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  Share: { share: jest.fn() },
  NativeEventEmitter: jest.fn(() => ({
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  })),
  NativeModules: {
    ClipveroMediaEngine: {
      exportProject: jest.fn(),
      shareVideo: jest.fn(),
      readFile: jest.fn(),
      saveFile: jest.fn(),
    },
  },
}));

const native = NativeModules.ClipveroMediaEngine;
const project: Project = {
  id: 'one',
  name: 'First',
  createdAt: 1,
  updatedAt: 1,
  aspectRatio: '9:16',
  canvasBackground: { type: 'fit' },
  clips: [],
  textLayers: [],
  stickerLayers: [],
  audioTracks: [],
  exportSettings: {
    resolution: '720p',
    fps: 'original',
    quality: 'recommended',
    format: 'mp4',
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  ProjectStorage.clearMemoryCache();
});

test('rejects export without native support instead of claiming a source file was rendered', async () => {
  const exportMethod = native.exportProject;
  native.exportProject = undefined;
  try {
    await expect(MediaEngine.exportProject(project)).rejects.toThrow(
      'unavailable',
    );
  } finally {
    native.exportProject = exportMethod;
  }
});

test('rejects empty projects before starting native rendering', async () => {
  await expect(MediaEngine.exportProject(project)).rejects.toThrow('Add media');
  expect(native.exportProject).not.toHaveBeenCalled();
});

test('identifies edits the renderer would silently drop', () => {
  expect(getUnsupportedExportFeatures({ ...project, stickerLayers: [{
    id: 'sticker', emoji: 'x', x: 0.5, y: 0.5, scale: 1, rotation: 0, startTime: 0, endTime: 1,
  }] })).toEqual(['Stickers']);
  expect(getUnsupportedExportFeatures(project)).toEqual([]);
});

test('Android sharing uses the native attachment bridge', async () => {
  native.shareVideo.mockResolvedValueOnce(true);
  await expect(
    SharingService.shareVideo('file:///exports/video.mp4', 'Video'),
  ).resolves.toBe(true);
  expect(native.shareVideo).toHaveBeenCalledWith(
    'file:///exports/video.mp4',
    'Video',
  );
});

test('serializes concurrent saves and deletes without losing another project', async () => {
  let disk: string | null = null;
  native.readFile.mockImplementation(async () => disk);
  native.saveFile.mockImplementation(async (_name: string, value: string) => {
    await new Promise<void>(resolve => setTimeout(resolve, 5));
    disk = value;
  });
  await Promise.all([
    ProjectStorage.saveProject(project),
    ProjectStorage.saveProject({ ...project, id: 'two', name: 'Second' }),
    ProjectStorage.deleteProject('one'),
  ]);
  ProjectStorage.clearMemoryCache();
  expect((await ProjectStorage.getAllProjects()).map(item => item.id)).toEqual([
    'two',
  ]);
});

test('does not overwrite unreadable saved projects with a partial list', async () => {
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  native.readFile.mockResolvedValueOnce('{broken');
  await expect(ProjectStorage.saveProject(project)).rejects.toThrow();
  expect(native.saveFile).not.toHaveBeenCalled();
  warning.mockRestore();
});
