import type { CameraConfig } from '@/types';

export const CAMERA_CONSTRAINTS = {
  mobile: {
    video: {
      facingMode: { exact: 'environment' },
      width: { ideal: 3840, min: 1920 },
      height: { ideal: 2160, min: 1080 },
      frameRate: { ideal: 30, max: 60 },
      focusMode: 'continuous',
      exposureMode: 'continuous',
      whiteBalanceMode: 'continuous',
    } as any,
    audio: false,
  },
  fallback: {
    video: {
      facingMode: 'environment',
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false,
  },
};

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  facingMode: 'environment',
  resolution: {
    ideal: { width: 1920, height: 1080 },
    min: { width: 1280, height: 720 },
  },
  focusMode: 'continuous',
  torch: false,
};

export const PREVIEW_CONSTRAINTS = {
  maxWidth: 640,
  maxHeight: 480,
  targetFPS: 15,
  skipFrames: 2,
};
