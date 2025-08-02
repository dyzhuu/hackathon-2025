import { EventEmitter } from 'events'
import { mouseHandler, MouseEvent, MouseStats } from './mouse'
import { keyboardHandler, KeyboardEvent, KeyboardStats } from './keyboard'

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

export interface AggregatedStats {
  session: {
    startTime: number
    duration: number
    totalEvents: number
  }
  mouse: MouseStats
  keyboard: KeyboardStats
  combined: {
    eventsPerMinute: number
    mostActiveMinute: {
      minute: number
      eventCount: number
    } | null
    activityDistribution: {
      mousePercentage: number
      keyboardPercentage: number
    }
  }
}

export class EventManager extends EventEmitter {
  private events: ActivityEvent[] = []
  private maxEventsInMemory: number = 10000
  private isRunning: boolean = false
  private startTime: number = 0
  private eventCounter: number = 0
  private statsInterval: NodeJS.Timeout | null = null
  private readonly STATS_INTERVAL_MS = 5000 // 5 seconds

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

    // Start statistics logging interval
    this.startStatsInterval()

    this.emit('started')
  }

  stop(): void {
    if (!this.isRunning) return

    this.isRunning = false

    // Stop statistics interval
    this.stopStatsInterval()

    // Stop all handlers
    mouseHandler.stop()
    keyboardHandler.stop()

    // Remove listeners
    mouseHandler.removeAllListeners()
    keyboardHandler.removeAllListeners()

    this.emit('stopped')
  }

  private startStatsInterval(): void {
    this.statsInterval = setInterval(() => {
      this.logAggregatedStats()
    }, this.STATS_INTERVAL_MS)
  }

  private stopStatsInterval(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval)
      this.statsInterval = null
    }
  }

  private logAggregatedStats(): void {
    const stats = this.getAggregatedStats()
    
    console.log('\n' + '='.repeat(80))
    console.log('📊 ACTIVITY STATISTICS REPORT')
    console.log('='.repeat(80))
    
    // Session Info
    console.log(`⏱️  Session Duration: ${(stats.session.duration / 1000).toFixed(1)}s`)
    console.log(`📈 Total Events: ${stats.session.totalEvents}`)
    console.log(`⚡ Events/min: ${stats.combined.eventsPerMinute.toFixed(1)}`)
    
    // Activity Distribution
    console.log('\n🎯 Activity Distribution:')
    console.log(`   Mouse: ${stats.combined.activityDistribution.mousePercentage.toFixed(1)}%`)
    console.log(`   Keyboard: ${stats.combined.activityDistribution.keyboardPercentage.toFixed(1)}%`)
    
    // Mouse Statistics
    console.log('\n🖱️  Mouse Statistics:')
    console.log(`   Total Events: ${stats.mouse.totalEvents}`)
    console.log(`   Clicks: ${stats.mouse.eventTypeCounts.mouseClick}`)
    console.log(`   Movements: ${stats.mouse.eventTypeCounts.mouseMove}`)
    console.log(`   Wheel: ${stats.mouse.eventTypeCounts.mouseWheel}`)
    console.log(`   Distance: ${stats.mouse.totalDistance.toFixed(0)}px`)
    console.log(`   Speed: ${stats.mouse.averageMovementSpeed.toFixed(1)}px/s`)
    console.log(`   Clicks/min: ${stats.mouse.clicksPerMinute.toFixed(1)}`)
    
    // Button Usage
    if (stats.mouse.buttonUsage.left > 0 || stats.mouse.buttonUsage.right > 0 || stats.mouse.buttonUsage.middle > 0) {
      console.log(`   Button Usage: L:${stats.mouse.buttonUsage.left} R:${stats.mouse.buttonUsage.right} M:${stats.mouse.buttonUsage.middle}`)
    }
    
    // Screen Coverage
    if (stats.mouse.screenBounds) {
      const width = stats.mouse.screenBounds.maxX - stats.mouse.screenBounds.minX
      const height = stats.mouse.screenBounds.maxY - stats.mouse.screenBounds.minY
      console.log(`   Screen Coverage: ${width}x${height}px`)
    }
    
    // Keyboard Statistics
    console.log('\n⌨️  Keyboard Statistics:')
    console.log(`   Total Events: ${stats.keyboard.totalEvents}`)
    console.log(`   Key Downs: ${stats.keyboard.keyDownEvents}`)
    console.log(`   Key Ups: ${stats.keyboard.keyUpEvents}`)
    console.log(`   Unique Keys: ${stats.keyboard.uniqueKeysPressed.size}`)
    
    if (stats.keyboard.mostPressedKey) {
      console.log(`   Most Pressed: "${stats.keyboard.mostPressedKey.key}" (${stats.keyboard.mostPressedKey.count}x)`)
    }
    
    // Modifier Usage
    const mouseModSum = Object.values(stats.mouse.modifierUsage).reduce((a, b) => a + b, 0)
    const keyModSum = Object.values(stats.keyboard.modifierUsage).reduce((a, b) => a + b, 0)
    
    if (mouseModSum > 0 || keyModSum > 0) {
      console.log('\n🔧 Modifier Key Usage:')
      console.log(`   Ctrl: ${stats.mouse.modifierUsage.ctrl + stats.keyboard.modifierUsage.ctrl}`)
      console.log(`   Alt: ${stats.mouse.modifierUsage.alt + stats.keyboard.modifierUsage.alt}`)
      console.log(`   Shift: ${stats.mouse.modifierUsage.shift + stats.keyboard.modifierUsage.shift}`)
      console.log(`   Meta: ${stats.mouse.modifierUsage.meta + stats.keyboard.modifierUsage.meta}`)
    }
    
    console.log('='.repeat(80) + '\n')
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

  getAggregatedStats(): AggregatedStats {
    const sessionDuration = Date.now() - this.startTime
    const sessionMinutes = sessionDuration / (1000 * 60)
    
    const mouseStats = mouseHandler.getStats()
    const keyboardStats = keyboardHandler.getStats()
    
    const totalEvents = mouseStats.totalEvents + keyboardStats.totalEvents
    const eventsPerMinute = sessionMinutes > 0 ? totalEvents / sessionMinutes : 0
    
    // Calculate activity distribution
    const mousePercentage = totalEvents > 0 ? (mouseStats.totalEvents / totalEvents) * 100 : 0
    const keyboardPercentage = totalEvents > 0 ? (keyboardStats.totalEvents / totalEvents) * 100 : 0
    
    // Find most active minute (simplified - just use current rate)
    const mostActiveMinute = sessionMinutes > 0 ? {
      minute: Math.floor(sessionMinutes),
      eventCount: Math.round(eventsPerMinute)
    } : null

    return {
      session: {
        startTime: this.startTime,
        duration: sessionDuration,
        totalEvents
      },
      mouse: mouseStats,
      keyboard: keyboardStats,
      combined: {
        eventsPerMinute,
        mostActiveMinute,
        activityDistribution: {
          mousePercentage,
          keyboardPercentage
        }
      }
    }
  }

  clearEvents(): void {
    const count = this.events.length
    this.events = []
    
    // Also clear events from individual handlers
    mouseHandler.clearEvents()
    keyboardHandler.clearEvents()
    
    this.emit('events-cleared', count)
  }

  // Configuration
  setMaxEventsInMemory(max: number): void {
    this.maxEventsInMemory = max
  }

  setStatsInterval(intervalMs: number): void {
    this.stopStatsInterval()
    if (this.isRunning) {
      this.statsInterval = setInterval(() => {
        this.logAggregatedStats()
      }, intervalMs)
    }
  }

  // Export/Import functionality for persistence
  exportEvents(): string {
    return JSON.stringify(
      {
        events: this.events,
        stats: this.getStats(),
        aggregatedStats: this.getAggregatedStats(),
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
