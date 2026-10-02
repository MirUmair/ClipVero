import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import { NavigationProvider } from '../src/navigation/navigationContext';
import { EditorScreen } from '../src/screens/EditorScreen';
import { TextEditorModal } from '../src/editor/text/TextEditorModal';
import { createDefaultTextLayer } from '../src/editor/text/textUtils';
import { AutosaveManager } from '../src/storage/autosaveManager';

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

beforeEach(() => jest.useFakeTimers());
afterEach(() => AutosaveManager.cancel());
afterEach(() => jest.useRealTimers());

test('opens and closes the editor when no native audio module is available', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <NavigationProvider>
        <EditorScreen />
      </NavigationProvider>,
    );
  });
  expect(renderer!.root.findByType(EditorScreen)).toBeDefined();
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('opens the text backdrop palette and saves a selected background', async () => {
  const onSaveLayer = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <TextEditorModal
        visible
        layer={createDefaultTextLayer(0, 5)}
        initialTab="background"
        onClose={jest.fn()}
        onSaveLayer={onSaveLayer}
      />,
    );
  });
  const whiteLabel = renderer!.root
    .findAllByType(Text)
    .find(node => node.props.children === 'White');
  expect(whiteLabel).toBeDefined();
  await ReactTestRenderer.act(async () => {
    // Find the interactive ancestor without depending on native host nesting.
    let button = whiteLabel!.parent;
    while (button && !button.props.onPress) button = button.parent;
    button!.props.onPress();
  });
  const save = renderer!.root.findAll(node => node.props.title === 'Done')[0];
  expect(save).toBeDefined();
  await ReactTestRenderer.act(async () => save.props.onPress());
  expect(onSaveLayer).toHaveBeenCalledWith(
    expect.objectContaining({ backgroundColor: '#FFFFFF' }),
  );
  await ReactTestRenderer.act(async () => renderer!.unmount());
});
