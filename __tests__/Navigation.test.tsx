import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import {
  NavigationProvider,
  useAppNavigation,
} from '../src/navigation/navigationContext';
import { Project } from '../src/types/project';

test('returning from Export keeps the edited project and Home clears history', async () => {
  let navigation!: ReturnType<typeof useAppNavigation>;
  const Probe = () => {
    navigation = useAppNavigation();
    return null;
  };
  let renderer!: Renderer.ReactTestRenderer;
  const original: Project = {
    id: 'project',
    name: 'Original',
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
      fps: 30,
      quality: 'recommended',
      format: 'mp4',
    },
  };
  await act(async () => {
    renderer = Renderer.create(
      <NavigationProvider>
        <Probe />
      </NavigationProvider>,
    );
  });
  await act(async () => navigation.navigate('Editor', { project: original }));
  const edited = { ...original, name: 'Edited', updatedAt: 2 };
  await act(async () => navigation.navigate('Export', { project: edited }));
  await act(async () => navigation.goBack());
  expect(navigation.currentScreen).toBe('Editor');
  expect(navigation.params.project).toEqual(edited);
  await act(async () => navigation.navigate('Home'));
  expect(navigation.canGoBack).toBe(false);
  await act(async () => renderer.unmount());
});
