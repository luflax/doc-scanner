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

export interface FilterPresetInfo {
  id: FilterPreset;
  name: string;
  description: string;
  icon: string;
}

export const FILTER_PRESET_INFO: FilterPresetInfo[] = [
  {
    id: 'original',
    name: 'Original',
    description: 'No filter applied',
    icon: '📄',
  },
  {
    id: 'document',
    name: 'Document',
    description: 'High contrast B&W',
    icon: '📃',
  },
  {
    id: 'grayscale',
    name: 'Grayscale',
    description: 'Black and white',
    icon: '⬜',
  },
  {
    id: 'magic',
    name: 'Magic',
    description: 'Auto-enhanced',
    icon: '✨',
  },
  {
    id: 'whiteboard',
    name: 'Whiteboard',
    description: 'For whiteboards',
    icon: '🖊️',
  },
  {
    id: 'book',
    name: 'Book',
    description: 'For book pages',
    icon: '📖',
  },
  {
    id: 'receipt',
    name: 'Receipt',
    description: 'High contrast',
    icon: '🧾',
  },
  {
    id: 'photo',
    name: 'Photo',
    description: 'Color preserved',
    icon: '🖼️',
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    description: 'Inverted colors',
    icon: '📐',
  },
];
