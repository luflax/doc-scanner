import { useStore } from '@/store';
import { Header } from '@/components/layout/Header';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { ToastContainer } from '@/components/common/Toast';
import { CameraView } from '@/components/camera/CameraView';
import { CropView } from '@/components/crop/CropView';
import { EnhanceView } from '@/components/enhance/EnhanceView';
import { DocumentsView } from '@/components/documents/DocumentsView';

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
      case 'ocr':
        return (
          <div className="flex items-center justify-center h-full">
            <p>OCR View - Coming Soon</p>
          </div>
        );
      case 'export':
        return (
          <div className="flex items-center justify-center h-full">
            <p>Export View - Coming Soon</p>
          </div>
        );
      default:
        return <CameraView />;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      <Header />
      <main className="flex-1 overflow-hidden mt-14 mb-16">
        {renderView()}
      </main>
      <BottomNavigation />
      <ToastContainer />
    </div>
  );
}

export default App;
