/**
 * Clipvero - Modern Reels, Shorts, and Social Video Editor
 */

import React, { useState } from 'react';
import { StatusBar, StyleSheet, View, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import { ThemedAlertModal } from './src/components/common/ThemedAlertModal';
import { SplashScreen } from './src/screens/SplashScreen';
import { colors } from './src/theme/colors';

LogBox.ignoreLogs([
  'Cannot connect to Metro',
  'Attempted to import the module',
]);

function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <ErrorBoundary>
          {isSplashVisible ? (
            <SplashScreen onFinish={() => setIsSplashVisible(false)} />
          ) : (
            <AppNavigator />
          )}
          <ThemedAlertModal />
        </ErrorBoundary>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default App;
