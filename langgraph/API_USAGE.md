# Sticky Multi-Agent System - API Usage Guide

This guide explains how to use the updated Sticky Multi-Agent System with API-based observation data instead of local monitoring.

## Overview

The system has been updated to work with observation data provided via API instead of generating it locally. This allows for greater flexibility and integration with external data sources.

## Quick Start

### 1. Basic API Demo
```bash
npm run start api
# or
npm run start:api
```

### 2. Run API Examples
```bash
npm run start:api-examples
```

### 3. Test API System
```bash
npm run test:api
```

## API Configuration

### Configure External API Endpoint

```typescript
import { configureObservationAPI } from './agent/graph.js';

// Configure to fetch data from external API
configureObservationAPI({
  endpoint: 'https://your-api.com/observation-data',
  apiKey: 'your-api-key-here',
  timeout: 15000
});

// Run the system - it will fetch data from the configured API
const result = await runStickyObservationCycle();
```

### Use Provided Data

```typescript
import { runWithObservationData } from './agent/graph.js';

const observationData = {
  windowStartTime: '2024-01-15T10:30:00.000Z',
  windowEndTime: '2024-01-15T10:30:05.000Z',
  durationMs: 5000,
  applicationContext: {
    processName: 'vscode',
    windowTitle: 'Visual Studio Code - project.ts'
  },
  screenshotUrl: '/screenshots/vscode_2024-01-15_10-30-00.png',
  mouseEvents: [
    {
      timestamp: '2024-01-15T10:30:01.000Z',
      eventType: 'move',
      position: { x: 800, y: 400 }
    }
  ],
  keyboardEvents: [
    {
      timestamp: '2024-01-15T10:30:03.000Z',
      eventType: 'key_down',
      keyName: 'c',
      modifiers: ['cmd']
    }
  ]
};

const result = await runWithObservationData(observationData);
```

## Data Format

### ObservationData Interface

```typescript
interface ObservationData {
  windowStartTime: string;        // ISO timestamp
  windowEndTime: string;          // ISO timestamp  
  durationMs: number;             // Duration in milliseconds
  applicationContext: {
    processName: string;          // e.g., 'chrome', 'vscode'
    windowTitle: string;          // e.g., 'Google Chrome - Web Browser'
    windowGeometry?: {            // Optional window position/size
      x: number;
      y: number; 
      width: number;
      height: number;
    };
  };
  screenshotB64: string;         // A base64 encoded string of the current screenshot
  mouseEvents: MouseEvent[];      // Array of mouse events
  keyboardEvents: KeyboardEvent[]; // Array of keyboard events
}
```

### MouseEvent Interface

```typescript
interface MouseEvent {
  timestamp: string;              // ISO timestamp
  eventType: 'move' | 'click' | 'scroll';
  position: { x: number; y: number };
  button?: string;                // e.g., 'left', 'right'
  numberOfClicks?: number;        // For click events
}
```

### KeyboardEvent Interface

```typescript
interface KeyboardEvent {
  timestamp: string;              // ISO timestamp
  eventType: 'key_down' | 'key_up';
  keyName: string;                // e.g., 'a', 'Enter', 'Escape'
  modifiers: string[];            // e.g., ['ctrl', 'shift']
}
```

## API Integration Examples

### Express.js Server Endpoint

```typescript
import express from 'express';
import { runWithObservationData } from './agent/graph.js';
import { ObservationAPI } from './agent/observationAPI.js';

const app = express();
app.use(express.json());

const observationAPI = new ObservationAPI();

// POST endpoint to receive observation data and run analysis
app.post('/api/sticky/analyze', async (req, res) => {
  try {
    // Process the uploaded observation data
    const observationData = await observationAPI.processUploadedData(req.body);
    
    // Run the multi-agent system
    const result = await runWithObservationData(observationData);
    
    // Return the analysis results
    res.json({
      success: true,
      result: {
        intent: result.intentAnalysis,
        personality: result.personalityState,
        actions: result.actionResults
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(3000, () => {
  console.log('Sticky API server running on port 3000');
});
```

### Fetch from External API

```typescript
import { ObservationAPI } from './agent/observationAPI.js';

const observationAPI = new ObservationAPI({
  endpoint: 'https://your-monitoring-service.com/api/observations',
  apiKey: process.env.MONITORING_API_KEY,
  timeout: 10000
});

try {
  const observationData = await observationAPI.fetchObservationData();
  const result = await runWithObservationData(observationData);
  console.log('Analysis complete:', result);
} catch (error) {
  console.error('Error:', error);
}
```

### Upload Data to External Service

```typescript
import { ObservationAPI } from './agent/observationAPI.js';

const observationAPI = new ObservationAPI({
  endpoint: 'https://analytics-service.com/api/upload',
  apiKey: process.env.ANALYTICS_API_KEY
});

// Upload observation data for storage/analysis
await observationAPI.uploadObservationData(observationData);
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run start` | Run single observation cycle (fetches from API or uses mock data) |
| `npm run start api` | Run API demo with mock data |
| `npm run start:api` | Test API system |
| `npm run start:api-examples` | Run all API usage examples |
| `npm run test:api` | Test API functionality |

## Environment Variables

Set these environment variables for the system to work properly:

```bash
# Required for LLM agents
OPENAI_API_KEY=your-openai-api-key-here

# Optional: For external API integration
OBSERVATION_API_ENDPOINT=https://your-api.com/observations
OBSERVATION_API_KEY=your-api-key-here
```

## Error Handling

The system includes comprehensive error handling:

- **API Connection Errors**: Falls back to mock data if external API is unavailable
- **Data Validation Errors**: Validates all incoming observation data against expected schema
- **Processing Errors**: Graceful handling of LLM and agent processing errors

## Migration from Local Monitoring

If you were previously using the local `WorldModelObserver`, here's how to migrate:

### Before (Local Monitoring)
```typescript
import { runStickyObservationCycle } from './agent/graph.js';

// This would generate observation data locally
const result = await runStickyObservationCycle();
```

### After (API-based)
```typescript
import { runWithObservationData, configureObservationAPI } from './agent/graph.js';

// Option 1: Configure external API
configureObservationAPI({
  endpoint: 'https://your-api.com/observations',
  apiKey: 'your-key'
});
const result = await runStickyObservationCycle(); // Fetches from API

// Option 2: Provide data directly
const observationData = /* your data */;
const result = await runWithObservationData(observationData);
```

## Troubleshooting

### Common Issues

1. **"No API endpoint configured"**
   - Solution: Call `configureObservationAPI()` with your endpoint details

2. **"Invalid observation data: missing required field"**
   - Solution: Ensure your data matches the `ObservationData` interface exactly

3. **API timeout errors**
   - Solution: Increase timeout in configuration or check network connectivity

### Debug Mode

Enable debug logging:

```typescript
// Set environment variable
process.env.DEBUG = 'sticky:*';

// Or use console logging
console.log('Observation data:', observationData);
```

## Examples

See the `src/examples/` directory for complete working examples:

- `apiUsage.ts` - Comprehensive API usage examples
- `testAPI.ts` - Test runner for API functionality

Run examples:
```bash
npx tsx src/examples/apiUsage.ts
npx tsx src/examples/testAPI.ts
```
