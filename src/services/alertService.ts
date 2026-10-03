import { IconName } from '../components/icons/AppIcons';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export type AlertType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

export interface AlertOptions {
  title: string;
  message?: string;
  type?: AlertType;
  icon?: IconName;
  buttons?: AlertButton[];
  cancelable?: boolean;
}

type AlertListener = (options: AlertOptions | null) => void;

export class ThemedAlert {
  private static listeners: Set<AlertListener> = new Set();
  private static currentAlert: AlertOptions | null = null;

  public static subscribe(listener: AlertListener): () => void {
    ThemedAlert.listeners.add(listener);
    if (ThemedAlert.currentAlert) {
      listener(ThemedAlert.currentAlert);
    }
    return () => {
      ThemedAlert.listeners.delete(listener);
    };
  }

  public static show(options: AlertOptions): void {
    ThemedAlert.currentAlert = options;
    ThemedAlert.listeners.forEach(listener => listener(options));
  }

  public static hide(): void {
    ThemedAlert.currentAlert = null;
    ThemedAlert.listeners.forEach(listener => listener(null));
  }

  /**
   * Drop-in replacement for React Native's Alert.alert()
   */
  public static alert(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: { cancelable?: boolean; type?: AlertType; icon?: IconName },
  ): void {
    // Determine type heuristically from title and buttons if not explicitly provided
    let inferredType: AlertType = options?.type || 'info';
    const lowerTitle = (title || '').toLowerCase();
    const hasDestructive = buttons?.some(b => b.style === 'destructive');

    if (!options?.type) {
      if (hasDestructive || lowerTitle.includes('delete') || lowerTitle.includes('remove')) {
        inferredType = 'error';
      } else if (lowerTitle.includes('error') || lowerTitle.includes('failed') || lowerTitle.includes('cannot')) {
        inferredType = 'error';
      } else if (lowerTitle.includes('success') || lowerTitle.includes('added') || lowerTitle.includes('complete') || lowerTitle.includes('saved')) {
        inferredType = 'success';
      } else if (lowerTitle.includes('warning') || lowerTitle.includes('permission')) {
        inferredType = 'warning';
      } else if (buttons && buttons.length > 1) {
        inferredType = 'confirm';
      }
    }

    ThemedAlert.show({
      title,
      message,
      type: inferredType,
      icon: options?.icon,
      buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK', style: 'default' }],
      cancelable: options?.cancelable ?? true,
    });
  }

  public static success(title: string, message?: string, onOk?: () => void): void {
    ThemedAlert.show({
      title,
      message,
      type: 'success',
      buttons: [{ text: 'Great!', onPress: onOk, style: 'default' }],
    });
  }

  public static error(title: string, message?: string, onOk?: () => void): void {
    ThemedAlert.show({
      title,
      message,
      type: 'error',
      buttons: [{ text: 'Dismiss', onPress: onOk, style: 'default' }],
    });
  }

  public static confirm(
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText: string = 'Confirm',
    cancelText: string = 'Cancel',
    isDestructive: boolean = false,
  ): void {
    ThemedAlert.show({
      title,
      message,
      type: isDestructive ? 'error' : 'confirm',
      buttons: [
        { text: cancelText, onPress: onCancel, style: 'cancel' },
        { text: confirmText, onPress: onConfirm, style: isDestructive ? 'destructive' : 'default' },
      ],
      cancelable: true,
    });
  }
}
