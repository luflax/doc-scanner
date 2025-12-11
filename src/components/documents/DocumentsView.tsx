import React from 'react';
import { useStore } from '@/store';
import { Button } from '@/components/common/Button';

export const DocumentsView: React.FC = () => {
  const { documents, setCurrentView } = useStore((state) => ({
    documents: state.documents.list,
    setCurrentView: state.setCurrentView,
  }));

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-6">
        <div className="text-6xl mb-4">📁</div>
        <h2 className="text-xl font-semibold mb-2">No Documents Yet</h2>
        <p className="text-sm text-gray-600 mb-6 text-center max-w-md">
          Start by scanning your first document using the camera.
        </p>
        <Button onClick={() => setCurrentView('camera')} variant="primary" size="lg">
          Scan Document
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 p-4">
      <div className="grid grid-cols-2 gap-4">
        {documents.map((doc) => (
          <div key={doc.id} className="card p-4">
            <div className="aspect-document bg-gray-200 rounded mb-2" />
            <h3 className="text-sm font-medium truncate">{doc.name}</h3>
            <p className="text-xs text-gray-500">{doc.pages.length} pages</p>
          </div>
        ))}
      </div>
    </div>
  );
};
