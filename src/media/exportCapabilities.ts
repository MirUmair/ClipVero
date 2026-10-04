import { Project } from '../types/project';

// Keep this aligned with the Android Transformer pipeline until each renderer
// has output-based validation. Reject unsupported edits before losing them.
export function getUnsupportedExportFeatures(project: Project): string[] {
  const features = new Set<string>();
  if (project.exportSettings.fps !== 'original') features.add('Frame-rate conversion');
  if (project.exportSettings.quality !== 'recommended') features.add('Encoder quality');
  if (project.textLayers.length) features.add('Text');
  if (project.stickerLayers.length) features.add('Stickers');
  if (project.pipLayers?.length) features.add('Picture-in-picture');
  if (project.canvasBackground.type !== 'fit')
    features.add('Canvas background');
  if (project.aspectRatio === 'original') features.add('Original aspect ratio');
  for (const clip of project.clips) {
    if (
      clip.speed !== 1 ||
      (clip.speedCurve && clip.speedCurve.preset !== 'none')
    )
      features.add('Speed');
    if (clip.isReversed) features.add('Reverse');
    if (clip.flipHorizontal || clip.flipVertical) features.add('Flip');
    if (clip.crop) features.add('Crop');
    if (
      clip.filterId !== 'none' ||
      Object.values(clip.adjustments).some(value => value !== 0)
    )
      features.add('Color effects');
    if (clip.transition.type !== 'none') features.add('Transitions');
    if (!clip.isMuted && clip.volume !== 0 && clip.volume !== 1)
      features.add('Clip volume');
  }
  for (const track of project.audioTracks) {
    if (track.isMuted || track.volume === 0) continue;
    if (track.startTime !== 0) features.add('Audio placement');
    if (track.volume !== 1) features.add('Audio volume');
    if (track.fadeInDuration || track.fadeOutDuration)
      features.add('Audio fades');
  }
  return [...features];
}
