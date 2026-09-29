/**
 * Clipvero Theme - Colors
 * Sleek, modern, dark UI video editor identity
 */

export const colors = {
  // Brand & Accents
  primary: '#7C3AED', // Vibrant violet
  primaryLight: '#8B5CF6',
  primaryDark: '#6D28D9',
  accent: '#06B6D4', // Modern cyan
  accentPink: '#EC4899',

  // Dark Editing Workspace
  background: '#0B0D13', // Deep obsidian
  surface: '#141824', // Dark card / panel
  surfaceElevated: '#1D2234', // Modals, toolbars, popups
  surfaceHighlight: '#282F48', // Active / hover / borders

  // Timeline Specific
  timelineBg: '#0F121C',
  timelineTrack: '#191E2E',
  timelinePlayhead: '#EC4899', // Bright pink/magenta playhead
  timelineSelection: '#7C3AED',
  timelineHandle: '#FFFFFF',
  timelineAudioTrack: '#0EA5E9',
  timelineTextTrack: '#F59E0B',

  // Text & Icons
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDisabled: '#475569',

  // Status
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Border & Dividers
  border: '#23293D',
  borderLight: '#333D5A',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.75)',
  scrim: 'rgba(0, 0, 0, 0.45)',
  transparent: 'transparent',
};

export type ThemeColors = typeof colors;
