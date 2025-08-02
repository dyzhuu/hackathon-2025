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

export class KeyboardHandler extends EventEmitter {
  private listener?: GlobalKeyboardListener
  private isTracking: boolean = false
  private keyStates: Map<string, boolean> = new Map()

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

  // Get currently pressed keys
  getPressedKeys(): string[] {
    return Array.from(this.keyStates.keys())
  }

  // Check if a specific key is currently pressed
  isKeyPressed(key: string): boolean {
    return this.keyStates.has(key)
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
