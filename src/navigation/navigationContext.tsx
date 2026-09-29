/**
 * Clipvero Navigation Context
 * Ultra-smooth, lightweight screen transition management
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { Project, MediaClip } from '../types/project';

export type ScreenName = 'Home' | 'MediaPicker' | 'Editor' | 'Export';

export interface NavigationParams {
  project?: Project;
  initialClips?: MediaClip[];
  quickToolMode?: string;
  sourceScreen?: ScreenName;
}

interface NavigationContextType {
  currentScreen: ScreenName;
  params: NavigationParams;
  navigate: (screen: ScreenName, params?: NavigationParams) => void;
  goBack: () => void;
  canGoBack: boolean;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [history, setHistory] = useState<
    Array<{ screen: ScreenName; params: NavigationParams }>
  >([{ screen: 'Home', params: {} }]);

  const current = history[history.length - 1];

  const navigate = useCallback(
    (screen: ScreenName, params: NavigationParams = {}) => {
      setHistory(prev => [...prev, { screen, params }]);
    },
    [],
  );

  const goBack = useCallback(() => {
    setHistory(prev => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        currentScreen: current.screen,
        params: current.params,
        navigate,
        goBack,
        canGoBack: history.length > 1,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export function useAppNavigation(): NavigationContextType {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error('useAppNavigation must be used within NavigationProvider');
  }
  return ctx;
}
