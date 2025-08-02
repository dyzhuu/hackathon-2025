import { GlobalKeyboardListener } from 'node-global-key-listener'
import { EventEmitter } from 'events'

export interface KeyboardEvent {
  type: 'key_down' | 'key_up'
  key: string
  keyCode?: number
  modifiers: {
    ctrl: boolean
    alt: boolean
    shift: boolean
    meta: boolean
  }
  timestamp: number
}

export interface KeyboardStats {
  totalEvents: number
  keyDownEvents: number
  keyUpEvents: number
  uniqueKeysPressed: Set<string>
  mostPressedKey: { key: string; count: number } | null
  modifierUsage: {
    ctrl: number
    alt: number
    shift: number
    meta: number
  }
}

export class KeyboardHandler extends EventEmitter {
  private listener?: GlobalKeyboardListener
  private isTracking: boolean = false
  private keyStates: Map<string, boolean> = new Map()
  private events: KeyboardEvent[] = []
  private readonly maxEvents: number = 10000
  private keyPressCount: Map<string, number> = new Map()
  private eventTypeCount: { keyDown: number; keyUp: number } = { keyDown: 0, keyUp: 0 }
  private modifierUsage = { ctrl: 0, alt: 0, shift: 0, meta: 0 }

  constructor() {
    super()
  }

  start(): void {
    if (this.isTracking) return

    this.isTracking = true
    this.listener = new GlobalKeyboardListener()

    this.listener.addListener((e, down) => {
      if (!this.isTracking) return

      try {
        const event: KeyboardEvent = {
          type: e.state === 'DOWN' ? 'key_down' : 'key_up',
          key: e.name || '',
          keyCode: typeof e.rawKey?._nameRaw === 'number' ? e.rawKey._nameRaw : undefined,
          modifiers: {
            ctrl: !!(down['LEFT CTRL'] || down['RIGHT CTRL']),
            alt: !!(down['LEFT ALT'] || down['RIGHT ALT']),
            shift: !!(down['LEFT SHIFT'] || down['RIGHT SHIFT']),
            meta: !!(down['LEFT META'] || down['RIGHT META'])
          },
          timestamp: Date.now()
        }

        // Track key states to detect held keys
        if (e.state === 'DOWN' && e.name) {
          this.keyStates.set(e.name, true)
        } else if (e.name) {
          this.keyStates.delete(e.name)
        }

        this.addEvent(event)
        this.emit('keyboard-event', event)
      } catch (error) {
        this.emit('error', error)
      }
    })
  }

  stop(): void {
    this.isTracking = false

    if (this.listener) {
      // Note: node-global-key-listener doesn't have a direct way to remove all listeners
      // In production, you might want to track listener IDs for proper cleanup
      this.listener = undefined
    }

    this.keyStates.clear()
  }

  private addEvent(event: KeyboardEvent): void {
    this.events.push(event)

    // Update statistics
    if (event.type === 'key_down') {
      this.eventTypeCount.keyDown++
    } else {
      this.eventTypeCount.keyUp++
    }

    // Track key press frequency
    const keyCount = this.keyPressCount.get(event.key) || 0
    this.keyPressCount.set(event.key, keyCount + 1)

    // Track modifier usage
    if (event.modifiers.ctrl) this.modifierUsage.ctrl++
    if (event.modifiers.alt) this.modifierUsage.alt++
    if (event.modifiers.shift) this.modifierUsage.shift++
    if (event.modifiers.meta) this.modifierUsage.meta++

    console.log(`⌨️ Keyboard Events: ${this.events.length} total (type: ${event.type}, key: ${event.key})`)

    // Keep array size manageable
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents + 1000) // Keep last 9000 events
      console.log(`🧹 Keyboard Events: Trimmed to ${this.events.length} events`)
    }
  }

  // Get currently pressed keys
  getPressedKeys(): string[] {
    return Array.from(this.keyStates.keys())
  }

  // Check if a specific key is currently pressed
  isKeyPressed(key: string): boolean {
    return this.keyStates.has(key)
  }

  getEvents(): KeyboardEvent[] {
    return [...this.events] // Return copy to prevent external modification
  }

  getEventCount(): number {
    return this.events.length
  }

  getStats(): KeyboardStats {
    const uniqueKeys = new Set(this.keyPressCount.keys())
    
    // Find most pressed key
    let mostPressedKey: { key: string; count: number } | null = null
    for (const [key, count] of this.keyPressCount.entries()) {
      if (!mostPressedKey || count > mostPressedKey.count) {
        mostPressedKey = { key, count }
      }
    }

    return {
      totalEvents: this.events.length,
      keyDownEvents: this.eventTypeCount.keyDown,
      keyUpEvents: this.eventTypeCount.keyUp,
      uniqueKeysPressed: uniqueKeys,
      mostPressedKey,
      modifierUsage: { ...this.modifierUsage }
    }
  }

  clearEvents(): void {
    this.events = []
    this.keyPressCount.clear()
    this.eventTypeCount = { keyDown: 0, keyUp: 0 }
    this.modifierUsage = { ctrl: 0, alt: 0, shift: 0, meta: 0 }
  }

  // Helper method to format key combinations
  static formatKeyCombination(event: KeyboardEvent): string {
    const parts: string[] = []

    if (event.modifiers.ctrl) parts.push('Ctrl')
    if (event.modifiers.alt) parts.push('Alt')
    if (event.modifiers.shift) parts.push('Shift')
    if (event.modifiers.meta) parts.push('Meta')

    parts.push(event.key)

    return parts.join('+')
  }
}

// Singleton instance
export const keyboardHandler = new KeyboardHandler()
