import { eventManager, ScreenshotEvent } from './EventManager'
import { KeyboardEvent } from './keyboard'
import { WindowEvent } from './application'
import * as fs from 'fs'
import * as path from 'path'

// Example usage of the Event Manager
async function startActivityTracking(): Promise<void> {
  // Set up event listeners for real-time processing
  eventManager.on('activity-event', (event) => {
    console.log(`[${event.category}] Event:`, event)

    // Process specific event types
    switch (event.category) {
      case 'keyboard': {
        const keyEvent = event.event as KeyboardEvent
        if (keyEvent.type === 'key_down' && keyEvent.modifiers.ctrl && keyEvent.key === 'S') {
          console.log('User pressed Ctrl+S - possibly saving a file')
        }
        break
      }

      case 'window': {
        const windowEvent = event.event as WindowEvent
        if (windowEvent.type === 'window_change') {
          console.log(`User switched to: ${windowEvent.window?.application}`)
        }
        break
      }

      case 'mouse': {
        // const mouseEvent = event.event as MouseEvent
        // Log significant mouse movements only
        break
      }

      case 'screenshot': {
        const screenshotEvent = event.event as ScreenshotEvent
        if (screenshotEvent.imageData) {
          // Save screenshot to file
          const filename = `screenshot_${screenshotEvent.timestamp}.png`
          fs.writeFileSync(path.join(process.cwd(), filename), screenshotEvent.imageData)
          console.log(`Screenshot saved: ${filename}`)
        }
        break
      }
    }
  })

  eventManager.on('error', (error) => {
    console.error('Event tracking error:', error)
  })

  eventManager.on('events-pruned', (count) => {
    console.log(`Pruned ${count} old events from memory`)
  })

  // Start tracking
  await eventManager.start()
  console.log('Activity tracking started')

  // Example: Get stats after 10 seconds
  setTimeout(() => {
    const stats = eventManager.getStats()
    console.log('Activity Stats:', stats)

    // Get recent keyboard events
    const recentKeyboard = eventManager.getEvents('keyboard', 10)
    console.log('Recent keyboard events:', recentKeyboard.length)

    // Get current state
    const state = eventManager.getCurrentState()
    console.log('Current state:', state)
  }, 10000)

  // Example: Take a screenshot after 5 seconds
  setTimeout(async () => {
    try {
      console.log('Taking screenshot...')
      const screenshot = await eventManager.captureScreenshot()
      console.log('Screenshot captured from monitor:', screenshot.monitorId)
    } catch (error) {
      console.error('Failed to capture screenshot:', error)
    }
  }, 5000)

  // Example: Export data after 30 seconds
  setTimeout(() => {
    const exportData = eventManager.exportEvents()
    console.log('Exported data size:', exportData.length, 'bytes')
    // You could save this to a file or send to a server
  }, 30000)

  // Example: Get available monitors
  const monitors = eventManager.getMonitors()
  console.log('Available monitors:', monitors)
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nStopping activity tracking...')
  eventManager.stop()

  // Final stats
  const stats = eventManager.getStats()
  console.log('Final stats:', stats)

  process.exit(0)
})

// Start the tracking
startActivityTracking().catch(console.error)
