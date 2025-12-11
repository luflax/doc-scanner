import React, { useRef, useEffect } from 'react';
import type { FilterPreset } from '@/types';
import { FILTER_PRESET_INFO } from '@/constants/filters';

interface FilterCarouselProps {
  selectedFilter: FilterPreset;
  onSelect: (filter: FilterPreset) => void;
  disabled?: boolean;
}

export const FilterCarousel: React.FC<FilterCarouselProps> = ({
  selectedFilter,
  onSelect,
  disabled = false,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedButtonRef = useRef<HTMLButtonElement>(null);

  // Scroll to selected filter on mount and when selection changes
  useEffect(() => {
    if (selectedButtonRef.current && scrollContainerRef.current) {
      selectedButtonRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [selectedFilter]);

  return (
    <div className="w-full bg-white border-b border-gray-200">
      <div
        ref={scrollContainerRef}
        className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {FILTER_PRESET_INFO.map((filter) => {
          const isSelected = filter.id === selectedFilter;

          return (
            <button
              key={filter.id}
              ref={isSelected ? selectedButtonRef : null}
              onClick={() => !disabled && onSelect(filter.id)}
              disabled={disabled}
              className={`
                flex-shrink-0 flex flex-col items-center justify-center
                min-w-[80px] px-3 py-2 rounded-lg
                transition-all duration-200
                ${
                  isSelected
                    ? 'bg-blue-500 text-white shadow-md scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                scroll-snap-align-center
              `}
              style={{ scrollSnapAlign: 'center' }}
            >
              <span className="text-2xl mb-1">{filter.icon}</span>
              <span className="text-xs font-medium text-center leading-tight">
                {filter.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
