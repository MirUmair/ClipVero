/**
 * Text Overlay Utilities and Animation Types
 */

import { TextAnimationType, TextLayer } from '../../types/project';

export interface TextFontOption {
  id: string;
  name: string;
  fontFamily: string;
}

export const TEXT_FONTS: TextFontOption[] = [
  { id: 'sans', name: 'Modern Sans', fontFamily: 'System' },
  { id: 'serif', name: 'Editorial Serif', fontFamily: 'serif' },
  { id: 'mono', name: 'Monospace', fontFamily: 'monospace' },
  { id: 'bold', name: 'Impact Heavy', fontFamily: 'sans-serif-black' },
];

export const TEXT_COLORS = [
  '#FFFFFF',
  '#000000',
  '#FACC15', // Yellow
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#10B981', // Green
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

export const TEXT_ANIMATIONS: Array<{
  type: TextAnimationType;
  label: string;
}> = [
  { type: 'none', label: 'None' },
  { type: 'fadeIn', label: 'Fade In' },
  { type: 'fadeOut', label: 'Fade Out' },
  { type: 'slideUp', label: 'Slide Up' },
  { type: 'slideDown', label: 'Slide Down' },
  { type: 'scaleIn', label: 'Scale In' },
  { type: 'pop', label: 'Pop' },
];

export function createDefaultTextLayer(
  currentTime: number,
  totalDuration: number,
): TextLayer {
  const start = Math.max(0, currentTime);
  const end = Math.min(totalDuration || 5, start + 3);

  return {
    id: `text_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    text: 'Tap to edit text',
    startTime: start,
    endTime: Math.max(start + 1, end),
    x: 0.5,
    y: 0.5,
    scale: 1,
    rotation: 0,
    fontFamily: 'System',
    fontSize: 26,
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    opacity: 1,
    textAlign: 'center',
    animation: 'fadeIn',
  };
}
