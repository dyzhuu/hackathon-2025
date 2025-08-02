// Test file to demonstrate the event handlers
import { eventManager } from './handlers/EventManager'

export async function testHandlers(): Promise<void> {
  console.log('Testing Event Handlers...')

  // Set up event listeners
  eventManager.on('activity-event', (event) => {
    console.log(`[${new Date().toISOString()}] ${event.category} event:`, {
      id: event.id,
      type: (event.event as any).type,
      timestamp: new Date(event.timestamp).toISOString()
    })
  })

  eventManager.on('error', (error) => {
    console.error('Handler error:', error)
  })

  // Start tracking
  await eventManager.start()
  console.log('Event tracking started!')

  // Get available monitors
  const monitors = eventManager.getMonitors()
  console.log('Available monitors:', monitors)

  // Take a screenshot after 3 seconds
  setTimeout(async () => {
    try {
      console.log('Taking screenshot...')
      const screenshot = await eventManager.captureScreenshot()
      console.log('Screenshot captured:', {
        monitorId: screenshot.monitorId,
        size: screenshot.imageData?.length || 0
      })
    } catch (error) {
      console.error('Screenshot failed:', error)
    }
  }, 3000)

  // Stop after 30 seconds
  setTimeout(() => {
    console.log('Stopping event tracking...')
    eventManager.stop()

    const stats = eventManager.getStats()
    console.log('Final statistics:', stats)

    process.exit(0)
  }, 30000)
}

// Run if called directly
if (require.main === module) {
  testHandlers().catch(console.error)
}
