import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SplashScreen } from '../src/screens/SplashScreen';

describe('SplashScreen Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders correctly with logo, title, and tagline', () => {
    const onFinish = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(<SplashScreen onFinish={onFinish} />);
    });

    const root = renderer!.root;
    const texts = root.findAllByType('Text' as any);
    const combinedText = texts.map(t => t.props.children).flat().join(' ');

    expect(combinedText).toContain('Clip');
    expect(combinedText).toContain('Vero');
    expect(combinedText).toContain('CREATE · EDIT · SHARE');
  });

  it('triggers onFinish after animation timeout', () => {
    const onFinish = jest.fn();

    act(() => {
      ReactTestRenderer.create(<SplashScreen onFinish={onFinish} />);
    });

    expect(onFinish).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(onFinish).toHaveBeenCalled();
  });
});
