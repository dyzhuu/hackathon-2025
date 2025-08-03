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
  // Movement analytics (for move events)
  velocity?: number;
  distance?: number;
  direction?: number;
  // Scroll analytics (for scroll events)
  wheelDelta?: number;
}

export interface MouseMovementSummary {
  totalDistance: number;
  averageVelocity: number;
  maxVelocity: number;
  directionalChanges: number;
  movementVariance: number;
  moveCount: number;
}

export interface ScrollSummary {
  totalScrollDelta: number;
  scrollCount: number;
  averageScrollAmount: number;
  scrollDirection: 'up' | 'down' | 'mixed';
}

export interface ClickSummary {
  totalClicks: number;
  clickRate: number;
  doubleClicks: number;
  rightClicks: number;
  leftClicks: number;
}

export interface MouseData {
  events: ProcessedMouseEvent[];
  movementSummary: MouseMovementSummary;
  scrollSummary: ScrollSummary;
  clickSummary: ClickSummary;
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
  screenshotUrl?: string;
  mouseData: MouseData;
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
  private readonly WINDOW_INTERVAL_MS = 20000; // 20 seconds
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
        numberOfClicks: event.numberOfClicks,
        // Include movement and scroll analytics
        velocity: mouseEvent.velocity,
        distance: mouseEvent.distance,
        direction: mouseEvent.direction,
        wheelDelta: mouseEvent.wheelDelta
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
          processName: windowEvent.activeApp ?? 'unknown',
          windowTitle: windowEvent.windowTitle ?? 'unknown'
        };
        windowEvents.push(processedEvent);
      }
    }

    // Calculate comprehensive mouse data with all summaries
    const movementSummary = this.calculateMovementSummary(mouseEvents);
    const scrollSummary = this.calculateScrollSummary(mouseEvents);
    const clickSummary = this.calculateClickSummary(mouseEvents, windowEnd - windowStart);

    const mouseData: MouseData = {
      events: mouseEvents,
      movementSummary,
      scrollSummary,
      clickSummary
    };

    return {
      windowStartTime: windowStart.toString(),
      windowEndTime: windowEnd.toString(),
      durationMs: windowEnd - windowStart,
      screenshotUrl: '',
      mouseData,
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

  private calculateMovementSummary(mouseEvents: ProcessedMouseEvent[]): MouseMovementSummary {
    const moveEvents = mouseEvents.filter((e) => e.eventType === 'move');

    if (moveEvents.length === 0) {
      return {
        totalDistance: 0,
        averageVelocity: 0,
        maxVelocity: 0,
        directionalChanges: 0,
        movementVariance: 0,
        moveCount: 0
      };
    }

    let totalDistance = 0;
    let maxVelocity = 0;
    let directionalChanges = 0;
    const velocities: number[] = [];
    let lastDirection: number | null = null;

    for (const event of moveEvents) {
      if (event.distance !== undefined) {
        totalDistance += event.distance;
      }

      if (event.velocity !== undefined) {
        velocities.push(event.velocity);
        maxVelocity = Math.max(maxVelocity, event.velocity);
      }

      // Count directional changes
      if (event.direction !== undefined && lastDirection !== null) {
        const angleDiff = Math.abs(event.direction - lastDirection);
        // Consider it a direction change if angle difference is > 45 degrees (π/4 radians)
        if (angleDiff > Math.PI / 4 && angleDiff < (7 * Math.PI) / 4) {
          directionalChanges++;
        }
      }
      lastDirection = event.direction || null;
    }

    const averageVelocity =
      velocities.length > 0 ? velocities.reduce((sum, v) => sum + v, 0) / velocities.length : 0;

    // Calculate velocity variance
    const movementVariance =
      velocities.length > 0
        ? velocities.reduce((sum, v) => sum + Math.pow(v - averageVelocity, 2), 0) /
          velocities.length
        : 0;

    return {
      totalDistance: Math.round(totalDistance * 100) / 100,
      averageVelocity: Math.round(averageVelocity * 1000) / 1000, // Round to 3 decimal places
      maxVelocity: Math.round(maxVelocity * 1000) / 1000,
      directionalChanges,
      movementVariance: Math.round(movementVariance * 1000) / 1000,
      moveCount: moveEvents.length
    };
  }

  private calculateScrollSummary(mouseEvents: ProcessedMouseEvent[]): ScrollSummary {
    const scrollEvents = mouseEvents.filter((e) => e.eventType === 'scroll');

    if (scrollEvents.length === 0) {
      return {
        totalScrollDelta: 0,
        scrollCount: 0,
        averageScrollAmount: 0,
        scrollDirection: 'mixed'
      };
    }

    let totalScrollDelta = 0;
    let upScrolls = 0;
    let downScrolls = 0;

    for (const event of scrollEvents) {
      if (event.wheelDelta !== undefined) {
        totalScrollDelta += event.wheelDelta;

        if (event.wheelDelta > 0) {
          upScrolls++;
        } else if (event.wheelDelta < 0) {
          downScrolls++;
        }
      }
    }

    const averageScrollAmount =
      scrollEvents.length > 0 ? Math.abs(totalScrollDelta) / scrollEvents.length : 0;

    let scrollDirection: 'up' | 'down' | 'mixed';
    if (upScrolls > 0 && downScrolls === 0) {
      scrollDirection = 'up';
    } else if (downScrolls > 0 && upScrolls === 0) {
      scrollDirection = 'down';
    } else {
      scrollDirection = 'mixed';
    }

    return {
      totalScrollDelta: Math.round(totalScrollDelta * 100) / 100,
      scrollCount: scrollEvents.length,
      averageScrollAmount: Math.round(averageScrollAmount * 100) / 100,
      scrollDirection
    };
  }

  private calculateClickSummary(
    mouseEvents: ProcessedMouseEvent[],
    durationMs: number
  ): ClickSummary {
    const clickEvents = mouseEvents.filter((e) => e.eventType === 'click');

    if (clickEvents.length === 0) {
      return {
        totalClicks: 0,
        clickRate: 0,
        doubleClicks: 0,
        rightClicks: 0,
        leftClicks: 0
      };
    }

    let doubleClicks = 0;
    let rightClicks = 0;
    let leftClicks = 0;

    for (const event of clickEvents) {
      // Count click types based on input format
      if (event.input?.includes('rightClick')) {
        rightClicks++;
      } else if (event.input?.includes('leftClick')) {
        leftClicks++;
      }

      // Count double clicks based on numberOfClicks
      if (event.numberOfClicks && event.numberOfClicks >= 2) {
        doubleClicks++;
      }
    }

    const durationSec = durationMs / 1000;
    const clickRate = durationSec > 0 ? clickEvents.length / durationSec : 0;

    return {
      totalClicks: clickEvents.length,
      clickRate: Math.round(clickRate * 100) / 100,
      doubleClicks,
      rightClicks,
      leftClicks
    };
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
