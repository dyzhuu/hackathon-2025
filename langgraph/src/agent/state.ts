import { BaseMessage, BaseMessageLike } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

/**
 * Multi-Agent Sticky System State
 *
 * This state schema supports the 6-agent architecture:
 * 1. World Model Observer (captures user environment data)
 * 2. Intent Analysis (interprets user intent from raw data)
 * 3. Personality Agent (manages Sticky's mood/personality)
 * 4. Planner (creates action plans based on intent and mood)
 * 5. Conductor (orchestrates the workflow - implemented in graph logic)
 * 6. Response (executes actions)
 */

// Type definitions for the agent system
export interface WindowContext {
  processName: string | undefined;
  windowTitle: string | undefined;
  // windowGeometry?: { x: number; y: number; width: number; height: number };
}

export interface MouseEvent {
  timestamp: string;
  eventType: "move" | "click" | "scroll";
  position: { x: number; y: number };
  input?: string;
  numberOfClicks?: number;
  // scrollDelta?: { x: number; y: number };
}

export interface KeyboardEvent {
  timestamp: string;
  input: string;
}

export interface ObservationData {
  windowStartTime: string;
  windowEndTime: string;
  durationMs: number;
  screenshotUrl?: string;
  windowEvents: WindowContext[];
  mouseEvents: MouseEvent[];
  keyboardEvents: KeyboardEvent[];
}

export interface IntentAnalysis {
  userIntent: string;
  supportingEvidence?: {
    primarySignal: string;
    value: string;
  };
}

export interface PersonalityState {
  clipperMood: string;
}

export interface ActionCommand {
  actionName: string;
  parameters: Record<string, any>;
}

export interface ActionPlan {
  actionPlan: ActionCommand[];
}

export interface ActionResult {
  actionExecuted: string;
  status: "completed" | "failed" | "pending";
  error?: string;
}

// Main state annotation for the multi-agent system
export const StateAnnotation = Annotation.Root({
  // Legacy messages support for backward compatibility
  messages: Annotation<BaseMessage[], BaseMessageLike[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),

  // World Model Observer outputs
  observationData: Annotation<ObservationData | null>(),

  // Intent Analysis outputs
  intentAnalysis: Annotation<IntentAnalysis | null>(),

  // Personality Agent outputs
  personalityState: Annotation<PersonalityState | null>(),

  // Planner outputs
  actionPlan: Annotation<ActionPlan | null>(),

  // Response Agent outputs
  actionResults: Annotation<ActionResult[]>({
    reducer: (state: ActionResult[], update: ActionResult[]) => {
      return [...state, ...update];
    },
    default: () => [],
  }),

  // Current action index for plan execution
  currentActionIndex: Annotation<number>(),

  // System state and control
  systemActive: Annotation<boolean>(),

  // Error handling
  lastError: Annotation<string | null>(),
});
