import { EventEmitter } from 'events';
import { mouseHandler, MouseEvent } from './mouse';
import { keyboardHandler, KeyboardEvent } from './keyboard';
import { windowHandler, WindowEvent } from './window';
import { screenshotHandler, ScreenshotEvent } from './screenshot';

export interface ActivityEvent {
  id: string;
  category: 'mouse' | 'keyboard' | 'window' | 'screenshot';
  event: MouseEvent | KeyboardEvent | WindowEvent | ScreenshotEvent;
  timestamp: number;
}

export interface AggregatedActivityEvent extends ActivityEvent {
  numberOfClicks?: number;
}

export interface EventStats {
  totalEvents: number;
  mouseEvents: number;
  keyboardEvents: number;
  startTime: number;
  lastEventTime: number;
}

export interface ProcessedMouseEvent {
  timestamp: string;
  eventType: 'move' | 'click' | 'scroll';
  position: { x: number; y: number };
  input?: string;
  numberOfClicks?: number;
}

export interface ProcessedKeyboardEvent {
  timestamp: number;
  input: string;
}

export interface ProcessedWindowEvent {
  processName: string;
  windowTitle: string;
}

export interface ObservationData {
  windowStartTime: string;
  windowEndTime: string;
  durationMs: number;
  screenshotUrl: string;
  mouseEvents: ProcessedMouseEvent[];
  keyboardEvents: ProcessedKeyboardEvent[];
  windowEvents: ProcessedWindowEvent[];
}

export class EventManager extends EventEmitter {
  private events: ActivityEvent[] = [];
  private isRunning: boolean = false;
  private startTime: number = 0;
  private eventCounter: number = 0;
  private statsInterval: NodeJS.Timeout | null = null;
  // private readonly WINDOW_INTERVAL_MS = 5000; // 5 seconds
  private readonly WINDOW_INTERVAL_MS = 10000; // 5 seconds
  private windowedEvents: ActivityEvent[] = []; // Events for current window

  constructor() {
    super();
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startTime = Date.now();

    // Set up event listeners
    this.setupMouseHandler();
    this.setupKeyboardHandler();
    this.setupWindowHandler();

    // Start all handlers
    mouseHandler.start();
    keyboardHandler.start();
    windowHandler.start();
    screenshotHandler.start();

    // Start statistics logging interval
    this.startStatsInterval();

    this.emit('started');
  }

  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    // Stop statistics interval
    this.stopStatsInterval();

    // Stop all handlers
    mouseHandler.stop();
    keyboardHandler.stop();
    screenshotHandler.stop();

    // Remove listeners
    mouseHandler.removeAllListeners();
    keyboardHandler.removeAllListeners();
    screenshotHandler.removeAllListeners();

    this.emit('stopped');
  }

  private startStatsInterval(): void {
    this.statsInterval = setInterval(() => {
      this.publishWindowData();
    }, this.WINDOW_INTERVAL_MS);
  }

  private stopStatsInterval(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  private async publishWindowData(): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.WINDOW_INTERVAL_MS;

    // Get events from the last window
    const windowEvents = this.windowedEvents.filter((e) => e.timestamp >= windowStart);

    // Capture screenshot for this observation cycle

    const screenshot = await screenshotHandler.captureScreenshot();

    // Process events into the requested format
    const processedData = this.processEventsForWindow(windowEvents, windowStart, now);

    // Add screenshot to the observation data
    if (screenshot) {
      processedData.screenshotUrl = screenshot.dataUrl;
    }

    // Emit window data for subscribers (pub-sub pattern)
    this.emit('window-data', processedData);

    // Clear the windowed events for the next period
    this.windowedEvents = this.windowedEvents.filter((e) => e.timestamp > windowStart);
  }

  private aggregateMouseClicks(mouseEvents: ActivityEvent[]): AggregatedActivityEvent[] {
    const CLICK_AGGREGATION_THRESHOLD_MS = 500; // Aggregate clicks within 500ms
    const POSITION_TOLERANCE = 5; // Aggregate clicks within 5 pixels

    const aggregated: AggregatedActivityEvent[] = [];

    for (const event of mouseEvents) {
      const mouseEvent = event.event as MouseEvent;

      // Only aggregate click events
      if (mouseEvent.eventType !== 'click') {
        aggregated.push({ ...event, numberOfClicks: 1 });
        continue;
      }

      // Check if we can aggregate with the previous event
      const lastEvent = aggregated[aggregated.length - 1];

      if (
        lastEvent &&
        lastEvent.category === 'mouse' &&
        (lastEvent.event as MouseEvent).eventType === 'click'
      ) {
        const lastMouseEvent = lastEvent.event as MouseEvent;
        const timeDiff = event.timestamp - lastEvent.timestamp;
        const positionDiff = Math.sqrt(
          Math.pow(mouseEvent.position.x - lastMouseEvent.position.x, 2) +
            Math.pow(mouseEvent.position.y - lastMouseEvent.position.y, 2)
        );

        // Check if events can be aggregated
        if (
          timeDiff <= CLICK_AGGREGATION_THRESHOLD_MS &&
          positionDiff <= POSITION_TOLERANCE &&
          mouseEvent.button === lastMouseEvent.button
        ) {
          // Aggregate with the previous event
          lastEvent.numberOfClicks = (lastEvent.numberOfClicks || 1) + 1;
          lastEvent.timestamp = event.timestamp; // Use the latest timestamp
          continue;
        }
      }

      // Start a new aggregated event
      aggregated.push({ ...event, numberOfClicks: 1 });
    }

    return aggregated;
  }

  private processEventsForWindow(
    events: ActivityEvent[],
    windowStart: number,
    windowEnd: number
  ): ObservationData {
    const mouseEvents: ProcessedMouseEvent[] = [];
    const keyboardEvents: ProcessedKeyboardEvent[] = [];
    const windowEvents: ProcessedWindowEvent[] = [];

    // Separate mouse events for aggregation
    const mouseActivityEvents = events.filter((e) => e.category === 'mouse');
    const aggregatedMouseEvents = this.aggregateMouseClicks(mouseActivityEvents);

    // Process aggregated mouse events
    for (const event of aggregatedMouseEvents) {
      const mouseEvent = event.event as MouseEvent;
      const processedEvent: ProcessedMouseEvent = {
        eventType: mouseEvent.eventType,
        position: {
          x: mouseEvent.position.x,
          y: mouseEvent.position.y
        },
        input: this.formatMouseInput(mouseEvent),
        timestamp: event.timestamp.toString(),
        numberOfClicks: event.numberOfClicks
      };
      mouseEvents.push(processedEvent);
    }

    // Process keyboard events normally
    for (const event of events) {
      if (event.category === 'keyboard') {
        const keyboardEvent = event.event as KeyboardEvent;
        const processedEvent: ProcessedKeyboardEvent = {
          input: this.formatKeyboardInput(keyboardEvent),
          timestamp: event.timestamp
        };
        keyboardEvents.push(processedEvent);
      }
    }

    for (const event of events) {
      if (event.category === 'window') {
        const windowEvent = event.event as WindowEvent;
        const processedEvent: ProcessedWindowEvent = {
          processName: windowEvent.activeApp,
          windowTitle: windowEvent.windowTitle
        };
        windowEvents.push(processedEvent);
      }
    }

    return {
      windowStartTime: windowStart.toString(),
      windowEndTime: windowEnd.toString(),
      durationMs: windowEnd - windowStart,
      screenshotUrl: '',
      mouseEvents,
      keyboardEvents,
      windowEvents
    };
  }

  private formatMouseInput(event: MouseEvent): string {
    const parts: string[] = [];

    // Add modifiers
    if (event.modifiers.ctrl) parts.push('Ctrl');
    if (event.modifiers.shift) parts.push('Shift');
    if (event.modifiers.alt) parts.push('Alt');
    if (event.modifiers.meta) parts.push('Meta');

    // Add action based on type and button
    switch (event.eventType) {
      case 'click': {
        parts.push(`${event.button || 'left'}Click`);
        break;
      }
      case 'move':
        parts.push('Move');
        break;
      case 'scroll':
        parts.push(`Wheel${event.wheelDelta && event.wheelDelta > 0 ? 'Up' : 'Down'}`);
        break;
    }

    return parts.join('+');
  }

  private formatKeyboardInput(event: KeyboardEvent): string {
    // Only format key_down events for input representation
    if (event.type !== 'key_down') {
      return '';
    }

    const modifiers: string[] = [];
    if (event.modifiers.ctrl) modifiers.push('Ctrl');
    if (event.modifiers.alt) modifiers.push('Alt');
    if (event.modifiers.shift) modifiers.push('Shift');
    if (event.modifiers.meta) modifiers.push('Meta');

    // For special keys or key combinations, use full notation
    const parts = [...modifiers, event.key];
    return parts.join('+');
  }

  private setupMouseHandler(): void {
    mouseHandler.on('mouse-event', (event: MouseEvent) => {
      this.addEvent('mouse', event);
    });

    mouseHandler.on('error', (error) => {
      console.error('❌ Mouse handler error:', error);
      this.emit('error', { handler: 'mouse', error });
    });
  }

  private setupKeyboardHandler(): void {
    keyboardHandler.on('keyboard-event', (event: KeyboardEvent) => {
      this.addEvent('keyboard', event);
    });

    keyboardHandler.on('error', (error) => {
      this.emit('error', { handler: 'keyboard', error });
    });
  }

  private setupWindowHandler(): void {
    windowHandler.on('window-event', (event: WindowEvent) => {
      this.addEvent('window', event);
    });
  }

  private addEvent(
    category: 'mouse' | 'keyboard' | 'window' | 'screenshot',
    event: MouseEvent | KeyboardEvent | WindowEvent | ScreenshotEvent
  ): void {
    const activityEvent: ActivityEvent = {
      id: `${category}_${++this.eventCounter}`,
      category,
      event,
      timestamp: event.timestamp
    };

    // Add to both long-term storage and windowed events
    this.events.push(activityEvent);
    this.windowedEvents.push(activityEvent);

    // Emit the event for real-time processing
    this.emit('activity-event', activityEvent);
  }

  getStats(): EventStats {
    const stats: EventStats = {
      totalEvents: this.events.length,
      mouseEvents: 0,
      keyboardEvents: 0,
      startTime: this.startTime,
      lastEventTime: 0
    };

    for (const event of this.events) {
      switch (event.category) {
        case 'mouse':
          stats.mouseEvents++;
          break;
        case 'keyboard':
          stats.keyboardEvents++;
          break;
      }

      if (event.timestamp > stats.lastEventTime) {
        stats.lastEventTime = event.timestamp;
      }
    }

    return stats;
  }
}

// Singleton instance
export const eventManager = new EventManager();
