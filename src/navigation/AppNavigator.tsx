import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme/colors';
import { NavigationProvider, useAppNavigation } from './navigationContext';
import { HomeScreen } from '../screens/HomeScreen';
import { MediaPickerScreen } from '../screens/MediaPickerScreen';
import { EditorScreen } from '../screens/EditorScreen';
import { ExportScreen } from '../screens/ExportScreen';

const ScreenRenderer: React.FC = () => {
  const { currentScreen } = useAppNavigation();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fadeAnim.setValue(0.7);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [currentScreen, fadeAnim]);

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'Home':
        return <HomeScreen />;
      case 'MediaPicker':
        return <MediaPickerScreen />;
      case 'Editor':
        return <EditorScreen />;
      case 'Export':
        return <ExportScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <Animated.View style={[styles.screenContainer, { opacity: fadeAnim }]}>
      {renderCurrentScreen()}
    </Animated.View>
  );
};

export const AppNavigator: React.FC = () => {
  return (
    <NavigationProvider>
      <View style={styles.root}>
        <ScreenRenderer />
      </View>
    </NavigationProvider>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContainer: {
    flex: 1,
  },
});
