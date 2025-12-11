import React from 'react';
import type { EnhancementOptions } from '@/types';

interface AdjustmentSlidersProps {
  options: EnhancementOptions;
  onChange: (options: EnhancementOptions) => void;
  disabled?: boolean;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  unit?: string;
}

const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  disabled = false,
  unit = '',
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm text-gray-500">
          {value.toFixed(step < 1 ? 1 : 0)}
          {unit}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className={`
            w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`,
          }}
        />
      </div>
    </div>
  );
};

export const AdjustmentSliders: React.FC<AdjustmentSlidersProps> = ({
  options,
  onChange,
  disabled = false,
}) => {
  const handleChange = (key: keyof EnhancementOptions, value: number) => {
    onChange({
      ...options,
      [key]: value,
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Manual Adjustments</h3>

      <Slider
        label="Brightness"
        value={options.brightness}
        min={-100}
        max={100}
        step={1}
        onChange={(v) => handleChange('brightness', v)}
        disabled={disabled}
      />

      <Slider
        label="Contrast"
        value={options.contrast}
        min={-100}
        max={100}
        step={1}
        onChange={(v) => handleChange('contrast', v)}
        disabled={disabled}
      />

      <Slider
        label="Saturation"
        value={options.saturation}
        min={-100}
        max={100}
        step={1}
        onChange={(v) => handleChange('saturation', v)}
        disabled={disabled}
      />

      <Slider
        label="Gamma"
        value={options.gamma}
        min={0.1}
        max={3.0}
        step={0.1}
        onChange={(v) => handleChange('gamma', v)}
        disabled={disabled}
      />

      {/* Reset button */}
      <button
        onClick={() =>
          onChange({
            brightness: 0,
            contrast: 0,
            saturation: 0,
            sharpness: 0,
            gamma: 1.0,
            shadows: 0,
            highlights: 0,
            temperature: 0,
          })
        }
        disabled={disabled}
        className="w-full mt-2 px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Reset Adjustments
      </button>
    </div>
  );
};
