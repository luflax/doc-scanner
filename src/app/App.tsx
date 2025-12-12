import { lazy, Suspense } from 'react';
import { useStore } from '@/store';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { OfflineIndicator } from '@/components/common/OfflineIndicator';
import { Header } from '@/components/layout/Header';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { ToastContainer } from '@/components/common/Toast';
import { Spinner } from '@/components/common/Spinner';

// Lazy load views for code splitting
const CameraView = lazy(() => import('@/components/camera/CameraView').then(m => ({ default: m.CameraView })));
const CropView = lazy(() => import('@/components/crop/CropView').then(m => ({ default: m.CropView })));
const EnhanceView = lazy(() => import('@/components/enhance/EnhanceView').then(m => ({ default: m.EnhanceView })));
const DocumentsView = lazy(() => import('@/components/documents/DocumentsView').then(m => ({ default: m.DocumentsView })));
const DocumentDetailView = lazy(() => import('@/components/documents/DocumentDetailView').then(m => ({ default: m.DocumentDetailView })));
const OCRView = lazy(() => import('@/components/ocr/OCRView').then(m => ({ default: m.OCRView })));
const ExportView = lazy(() => import('@/components/export/ExportView').then(m => ({ default: m.ExportView })));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <Spinner size="lg" />
    </div>
  );
}

function App() {
  const currentView = useStore((state) => state.ui.currentView);

  const renderView = () => {
    switch (currentView) {
      case 'camera':
        return <CameraView />;
      case 'crop':
        return <CropView />;
      case 'enhance':
        return <EnhanceView />;
      case 'documents':
        return <DocumentsView />;
      case 'detail':
        return <DocumentDetailView />;
      case 'ocr':
        return <OCRView />;
      case 'export':
        return <ExportView />;
      default:
        return <CameraView />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen overflow-hidden bg-white">
        <Header />
        <OfflineIndicator />
        <main className="flex-1 overflow-hidden mt-14 mb-16">
          <Suspense fallback={<LoadingFallback />}>
            {renderView()}
          </Suspense>
        </main>
        <BottomNavigation />
        <ToastContainer />
      </div>
    </ErrorBoundary>
  );
}

export default App;
