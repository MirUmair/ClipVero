/**
 * Clipvero - Modern Reels, Shorts, and Social Video Editor
 */

import { StatusBar, StyleSheet, View, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import { colors } from './src/theme/colors';

import { ThemedAlertModal } from './src/components/common/ThemedAlertModal';

LogBox.ignoreLogs([
  'Cannot connect to Metro',
  'Attempted to import the module',
]);

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <ErrorBoundary>
          <AppNavigator />
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
