import React from 'react';
import { useStore } from '@/store';
import type { ViewType } from '@/types';

export const BottomNavigation: React.FC = () => {
  const currentView = useStore((state) => state.ui.currentView);
  const setCurrentView = useStore((state) => state.setCurrentView);

  const navItems: Array<{ view: ViewType; label: string; icon: string }> = [
    { view: 'camera', label: 'Camera', icon: '📷' },
    { view: 'documents', label: 'Documents', icon: '📄' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => setCurrentView(item.view)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              currentView === item.view
                ? 'text-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="text-2xl mb-1">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};
