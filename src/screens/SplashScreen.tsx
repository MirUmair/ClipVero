import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { colors } from '../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  // Animation values
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(16)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const screenFade = useRef(new Animated.Value(1)).current;
  const glowScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // 1. Entrance animation sequence
    Animated.parallel([
      // Logo springs in
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // Text fades and slides up
      Animated.sequence([
        Animated.delay(180),
        Animated.parallel([
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
          }),
          Animated.spring(textTranslateY, {
            toValue: 0,
            friction: 7,
            useNativeDriver: true,
          }),
        ]),
      ]),
      // Ambient glow gentle pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowScale, {
            toValue: 1.15,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowScale, {
            toValue: 0.9,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ),
      // Progress bar smoothly fills
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: false,
      }),
    ]).start();

    // 2. Smooth fade out and exit after brief splash showcase
    const timer = setTimeout(() => {
      Animated.timing(screenFade, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 1600);

    return () => clearTimeout(timer);
  }, [
    logoScale,
    logoOpacity,
    textOpacity,
    textTranslateY,
    progressAnim,
    screenFade,
    glowScale,
    onFinish,
  ]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[styles.container, { opacity: screenFade }]}
      pointerEvents={screenFade ? 'auto' : 'none'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#080B14" translucent />

      {/* Ambient Radial Glowing Orbs */}
      <Animated.View
        style={[
          styles.glowOrbTop,
          { transform: [{ scale: glowScale }] },
        ]}
      />
      <Animated.View
        style={[
          styles.glowOrbBottom,
          { transform: [{ scale: glowScale }] },
        ]}
      />

      {/* Center Branding Block */}
      <View style={styles.centerContent}>
        {/* Glowing 3D Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
            },
          ]}
        >
          <Image
            source={require('../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Brand Typography */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={styles.brandTitle}>
            Clip<Text style={styles.brandTitleAccent}>Vero</Text>
          </Text>

          <Text style={styles.tagline}>CREATE · EDIT · SHARE</Text>

          <Text style={styles.slogan}>
            Powerful Video Editing Made Simple
          </Text>

          {/* Full Screen Centered Loader */}
          <View style={styles.loaderContainer}>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[styles.progressBar, { width: progressWidth }]}
              />
            </View>
            <Text style={styles.versionText}>ClipVero Studio · Fast & Offline</Text>
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#080B14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowOrbTop: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.18,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(139, 92, 246, 0.12)', // Subtle Violet glow
  },
  glowOrbBottom: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.22,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(0, 210, 255, 0.08)', // Subtle Cyan glow
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 110,
    height: 110,
    borderRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 28,
    elevation: 25,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 104,
    height: 104,
    borderRadius: 22,
  },
  textContainer: {
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  brandTitleAccent: {
    color: colors.primaryLight,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 4,
    marginTop: 6,
  },
  slogan: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 10,
    letterSpacing: 0.3,
  },
  loaderContainer: {
    alignItems: 'center',
    marginTop: 32,
    width: '100%',
  },
  progressTrack: {
    width: 180,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.8,
  },
});
