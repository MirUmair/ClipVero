/**
 * File utilities for Clipvero
 */

export function formatFileSize(bytes: number): string {
  if (isNaN(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(1)} ${units[i]}`;
}

export function generateExportFileName(
  projectName: string,
  extension: string = 'mp4',
): string {
  const sanitized = projectName
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 30);
  const timestamp = Date.now().toString().slice(-6);
  return `Clipvero_${sanitized || 'Video'}_${timestamp}.${extension}`;
}

export function getFileName(uri: string): string {
  if (!uri) return '';
  const parts = uri.split('/');
  return parts[parts.length - 1] || 'video';
}
