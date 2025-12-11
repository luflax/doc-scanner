import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '@/store';
import { getOCRService } from '@/services/OCRService';
import { getStorageService } from '@/services/StorageService';
import { Button } from '@/components/common/Button';
import { IconButton } from '@/components/common/IconButton';
import { Spinner } from '@/components/common/Spinner';
import type { OCRProgress } from '@/types';

const AVAILABLE_LANGUAGES = [
  { code: 'eng', name: 'English', tier: 1 },
  { code: 'spa', name: 'Spanish', tier: 1 },
  { code: 'fra', name: 'French', tier: 1 },
  { code: 'deu', name: 'German', tier: 1 },
  { code: 'ita', name: 'Italian', tier: 1 },
  { code: 'por', name: 'Portuguese', tier: 1 },
  { code: 'rus', name: 'Russian', tier: 1 },
  { code: 'jpn', name: 'Japanese', tier: 1 },
  { code: 'chi_sim', name: 'Chinese Simplified', tier: 1 },
  { code: 'kor', name: 'Korean', tier: 1 },
] as const;

export const OCRView: React.FC = () => {
  const {
    currentDocument,
    processedImage,
    isProcessing,
    progress,
    result,
    selectedLanguages,
    isInitialized,
    setOCRInitialized,
    setOCRProcessing,
    setOCRProgress,
    setOCRResult,
    setSelectedLanguages,
    setCurrentDocument,
    setDocuments,
    setCurrentView,
    addToast,
  } = useStore((state) => ({
    currentDocument: state.documents.currentDocument,
    processedImage: state.scanSession.processedImage,
    isProcessing: state.ocr.isProcessing,
    progress: state.ocr.progress,
    result: state.ocr.result,
    selectedLanguages: state.ocr.selectedLanguages,
    isInitialized: state.ocr.isInitialized,
    setOCRInitialized: state.setOCRInitialized,
    setOCRProcessing: state.setOCRProcessing,
    setOCRProgress: state.setOCRProgress,
    setOCRResult: state.setOCRResult,
    setSelectedLanguages: state.setSelectedLanguages,
    setCurrentDocument: state.setCurrentDocument,
    setDocuments: state.setDocuments,
    setCurrentView: state.setCurrentView,
    addToast: state.addToast,
  }));

  const [editedText, setEditedText] = useState('');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ocrService = getOCRService();

  // Initialize OCR service
  useEffect(() => {
    const initOCR = async () => {
      if (!isInitialized) {
        try {
          setOCRProcessing(true);
          await ocrService.initialize(selectedLanguages, (progress: OCRProgress) => {
            setOCRProgress(progress.progress * 100);
          });
          setOCRInitialized(true);
          setOCRProcessing(false);
          setOCRProgress(0);
        } catch (error) {
          console.error('Failed to initialize OCR:', error);
          addToast({
            type: 'error',
            message: 'Failed to initialize OCR service',
          });
          setOCRProcessing(false);
        }
      }
    };

    initOCR();
  }, []);

  // Load document's processed image if viewing from documents
  useEffect(() => {
    const loadDocumentImage = async () => {
      if (currentDocument && currentDocument.pages.length > 0 && !processedImage) {
        try {
          const firstPage = currentDocument.pages[0];
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);
              const imageData = ctx.getImageData(0, 0, img.width, img.height);

              // Draw to display canvas
              if (canvasRef.current) {
                const displayCtx = canvasRef.current.getContext('2d');
                if (displayCtx) {
                  canvasRef.current.width = imageData.width;
                  canvasRef.current.height = imageData.height;
                  displayCtx.putImageData(imageData, 0, 0);
                }
              }
            }
          };
          img.src = URL.createObjectURL(firstPage.processedImage);

          // Load existing OCR result if available
          if (firstPage.ocrResult) {
            setOCRResult(firstPage.ocrResult);
          }
        } catch (error) {
          console.error('Failed to load document image:', error);
        }
      }
    };

    loadDocumentImage();
  }, [currentDocument]);

  // Draw processed image on canvas
  useEffect(() => {
    if (processedImage && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = processedImage.width;
        canvas.height = processedImage.height;
        ctx.putImageData(processedImage, 0, 0);
      }
    }
  }, [processedImage]);

  // Update edited text when result changes
  useEffect(() => {
    if (result) {
      setEditedText(result.text);
    }
  }, [result]);

  const handleStartOCR = async () => {
    // Use document's image or session's processed image
    const imageToProcess = processedImage || (currentDocument && canvasRef.current
      ? canvasRef.current.getContext('2d')?.getImageData(
          0, 0, canvasRef.current.width, canvasRef.current.height
        )
      : null);

    if (!imageToProcess) {
      addToast({
        type: 'error',
        message: 'No image to process',
      });
      return;
    }

    try {
      setOCRProcessing(true);
      setOCRProgress(0);

      const result = await ocrService.recognize(
        imageToProcess,
        {
          pageSegMode: 3, // AUTO
          preserveInterwordSpaces: true,
        }
      );

      setOCRProgress(100);

      setOCRResult(result);
      setOCRProcessing(false);
      setOCRProgress(0);

      // Auto-save if document exists
      if (currentDocument) {
        await handleSaveOCR(result);
      }

      addToast({
        type: 'success',
        message: `Text extracted with ${result.confidence.toFixed(1)}% confidence`,
      });
    } catch (error) {
      console.error('OCR failed:', error);
      addToast({
        type: 'error',
        message: 'Failed to extract text from image',
      });
      setOCRProcessing(false);
      setOCRProgress(0);
    }
  };

  const handleSaveOCR = async (ocrResult?: typeof result) => {
    if (!currentDocument) {
      addToast({
        type: 'warning',
        message: 'No document to save OCR results to',
      });
      return;
    }

    const resultToSave = ocrResult || result;
    if (!resultToSave) {
      addToast({
        type: 'error',
        message: 'No OCR results to save',
      });
      return;
    }

    try {
      // Update the document's first page with OCR results
      const updatedDocument = {
        ...currentDocument,
        pages: currentDocument.pages.map((page, index) =>
          index === 0 ? { ...page, ocrResult: resultToSave } : page
        ),
        metadata: {
          ...currentDocument.metadata,
          hasOCR: true,
        },
        updatedAt: new Date(),
      };

      // Save to storage
      const storageService = await getStorageService();
      await storageService.updateDocument(updatedDocument);

      // Update store
      setCurrentDocument(updatedDocument);

      // Reload documents list
      const docs = await storageService.listDocuments({ sortBy: 'updatedAt', sortOrder: 'desc' });
      setDocuments(docs);

      addToast({
        type: 'success',
        message: 'OCR results saved to document',
      });
    } catch (error) {
      console.error('Failed to save OCR results:', error);
      addToast({
        type: 'error',
        message: 'Failed to save OCR results',
      });
    }
  };

  const handleLanguageToggle = (langCode: string) => {
    const newLanguages = selectedLanguages.includes(langCode)
      ? selectedLanguages.filter((l) => l !== langCode)
      : [...selectedLanguages, langCode];

    if (newLanguages.length === 0) {
      addToast({
        type: 'warning',
        message: 'At least one language must be selected',
      });
      return;
    }

    setSelectedLanguages(newLanguages);
    setOCRInitialized(false); // Force re-initialization with new languages
  };

  const handleCopyText = () => {
    if (editedText) {
      navigator.clipboard.writeText(editedText);
      addToast({
        type: 'success',
        message: 'Text copied to clipboard',
      });
    }
  };

  const handleShareText = async () => {
    if (!editedText) return;

    if (navigator.share) {
      try {
        await navigator.share({
          text: editedText,
          title: 'Extracted Text',
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      handleCopyText();
    }
  };

  if (!processedImage) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-6">
        <div className="text-6xl mb-4">📄</div>
        <h2 className="text-xl font-semibold mb-2">No Image to Process</h2>
        <p className="text-sm text-gray-600 mb-6 text-center max-w-md">
          Capture and enhance a document first before extracting text.
        </p>
        <Button onClick={() => setCurrentView('camera')} variant="primary" size="lg">
          Go to Camera
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Image Preview */}
      <div className="flex-shrink-0 bg-gray-900 relative overflow-hidden" style={{ height: '30%' }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-contain"
        />
      </div>

      {/* Controls */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleStartOCR}
              disabled={isProcessing || !isInitialized}
              variant="primary"
              size="md"
            >
              {isProcessing ? 'Processing...' : result ? 'Re-scan Text' : 'Extract Text'}
            </Button>
            <button
              onClick={() => setShowLanguageSelector(!showLanguageSelector)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isProcessing}
            >
              {selectedLanguages.length === 1
                ? AVAILABLE_LANGUAGES.find((l) => l.code === selectedLanguages[0])?.name
                : `${selectedLanguages.length} languages`}
            </button>
          </div>

          {result && (
            <div className="flex items-center gap-2">
              <IconButton
                icon="📋"
                onClick={handleCopyText}
                title="Copy text"
                size="md"
              />
              <IconButton
                icon="📤"
                onClick={handleShareText}
                title="Share text"
                size="md"
              />
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {isProcessing && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600">
                {progress < 100 ? 'Initializing...' : 'Recognizing text...'}
              </span>
              <span className="text-xs text-gray-600">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Language Selector */}
        {showLanguageSelector && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium mb-2">Select Languages</h3>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_LANGUAGES.map((lang) => (
                <label
                  key={lang.code}
                  className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedLanguages.includes(lang.code)}
                    onChange={() => handleLanguageToggle(lang.code)}
                    className="rounded border-gray-300"
                    disabled={isProcessing}
                  />
                  <span className="text-sm">{lang.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Confidence Score */}
        {result && !isProcessing && (
          <div className="mt-2 text-xs text-gray-600">
            Confidence: {result.confidence.toFixed(1)}% • {result.words.length} words detected
          </div>
        )}
      </div>

      {/* Text Output */}
      <div className="flex-1 overflow-hidden flex flex-col p-4 bg-gray-50">
        {!result && !isProcessing && (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <div className="text-4xl mb-2">🔍</div>
              <p className="text-gray-600 text-sm">
                Click "Extract Text" to start OCR
              </p>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Spinner size="lg" />
              <p className="text-sm text-gray-600 mt-4">
                Extracting text from document...
              </p>
            </div>
          </div>
        )}

        {result && !isProcessing && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <label className="text-sm font-medium text-gray-700 mb-2">
              Extracted Text (editable)
            </label>
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="flex-1 w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Extracted text will appear here..."
            />
          </div>
        )}
      </div>
    </div>
  );
};
