/**
 * Clipvero Production Error Boundary
 * Prevents application-wide crashes by catching render errors and displaying
 * a modern, user-friendly recovery screen matching Clipvero's dark aesthetic.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Button } from './Button';
import { AppIcon } from '../icons/AppIcons';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (__DEV__) {
      console.error(
        '[Clipvero ErrorBoundary] Uncaught render exception:',
        error,
        errorInfo,
      );
    }
  }

  public resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback && this.state.error) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconCircle}>
              <AppIcon name="sparkles" size={40} color={colors.primaryLight} />
            </View>

            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              Clipvero encountered an unexpected issue while rendering. Don't
              worry, your source media files are safe and untouched.
            </Text>

            {__DEV__ && this.state.error && (
              <ScrollView
                style={styles.devErrorBox}
                contentContainerStyle={styles.devErrorContent}
              >
                <Text style={styles.devErrorTitle}>
                  Error Details (Debug Mode):
                </Text>
                <Text style={styles.devErrorText}>
                  {this.state.error.message}
                </Text>
                {this.state.error.stack && (
                  <Text style={styles.devStackText}>
                    {this.state.error.stack}
                  </Text>
                )}
              </ScrollView>
            )}

            <View style={styles.buttonContainer}>
              <Button
                title="Try Again"
                variant="primary"
                size="lg"
                onPress={this.resetError}
                icon={<AppIcon name="undo" size={18} color="#FFFFFF" />}
              />
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  buttonContainer: {
    width: '100%',
    gap: spacing.sm,
  },
  devErrorBox: {
    width: '100%',
    maxHeight: 180,
    backgroundColor: '#1E1218',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7F1D1D',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  devErrorContent: {
    paddingBottom: spacing.xs,
  },
  devErrorTitle: {
    ...typography.caption,
    color: '#F87171',
    fontWeight: '700',
    marginBottom: 4,
  },
  devErrorText: {
    ...typography.caption,
    color: '#FECACA',
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  devStackText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontFamily: 'monospace',
  },
});
