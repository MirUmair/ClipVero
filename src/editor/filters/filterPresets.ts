/**
 * Original Filter Presets for Clipvero
 * Clean, fast, non-destructive color adjustments
 */

import { FilterPreset } from '../../types/project';

export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'none',
    name: 'Original',
    adjustments: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      exposure: 0,
      temperature: 0,
      highlights: 0,
      shadows: 0,
      sharpen: 0,
    },
  },
  {
    id: 'warm',
    name: 'Warm Sunset',
    colorOverlay: 'rgba(255, 140, 0, 0.12)',
    adjustments: {
      temperature: 30,
      saturation: 15,
      brightness: 5,
      contrast: 10,
    },
  },
  {
    id: 'cool',
    name: 'Cool Breeze',
    colorOverlay: 'rgba(0, 160, 255, 0.12)',
    adjustments: {
      temperature: -30,
      saturation: 5,
      contrast: 12,
      brightness: 0,
    },
  },
  {
    id: 'vivid',
    name: 'Vivid Pop',
    adjustments: {
      saturation: 45,
      contrast: 25,
      brightness: 5,
      sharpen: 20,
    },
  },
  {
    id: 'cinematic',
    name: 'Cinematic Teal',
    colorOverlay: 'rgba(0, 128, 128, 0.14)',
    adjustments: {
      contrast: 30,
      saturation: -10,
      shadows: -15,
      highlights: 10,
    },
  },
  {
    id: 'bw',
    name: 'Monochrome',
    colorOverlay: 'rgba(0, 0, 0, 0.35)',
    adjustments: {
      saturation: -100,
      contrast: 35,
      brightness: 5,
      sharpen: 25,
    },
  },
  {
    id: 'vintage',
    name: 'Vintage Film',
    colorOverlay: 'rgba(235, 190, 140, 0.16)',
    adjustments: {
      temperature: 20,
      saturation: -20,
      contrast: -10,
      exposure: 10,
    },
  },
];
