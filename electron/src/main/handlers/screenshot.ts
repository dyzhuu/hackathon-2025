import { EventEmitter } from 'events';
import { desktopCapturer, screen } from 'electron';

export interface ScreenshotEvent {
  type: 'screenshot_captured';
  dataUrl: string;
  timestamp: number;
}

export class ScreenshotHandler extends EventEmitter {
  private isActive: boolean = false;

  constructor() {
    super();
  }

  start(): void {
    if (this.isActive) return;

    this.isActive = true;
    console.log('🚀 Screenshot handler started');
  }

  stop(): void {
    if (!this.isActive) return;

    this.isActive = false;
    console.log('Screenshot handler stopped');
  }

  async captureScreenshot(): Promise<void> {
    if (!this.isActive) return;

    try {
      // Get the primary display
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.size;

      // Capture screenshot using desktopCapturer
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width, height }
      });

      if (sources.length === 0) {
        console.warn('No screen sources available for screenshot');
        return;
      }

      // Use the first available source (primary display)
      const source = sources[0];
      const dataUrl = source.thumbnail.toDataURL();

      const screenshotEvent: ScreenshotEvent = {
        type: 'screenshot_captured',
        dataUrl,
        timestamp: Date.now()
      };

      this.emit('screenshot-event', screenshotEvent);
    } catch (error) {
      console.error('❌ Failed to capture screenshot:', error);
      this.emit('error', error);
    }
  }
}

// Singleton instance
export const screenshotHandler = new ScreenshotHandler();