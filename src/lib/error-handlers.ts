/**
 * Error Handling Utilities
 * Centralized error handling for common scenarios
 */

export class CameraPermissionError extends Error {
  constructor(message: string = 'Camera permission denied') {
    super(message);
    this.name = 'CameraPermissionError';
  }
}

export class CameraNotFoundError extends Error {
  constructor(message: string = 'No camera found on this device') {
    super(message);
    this.name = 'CameraNotFoundError';
  }
}

export class StorageQuotaError extends Error {
  constructor(message: string = 'Storage quota exceeded') {
    super(message);
    this.name = 'StorageQuotaError';
  }
}

export class ProcessingError extends Error {
  constructor(message: string = 'Image processing failed') {
    super(message);
    this.name = 'ProcessingError';
  }
}

export class OCRError extends Error {
  constructor(message: string = 'OCR processing failed') {
    super(message);
    this.name = 'OCRError';
  }
}

/**
 * Handle camera errors with user-friendly messages
 */
export function handleCameraError(error: unknown): {
  title: string;
  message: string;
  action?: string;
} {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return {
          title: 'Camera Permission Denied',
          message:
            'Please allow camera access in your browser settings to use the document scanner.',
          action: 'Open Settings',
        };

      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return {
          title: 'No Camera Found',
          message:
            'No camera was detected on your device. Please ensure your camera is connected and try again.',
        };

      case 'NotReadableError':
      case 'TrackStartError':
        return {
          title: 'Camera In Use',
          message:
            'Your camera is being used by another application. Please close other apps and try again.',
        };

      case 'OverconstrainedError':
      case 'ConstraintNotSatisfiedError':
        return {
          title: 'Camera Not Supported',
          message:
            'Your camera does not meet the required specifications. Try using a different camera or device.',
        };

      case 'SecurityError':
        return {
          title: 'Security Error',
          message:
            'Camera access is blocked due to security settings. Please use HTTPS or check your browser settings.',
        };

      default:
        return {
          title: 'Camera Error',
          message: `Failed to access camera: ${error.message}`,
        };
    }
  }

  return {
    title: 'Camera Error',
    message: 'An unexpected error occurred while accessing the camera.',
  };
}

/**
 * Handle storage errors
 */
export function handleStorageError(error: unknown): {
  title: string;
  message: string;
  action?: string;
} {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'QuotaExceededError':
        return {
          title: 'Storage Full',
          message:
            'Your device storage is full. Please delete some documents or export them to free up space.',
          action: 'Manage Storage',
        };

      case 'DataError':
        return {
          title: 'Data Error',
          message:
            'Failed to save document due to a data error. Please try again.',
        };

      case 'InvalidStateError':
        return {
          title: 'Storage Error',
          message:
            'Storage is in an invalid state. Please refresh the app and try again.',
        };

      default:
        return {
          title: 'Storage Error',
          message: `Failed to access storage: ${error.message}`,
        };
    }
  }

  if (error instanceof StorageQuotaError) {
    return {
      title: 'Storage Limit Reached',
      message:
        'You have reached your storage limit. Please delete some documents to continue.',
      action: 'Manage Storage',
    };
  }

  return {
    title: 'Storage Error',
    message: 'An unexpected error occurred while accessing storage.',
  };
}

/**
 * Handle processing errors
 */
export function handleProcessingError(error: unknown): {
  title: string;
  message: string;
  action?: string;
} {
  if (error instanceof ProcessingError) {
    return {
      title: 'Processing Failed',
      message: error.message,
      action: 'Try Again',
    };
  }

  if (error instanceof Error) {
    // Out of memory errors
    if (error.message.includes('memory') || error.message.includes('heap')) {
      return {
        title: 'Memory Error',
        message:
          'Not enough memory to process this image. Try closing other apps or using a smaller image.',
        action: 'Close and Retry',
      };
    }

    // WebGL errors
    if (error.message.includes('WebGL')) {
      return {
        title: 'Graphics Error',
        message:
          'Failed to use graphics acceleration. The app will continue with software rendering.',
      };
    }
  }

  return {
    title: 'Processing Error',
    message: 'Failed to process the image. Please try again.',
    action: 'Retry',
  };
}

/**
 * Handle OCR errors
 */
export function handleOCRError(error: unknown): {
  title: string;
  message: string;
  action?: string;
} {
  if (error instanceof OCRError) {
    return {
      title: 'OCR Failed',
      message: error.message,
      action: 'Try Again',
    };
  }

  if (error instanceof Error) {
    if (error.message.includes('language')) {
      return {
        title: 'Language Not Available',
        message:
          'The selected language pack could not be loaded. Please check your internet connection and try again.',
        action: 'Retry',
      };
    }

    if (error.message.includes('worker')) {
      return {
        title: 'OCR Engine Error',
        message:
          'Failed to initialize the OCR engine. Please refresh the page and try again.',
        action: 'Refresh',
      };
    }
  }

  return {
    title: 'OCR Error',
    message: 'Failed to extract text from the image. Please try again.',
    action: 'Retry',
  };
}

/**
 * Log error to console with context
 */
export function logError(
  context: string,
  error: unknown,
  additionalInfo?: Record<string, any>
): void {
  const errorInfo = {
    context,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    ...additionalInfo,
  };

  console.error(`[${context}]`, errorInfo);

  // In production, send to error tracking service
  if (import.meta.env.MODE === 'production') {
    // TODO: Send to error tracking service (e.g., Sentry)
  }
}
