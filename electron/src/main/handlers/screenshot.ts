import { EventEmitter } from 'events';
import { screen, desktopCapturer } from 'electron';

export interface ScreenshotEvent {
  type: 'screenshot_captured';
  dataUrl: string;
  displayId: string;
  width: number;
  height: number;
  timestamp: number;
}

export class ScreenshotHandler extends EventEmitter {
  private isTracking: boolean = false;

  constructor() {
    super();
  }

  start(): void {
    if (this.isTracking) return;

    this.isTracking = true;
    console.log('🚀 Screenshot handler started');
  }

  stop(): void {
    if (!this.isTracking) return;

    this.isTracking = false;
    console.log('Screenshot handler stopped');
  }

  async captureScreenshot(): Promise<ScreenshotEvent | null> {
    if (!this.isTracking) {
      console.warn('Screenshot handler not tracking');
      return null;
    }

    try {
      // Get the primary display
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.size;

      // Capture the screen
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width, height }
      });

      // Find the source for the primary display
      const primarySource =
        sources.find((s) => String(primaryDisplay.id) === s.display_id) ?? sources[0];

      if (!primarySource) {
        throw new Error('No screen source found');
      }

      const screenshotEvent: ScreenshotEvent = {
        type: 'screenshot_captured',
        dataUrl: primarySource.thumbnail.toDataURL(),
        displayId: String(primaryDisplay.id),
        width,
        height,
        timestamp: Date.now()
      };

      this.emit('screenshot-event', screenshotEvent);
      return screenshotEvent;
    } catch (error) {
      console.error('❌ Failed to capture screenshot:', error);
      this.emit('error', error);
      return null;
    }
  }
}

// Singleton instance
export const screenshotHandler = new ScreenshotHandler();
