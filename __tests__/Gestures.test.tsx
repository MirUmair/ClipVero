import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { PanResponder } from 'react-native';
import { CustomSlider } from '../src/components/common/Slider';
import { ClipItem } from '../src/editor/timeline/ClipItem';
import { MediaClip } from '../src/types/project';
import { DraggableSticker } from '../src/editor/preview/DraggableSticker';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  Pressable: 'Pressable',
  StyleSheet: { create: (styles: unknown) => styles },
  PanResponder: { create: jest.fn(config => ({ panHandlers: config })) },
  Platform: { OS: 'android' },
  Vibration: { vibrate: jest.fn() },
  NativeModules: {},
}));

beforeEach(() => jest.clearAllMocks());

test('a second sticker drag starts at its updated position and uses current dimensions', async () => {
  let renderer!: Renderer.ReactTestRenderer;
  const first = jest.fn();
  const latest = jest.fn();
  const sticker = { id: 'sticker', emoji: 'x', x: 0.5, y: 0.5, scale: 1, rotation: 0, startTime: 0, endTime: 2 };
  const props = { sticker, previewWidth: 100, previewHeight: 100, isSelected: false, onSelect: jest.fn(), onDelete: jest.fn(), onUpdate: first };
  await act(async () => { renderer = Renderer.create(<DraggableSticker {...props} />); });
  const handlers = (PanResponder.create as jest.Mock).mock.calls[0][0];
  await act(async () => {
    handlers.onPanResponderGrant();
    handlers.onPanResponderRelease(null, { dx: 10, dy: 0 });
  });
  expect(first).toHaveBeenLastCalledWith(expect.objectContaining({ x: 0.6 }));
  await act(async () => renderer.update(<DraggableSticker {...props} sticker={{ ...sticker, x: 0.6 }} previewWidth={200} onUpdate={latest} />));
  await act(async () => {
    handlers.onPanResponderGrant();
    handlers.onPanResponderRelease(null, { dx: 10, dy: 0 });
  });
  expect(latest).toHaveBeenLastCalledWith(expect.objectContaining({ x: 0.65 }));
  await act(async () => renderer.unmount());
});

test('slider uses measured width and cumulative drag distance only once', async () => {
  let renderer!: Renderer.ReactTestRenderer;
  const first = jest.fn();
  const latest = jest.fn();
  await act(async () => {
    renderer = Renderer.create(
      <CustomSlider value={0} min={0} max={100} onValueChange={first} />,
    );
  });
  const handlers = (PanResponder.create as jest.Mock).mock.calls[0][0];
  const track = renderer.root.findAll(node => !!node.props.onLayout)[0];
  await act(async () =>
    track.props.onLayout({ nativeEvent: { layout: { width: 400 } } }),
  );
  await act(async () =>
    renderer.update(
      <CustomSlider value={0} min={0} max={100} onValueChange={latest} />,
    ),
  );
  handlers.onPanResponderGrant({ nativeEvent: { locationX: 100 } });
  handlers.onPanResponderMove(null, { dx: 40 });
  handlers.onPanResponderMove(null, { dx: 80 });
  expect(latest.mock.calls.map(call => call[0])).toEqual([25, 35, 45]);
  expect(first).not.toHaveBeenCalled();
  await act(async () => renderer.unmount());
});

test('trim gestures keep their initial bounds and use current callbacks and speed', async () => {
  const clip: MediaClip = {
    id: 'clip',
    uri: 'file:///video.mp4',
    name: 'Video',
    type: 'video',
    duration: 4,
    originalDuration: 20,
    trimStart: 2,
    trimEnd: 10,
    speed: 2,
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
  };
  let renderer!: Renderer.ReactTestRenderer;
  const first = jest.fn();
  const latest = jest.fn();
  const props = {
    clip,
    isSelected: true,
    pixelsPerSecond: 100,
    onSelect: jest.fn(),
    onTrimChange: first,
  };
  await act(async () => {
    renderer = Renderer.create(<ClipItem {...props} />);
  });
  const start = (PanResponder.create as jest.Mock).mock.calls[0][0];
  start.onPanResponderGrant();
  start.onPanResponderMove(null, { dx: 50 });
  expect(first).toHaveBeenLastCalledWith(3, 10);
  await act(async () =>
    renderer.update(
      <ClipItem
        {...props}
        clip={{ ...clip, trimStart: 3 }}
        onTrimChange={latest}
      />,
    ),
  );
  start.onPanResponderMove(null, { dx: 100 });
  expect(latest).toHaveBeenLastCalledWith(4, 10);
  await act(async () => renderer.unmount());
});
