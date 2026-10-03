/**
 * ClipVero Theme - Colors
 * Vibrant futuristic dark UI: Electric Cyan, Neon Violet/Purple, Vivid Magenta & Deep Obsidian
 */

export const colors = {
  // Brand & Accents
  primary: '#8B5CF6', // Vibrant ClipVero Purple/Violet
  primaryLight: '#A855F7',
  primaryDark: '#6D28D9',
  accent: '#00D2FF', // Electric Cyan
  accentBlue: '#0078FF',
  accentMagenta: '#D946EF', // Vivid Magenta
  accentPink: '#EC4899', // Hot Pink

  // Brand Gradients
  brandGradient: ['#00D2FF', '#8B5CF6'],
  buttonGradient: ['#00D2FF', '#D946EF'],

  // Dark Editing Workspace
  background: '#080B14', // Deep obsidian midnight
  surface: '#0F1526', // Sleek card / panel
  surfaceElevated: '#161F36', // Modals, toolbars, popups
  surfaceHighlight: '#222C4A', // Active / hover / borders

  // Timeline Specific
  timelineBg: '#0B101E',
  timelineTrack: '#141B30',
  timelinePlayhead: '#00D2FF', // Electric Cyan playhead
  timelineSelection: '#8B5CF6',
  timelineHandle: '#FFFFFF',
  timelineAudioTrack: '#00D2FF',
  timelineTextTrack: '#D946EF',

  // Text & Icons
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDisabled: '#475569',

  // Status
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#00D2FF',

  // Border & Dividers
  border: '#1E2742',
  borderLight: '#2C385C',

  // Overlays
  overlay: 'rgba(5, 8, 16, 0.82)',
  scrim: 'rgba(0, 0, 0, 0.55)',
  transparent: 'transparent',
};

export type ThemeColors = typeof colors;
