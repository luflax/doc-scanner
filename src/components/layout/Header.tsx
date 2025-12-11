import React from 'react';
import { useStore } from '@/store';

export const Header: React.FC = () => {
  const currentView = useStore((state) => state.ui.currentView);

  const getTitle = () => {
    switch (currentView) {
      case 'camera':
        return 'Document Scanner';
      case 'crop':
        return 'Crop Document';
      case 'enhance':
        return 'Enhance';
      case 'ocr':
        return 'Extract Text';
      case 'documents':
        return 'My Documents';
      case 'export':
        return 'Export';
      default:
        return 'Document Scanner';
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 pt-safe">
      <div className="flex items-center justify-between px-4 h-14">
        <h1 className="text-lg font-semibold text-gray-900">{getTitle()}</h1>
        <div className="flex items-center gap-2">
          {/* Placeholder for menu/settings buttons */}
        </div>
      </div>
    </header>
  );
};
