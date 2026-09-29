/**
 * Clipvero Project & Media Types
 * Modern Reels, Shorts, and Social Video Editor
 */

export type AspectRatioType = '9:16' | '16:9' | '1:1' | '4:5' | 'original';

export type CanvasBackgroundType = 'fit' | 'fill' | 'blur' | 'solid';

export interface CanvasBackground {
  type: CanvasBackgroundType;
  color?: string;
}

export interface ClipAdjustments {
  brightness: number; // -100 to 100, default 0
  contrast: number; // -100 to 100, default 0
  saturation: number; // -100 to 100, default 0
  exposure: number; // -100 to 100, default 0
  temperature: number; // -100 to 100, default 0
  highlights: number; // -100 to 100, default 0
  shadows: number; // -100 to 100, default 0
  sharpen: number; // 0 to 100, default 0
}

export type FilterId =
  | 'none'
  | 'warm'
  | 'cool'
  | 'vivid'
  | 'cinematic'
  | 'bw'
  | 'vintage';

export interface FilterPreset {
  id: FilterId;
  name: string;
  colorOverlay?: string;
  adjustments: Partial<ClipAdjustments>;
}

export type TransitionType = 'none' | 'fade' | 'dissolve' | 'slide' | 'zoom';

export interface ClipTransition {
  type: TransitionType;
  duration: number; // in seconds, default 0.5s
}

export interface CropRect {
  x: number; // 0 to 1 normalized
  y: number; // 0 to 1 normalized
  width: number; // 0 to 1 normalized
  height: number; // 0 to 1 normalized
  ratio: AspectRatioType;
}

export interface MediaClip {
  id: string;
  uri: string;
  name: string;
  type: 'video' | 'image';
  duration: number; // Effective playback duration in seconds (after trim & speed)
  originalDuration: number; // Raw duration in seconds
  trimStart: number; // Seconds from start
  trimEnd: number; // Seconds from start (e.g., originalDuration)
  speed: number; // 0.25 to 4.0, default 1.0
  volume: number; // 0 to 1, default 1
  isMuted: boolean;
  rotation: number; // 0, 90, 180, 270
  flipHorizontal: boolean;
  flipVertical: boolean;
  crop: CropRect | null;
  filterId: FilterId;
  adjustments: ClipAdjustments;
  transition: ClipTransition;
  thumbnailUri?: string;
  width: number;
  height: number;
}

export type TextAnimationType =
  | 'none'
  | 'fadeIn'
  | 'fadeOut'
  | 'slideUp'
  | 'slideDown'
  | 'scaleIn'
  | 'pop';

export interface TextLayer {
  id: string;
  text: string;
  startTime: number; // In project timeline seconds
  endTime: number; // In project timeline seconds
  x: number; // Relative center position 0..1 (0.5 = center)
  y: number; // Relative center position 0..1 (0.5 = center)
  scale: number;
  rotation: number; // In degrees
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor?: string;
  opacity: number;
  textAlign: 'left' | 'center' | 'right';
  animation: TextAnimationType;
  outlineColor?: string;
  outlineWidth?: number;
}

export interface StickerLayer {
  id: string;
  uri?: string;
  emoji?: string;
  startTime: number;
  endTime: number;
  x: number; // 0..1
  y: number; // 0..1
  scale: number;
  rotation: number;
}

export interface AudioTrack {
  id: string;
  uri: string;
  name: string;
  duration: number; // Effective duration
  originalDuration: number;
  startTime: number; // Timeline start time in seconds
  trimStart: number;
  trimEnd: number;
  volume: number; // 0 to 1
  fadeInDuration: number; // in seconds
  fadeOutDuration: number; // in seconds
  isMuted: boolean;
  isExtracted?: boolean;
}

export type ExportResolution = '1080p' | '720p' | '480p';
export type ExportFps = 24 | 30 | 60 | 'original';
export type ExportQuality = 'high' | 'recommended' | 'smaller';

export interface ExportSettings {
  resolution: ExportResolution;
  fps: ExportFps;
  quality: ExportQuality;
  format: 'mp4';
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  aspectRatio: AspectRatioType;
  canvasBackground: CanvasBackground;
  clips: MediaClip[];
  textLayers: TextLayer[];
  stickerLayers: StickerLayer[];
  audioTracks: AudioTrack[];
  exportSettings: ExportSettings;
  thumbnailUri?: string;
}

export interface ExportResult {
  id: string;
  projectId: string;
  projectName: string;
  outputPath: string;
  thumbnailUri?: string;
  duration: number; // in seconds
  fileSizeBytes: number;
  resolution: string;
  createdAt: number;
}
