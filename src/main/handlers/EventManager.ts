import { EventEmitter } from 'events'
import { mouseHandler, MouseEvent } from './mouse'
import { keyboardHandler, KeyboardEvent } from './keyboard'

export interface ActivityEvent {
  id: string
  category: 'mouse' | 'keyboard'
  event: MouseEvent | KeyboardEvent
  timestamp: number
}

export interface EventStats {
  totalEvents: number
  mouseEvents: number
  keyboardEvents: number
  windowEvents: number
  screenshotEvents: number
  startTime: number
  lastEventTime: number
}

export class EventManager extends EventEmitter {
  private events: ActivityEvent[] = []
  private maxEventsInMemory: number = 10000
  private isRunning: boolean = false
  private startTime: number = 0
  private eventCounter: number = 0

  constructor() {
    super()
  }

  async start(): Promise<void> {
    if (this.isRunning) return

    this.isRunning = true
    this.startTime = Date.now()

    // Set up event listeners
    this.setupMouseHandler()
    this.setupKeyboardHandler()

    // Start all handlers
    mouseHandler.start()
    keyboardHandler.start()

    this.emit('started')
  }

  stop(): void {
    if (!this.isRunning) return

    this.isRunning = false

    // Stop all handlers
    mouseHandler.stop()
    keyboardHandler.stop()

    // Remove listeners
    mouseHandler.removeAllListeners()
    keyboardHandler.removeAllListeners()

    this.emit('stopped')
  }

  private setupMouseHandler(): void {
    mouseHandler.on('mouse-event', (event: MouseEvent) => {
      console.log('🎯 EventManager received mouse event:', event.type, 'at', event.position)
      this.addEvent('mouse', event)
    })

    mouseHandler.on('error', (error) => {
      console.error('❌ Mouse handler error:', error)
      this.emit('error', { handler: 'mouse', error })
    })
  }

  private setupKeyboardHandler(): void {
    keyboardHandler.on('keyboard-event', (event: KeyboardEvent) => {
      this.addEvent('keyboard', event)
    })

    keyboardHandler.on('error', (error) => {
      this.emit('error', { handler: 'keyboard', error })
    })
  }

  private addEvent(category: 'mouse' | 'keyboard', event: MouseEvent | KeyboardEvent): void {
    const activityEvent: ActivityEvent = {
      id: `${category}_${++this.eventCounter}`,
      category,
      event,
      timestamp: event.timestamp
    }

    this.events.push(activityEvent)

    console.log(
      `📈 EventManager: Added ${category} event #${this.eventCounter} (Total: ${this.events.length})`
    )

    // Emit the event for real-time processing
    this.emit('activity-event', activityEvent)

    // Manage memory by removing old events if limit exceeded
    if (this.events.length > this.maxEventsInMemory) {
      const removed = this.events.splice(0, this.events.length - this.maxEventsInMemory)
      console.log(
        `🧹 EventManager: Pruned ${removed.length} old events (keeping ${this.events.length})`
      )
      this.emit('events-pruned', removed.length)
    }
  }

  // Query methods
  getEvents(category?: 'mouse' | 'keyboard', limit?: number): ActivityEvent[] {
    let filtered = category ? this.events.filter((e) => e.category === category) : [...this.events]

    if (limit && limit > 0) {
      filtered = filtered.slice(-limit)
    }

    return filtered
  }

  getEventsSince(timestamp: number, category?: 'mouse' | 'keyboard'): ActivityEvent[] {
    return this.events.filter(
      (e) => e.timestamp >= timestamp && (!category || e.category === category)
    )
  }

  getStats(): EventStats {
    const stats: EventStats = {
      totalEvents: this.events.length,
      mouseEvents: 0,
      keyboardEvents: 0,
      windowEvents: 0,
      screenshotEvents: 0,
      startTime: this.startTime,
      lastEventTime: 0
    }

    for (const event of this.events) {
      switch (event.category) {
        case 'mouse':
          stats.mouseEvents++
          break
        case 'keyboard':
          stats.keyboardEvents++
          break
      }

      if (event.timestamp > stats.lastEventTime) {
        stats.lastEventTime = event.timestamp
      }
    }

    return stats
  }

  clearEvents(): void {
    const count = this.events.length
    this.events = []
    this.emit('events-cleared', count)
  }

  // Configuration
  setMaxEventsInMemory(max: number): void {
    this.maxEventsInMemory = max
  }

  // Export/Import functionality for persistence
  exportEvents(): string {
    return JSON.stringify(
      {
        events: this.events,
        stats: this.getStats(),
        exportTime: Date.now()
      },
      null,
      2
    )
  }

  importEvents(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData)
      if (data.events && Array.isArray(data.events)) {
        this.events = data.events
        this.emit('events-imported', data.events.length)
      }
    } catch (error) {
      this.emit('error', { handler: 'import', error })
    }
  }
}

// Singleton instance
export const eventManager = new EventManager()
