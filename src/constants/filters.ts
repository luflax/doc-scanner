import type { FilterPreset, EnhancementOptions } from '@/types';

interface EnhancementStep {
  type: string;
  [key: string]: any;
}

interface EnhancementPipeline {
  steps: EnhancementStep[];
}

export const FILTER_PRESETS: Record<FilterPreset, EnhancementPipeline> = {
  original: {
    steps: [],
  },
  document: {
    steps: [
      { type: 'grayscale' },
      { type: 'adaptiveThreshold', blockSize: 11, C: 2 },
      { type: 'denoise', strength: 3 },
      { type: 'sharpen', amount: 0.5 },
    ],
  },
  grayscale: {
    steps: [
      { type: 'grayscale' },
      { type: 'contrast', value: 10 },
      { type: 'sharpen', amount: 0.3 },
    ],
  },
  magic: {
    steps: [
      { type: 'autoWhiteBalance' },
      { type: 'autoContrast' },
      { type: 'shadowRecovery', amount: 30 },
      { type: 'sharpen', amount: 0.4 },
      { type: 'vibrance', amount: 15 },
    ],
  },
  whiteboard: {
    steps: [
      { type: 'whiteBalance', temperature: -10 },
      { type: 'brightness', value: 20 },
      { type: 'contrast', value: 40 },
      { type: 'saturation', value: -30 },
      { type: 'sharpen', amount: 0.6 },
    ],
  },
  book: {
    steps: [
      { type: 'grayscale' },
      { type: 'contrast', value: 15 },
      { type: 'brightness', value: 10 },
      { type: 'sharpen', amount: 0.4 },
    ],
  },
  receipt: {
    steps: [
      { type: 'grayscale' },
      { type: 'adaptiveThreshold', blockSize: 15, C: 5 },
      { type: 'denoise', strength: 5 },
      { type: 'sharpen', amount: 0.6 },
    ],
  },
  photo: {
    steps: [
      { type: 'autoWhiteBalance' },
      { type: 'contrast', value: 5 },
      { type: 'saturation', value: 10 },
      { type: 'sharpen', amount: 0.2 },
    ],
  },
  blueprint: {
    steps: [
      { type: 'invert' },
      { type: 'contrast', value: 20 },
      { type: 'sharpen', amount: 0.5 },
    ],
  },
};

export const DEFAULT_ENHANCEMENT_OPTIONS: EnhancementOptions = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  sharpness: 0,
  gamma: 1.0,
  shadows: 0,
  highlights: 0,
  temperature: 0,
};

export const FILTER_LABELS: Record<FilterPreset, string> = {
  original: 'Original',
  document: 'Document',
  grayscale: 'Grayscale',
  magic: 'Magic Color',
  whiteboard: 'Whiteboard',
  book: 'Book',
  receipt: 'Receipt',
  photo: 'Photo',
  blueprint: 'Blueprint',
};
