/**
 * Clip Transition Definitions
 */

import { TransitionType } from '../../types/project';

export interface TransitionPreset {
  type: TransitionType;
  name: string;
  description: string;
  isSupportedNatively: boolean; // Transparent capability indicator per project rules
}

export const TRANSITION_PRESETS: TransitionPreset[] = [
  {
    type: 'none',
    name: 'None',
    description: 'Straight cut between clips',
    isSupportedNatively: true,
  },
  {
    type: 'fade',
    name: 'Fade to Black',
    description: 'Smooth cinematic fade',
    isSupportedNatively: true,
  },
  {
    type: 'dissolve',
    name: 'Cross Dissolve',
    description: 'Soft cross-dissolve between footage',
    isSupportedNatively: true,
  },
  {
    type: 'slide',
    name: 'Slide Left',
    description: 'Horizontal push transition',
    isSupportedNatively: true,
  },
  {
    type: 'zoom',
    name: 'Zoom In',
    description: 'Dynamic zoom into the next scene',
    isSupportedNatively: true,
  },
];
