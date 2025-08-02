import { eventManager } from './EventManager'
import { KeyboardEvent } from './keyboard'

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

      case 'mouse': {
        // const mouseEvent = event.event as MouseEvent
        // Log significant mouse movements only
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
  }, 10000)

  // Example: Export data after 30 seconds
  setTimeout(() => {
    const exportData = eventManager.exportEvents()
    console.log('Exported data size:', exportData.length, 'bytes')
    // You could save this to a file or send to a server
  }, 30000)
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
