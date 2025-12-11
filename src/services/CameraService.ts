import type { CameraConfig, CameraCapabilities } from '@/types';

export class CameraService {
  private stream: MediaStream | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  private currentFacingMode: 'environment' | 'user' = 'environment';

  /**
   * Initialize camera with optimal settings
   */
  async initialize(config?: Partial<CameraConfig>): Promise<MediaStream> {
    const defaultConfig: CameraConfig = {
      facingMode: 'environment',
      resolution: {
        ideal: { width: 3840, height: 2160 },
        min: { width: 1920, height: 1080 },
      },
      focusMode: 'continuous',
      torch: false,
    };

    const finalConfig = { ...defaultConfig, ...config };
    this.currentFacingMode = finalConfig.facingMode;

    try {
      // Try with ideal constraints first
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: finalConfig.facingMode },
          width: { ideal: finalConfig.resolution.ideal.width },
          height: { ideal: finalConfig.resolution.ideal.height },
        },
        audio: false,
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoTrack = this.stream.getVideoTracks()[0];

      return this.stream;
    } catch (error) {
      // Fallback to basic constraints
      console.warn('Failed with ideal constraints, falling back to basic', error);

      const fallbackConstraints: MediaStreamConstraints = {
        video: {
          facingMode: finalConfig.facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      this.stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
      this.videoTrack = this.stream.getVideoTracks()[0];

      return this.stream;
    }
  }

  /**
   * Get camera capabilities
   */
  getCapabilities(): CameraCapabilities | null {
    if (!this.videoTrack) {
      return null;
    }

    try {
      const capabilities = this.videoTrack.getCapabilities();

      return {
        hasFlash: 'torch' in capabilities,
        hasFocus: 'focusMode' in capabilities,
        hasZoom: 'zoom' in capabilities,
        maxZoom: (capabilities as any).zoom?.max || 1,
        supportedResolutions: this.getSupportedResolutions(capabilities),
      };
    } catch (error) {
      console.error('Failed to get camera capabilities', error);
      return {
        hasFlash: false,
        hasFocus: false,
        hasZoom: false,
        maxZoom: 1,
        supportedResolutions: [],
      };
    }
  }

  /**
   * Get supported resolutions from capabilities
   */
  private getSupportedResolutions(capabilities: MediaTrackCapabilities): Array<{ width: number; height: number }> {
    const resolutions: Array<{ width: number; height: number }> = [];

    // Common mobile camera resolutions
    const commonResolutions = [
      { width: 3840, height: 2160 }, // 4K
      { width: 1920, height: 1080 }, // 1080p
      { width: 1280, height: 720 },  // 720p
      { width: 640, height: 480 },   // VGA
    ];

    const maxWidth = capabilities.width?.max || 1920;
    const maxHeight = capabilities.height?.max || 1080;

    // Filter resolutions that are supported by the camera
    for (const res of commonResolutions) {
      if (res.width <= maxWidth && res.height <= maxHeight) {
        resolutions.push(res);
      }
    }

    return resolutions;
  }

  /**
   * Switch between front and back camera
   */
  async switchCamera(): Promise<MediaStream> {
    const newFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';

    // Dispose current stream
    this.dispose();

    // Initialize with new facing mode
    return this.initialize({ facingMode: newFacingMode });
  }

  /**
   * Capture high-resolution photo from video stream
   */
  async capturePhoto(videoElement: HTMLVideoElement): Promise<ImageData> {
    if (!this.stream) {
      throw new Error('Camera not initialized');
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(videoElement, 0, 0);

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  /**
   * Get real-time frame for preview processing
   */
  getVideoFrame(videoElement: HTMLVideoElement): ImageData | null {
    if (!this.stream) {
      return null;
    }

    try {
      const canvas = document.createElement('canvas');
      // Use smaller resolution for real-time processing
      const width = Math.min(640, videoElement.videoWidth);
      const height = Math.min(480, videoElement.videoHeight);

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return null;
      }

      ctx.drawImage(videoElement, 0, 0, width, height);

      return ctx.getImageData(0, 0, width, height);
    } catch (error) {
      console.error('Failed to get video frame', error);
      return null;
    }
  }

  /**
   * Set zoom level
   */
  async setZoom(level: number): Promise<void> {
    if (!this.videoTrack) {
      throw new Error('Camera not initialized');
    }

    const capabilities = this.videoTrack.getCapabilities();
    if (!('zoom' in capabilities)) {
      throw new Error('Zoom not supported');
    }

    const constraints = {
      advanced: [{ zoom: level } as any],
    };

    try {
      await this.videoTrack.applyConstraints(constraints);
    } catch (error) {
      console.error('Failed to set zoom', error);
      throw error;
    }
  }

  /**
   * Toggle flash/torch
   */
  async toggleFlash(enabled: boolean): Promise<void> {
    if (!this.videoTrack) {
      throw new Error('Camera not initialized');
    }

    const capabilities = this.videoTrack.getCapabilities();
    if (!('torch' in capabilities)) {
      throw new Error('Flash not supported');
    }

    const constraints = {
      advanced: [{ torch: enabled } as any],
    };

    try {
      await this.videoTrack.applyConstraints(constraints);
    } catch (error) {
      console.error('Failed to toggle flash', error);
      throw error;
    }
  }

  /**
   * Set focus point (if supported)
   */
  async setFocusPoint(x: number, y: number): Promise<void> {
    if (!this.videoTrack) {
      throw new Error('Camera not initialized');
    }

    const capabilities = this.videoTrack.getCapabilities();
    if (!('focusMode' in capabilities)) {
      console.warn('Focus control not supported');
      return;
    }

    // Note: Point-based focus is not widely supported yet
    // This is a placeholder for future support
    console.log('Focus point requested:', x, y);
  }

  /**
   * Get current stream
   */
  getStream(): MediaStream | null {
    return this.stream;
  }

  /**
   * Get current facing mode
   */
  getCurrentFacingMode(): 'environment' | 'user' {
    return this.currentFacingMode;
  }

  /**
   * Check if camera is initialized
   */
  isInitialized(): boolean {
    return this.stream !== null && this.videoTrack !== null;
  }

  /**
   * Cleanup and stop camera stream
   */
  dispose(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.videoTrack = null;
  }
}

// Export singleton instance
export const cameraService = new CameraService();
