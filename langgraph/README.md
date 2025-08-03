# Multi-Agent Sticky System

A sophisticated 6-agent architecture implementation using LangGraph.js that recreates an intelligent, context-aware Sticky assistant.

## Architecture Overview

This system implements the following agent architecture:

### 1. **World Model Observer** (Non-LLM)
- **Role**: The Sensor
- **Responsibility**: Observes and records user environment state
- **Function**: Captures mouse/keyboard events, screenshots, and application context

### 2. **Intent Analysis Agent** (LLM-based)
- **Role**: The Interpreter  
- **Responsibility**: Transforms raw data into meaningful user intent
- **Function**: Analyzes event patterns to determine user state (frustrated, focused, idle, etc.)

### 3. **Personality Agent** (LLM-based)
- **Role**: The Emotional Core
- **Responsibility**: Maintains and updates Sticky's mood/personality
- **Function**: Determines HOW Sticky should react (helpful, mischievous, bored, etc.)

### 4. **Planner Agent** (LLM-based)
- **Role**: The Strategist
- **Responsibility**: Creates concrete action plans
- **Function**: Translates intent + mood into executable commands

### 5. **Conductor** (Graph Logic)
- **Role**: The Central Orchestrator
- **Responsibility**: Manages workflow between all agents
- **Function**: Routes data flow and coordinates execution

### 6. **Response Agent** (Non-LLM)
- **Role**: The Actuator
- **Responsibility**: Executes concrete actions on the user's system
- **Function**: Moves cursor, shows text, plays sounds, etc.

## Installation

1. Install dependencies:
```bash
cd langgraph
npm install
```

2. Set up environment variables:
```bash
export OPENAI_API_KEY="your-openai-api-key"
```

## Usage

### Run a Single Observation Cycle
```bash
npm run start:single
```

### Run Demo Mode (5 cycles)
```bash
npm run start:demo
```

### Run Continuous Monitoring
```bash
npm run start:continuous
```

### Development Mode
```bash
npm run start
```

## System Flow

1. **World Model Observer** starts monitoring user activity
2. **Intent Analysis** determines what the user is doing/feeling
3. **Personality Agent** updates Sticky's mood based on user state
4. **Planner** creates a concrete action plan
5. **Response Agent** executes each action in sequence
6. **Conductor** orchestrates the entire flow

## Example Output

```
🚀 Starting Multi-Agent Sticky System...
🔍 Starting World Model Observer session...
🧠 Analyzing user intent...
😊 Updating Sticky's personality...
📋 Creating action plan...
⚡ Executing action...
✅ Multi-agent workflow completed successfully!
```

## Available Actions

The Response Agent can execute these actions:

- `show_text` - Display text bubbles/tooltips  
- `play_sound` - Play audio clips
- `wait` - Pause execution
- `speak_text` - Text-to-speech
- `animate_sticky` - Animate Sticky character
- `show_tooltip` - Show informational tooltips
- `execute_shell_command` - Execute shell commands on the client machine
- `highlight_element` - Highlight UI elements
- `shake_window` - Shake the application window
- `change_cursor` - Change cursor appearance
- `show_notification` - Show system notifications

## Configuration

The system can be customized by modifying:

- **Personality moods** in `personalityAgent.ts`
- **Available actions** in `responseAgent.ts` 
- **Planning rules** in `plannerAgent.ts`
- **Intent analysis prompts** in `intentAnalysis.ts`

## Development

### Build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

### Test
```bash
npm run test
```

## Architecture Benefits

- **Modularity**: Each agent has a single, well-defined responsibility
- **Scalability**: New agents or actions can be easily added
- **Maintainability**: Clear separation of concerns
- **Testability**: Each agent can be tested independently
- **Extensibility**: LLM and non-LLM agents can be mixed and matched

## Future Enhancements

- Real OS-level event monitoring (currently simulated)
- Machine learning for personality adaptation
- Custom action plugins
- Multi-application awareness
- Voice interaction capabilities