import { ThemedAlert, AlertOptions } from '../src/services/alertService';

describe('ThemedAlert Service', () => {
  afterEach(() => {
    ThemedAlert.hide();
  });

  it('subscribes and receives alert payload', () => {
    let received: AlertOptions | null = null;
    const unsub = ThemedAlert.subscribe(alert => {
      received = alert;
    });

    ThemedAlert.alert('Test Alert', 'This is a test message');
    expect(received).not.toBeNull();
    expect(received?.title).toBe('Test Alert');
    expect(received?.message).toBe('This is a test message');

    ThemedAlert.hide();
    expect(received).toBeNull();
    unsub();
  });

  it('infers error type for deletion alerts', () => {
    let received: AlertOptions | null = null;
    const unsub = ThemedAlert.subscribe(alert => {
      received = alert;
    });

    ThemedAlert.alert('Delete Project', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive' },
    ]);

    expect(received?.type).toBe('error');
    expect(received?.buttons?.length).toBe(2);
    unsub();
  });

  it('infers success type for success messages', () => {
    let received: AlertOptions | null = null;
    const unsub = ThemedAlert.subscribe(alert => {
      received = alert;
    });

    ThemedAlert.alert('Project Saved', 'Saved to library successfully');
    expect(received?.type).toBe('success');
    unsub();
  });

  it('handles confirm helper correctly', () => {
    let received: AlertOptions | null = null;
    const unsub = ThemedAlert.subscribe(alert => {
      received = alert;
    });

    let confirmed = false;
    ThemedAlert.confirm(
      'Discard Edits?',
      'All unsaved changes will be lost.',
      () => {
        confirmed = true;
      },
      undefined,
      'Discard',
      'Keep',
      true,
    );

    expect(received?.type).toBe('error');
    expect(received?.title).toBe('Discard Edits?');
    expect(received?.buttons?.[1].text).toBe('Discard');
    expect(received?.buttons?.[1].style).toBe('destructive');

    // Trigger confirm
    received?.buttons?.[1].onPress?.();
    expect(confirmed).toBe(true);
    unsub();
  });
});
