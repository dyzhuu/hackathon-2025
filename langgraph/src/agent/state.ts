import { BaseMessage, BaseMessageLike } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

/**
 * Multi-Agent Clippy System State
 * 
 * This state schema supports the 6-agent architecture:
 * 1. World Model Observer (captures user environment data)
 * 2. Intent Analysis (interprets user intent from raw data)
 * 3. Personality Agent (manages Clippy's mood/personality)
 * 4. Planner (creates action plans based on intent and mood)
 * 5. Conductor (orchestrates the workflow - implemented in graph logic)
 * 6. Response (executes actions)
 */

// Type definitions for the agent system
export interface WindowContext {
  process_name: string;
  window_title: string;
  window_geometry: { x: number; y: number; width: number; height: number };
}

export interface MouseEvent {
  timestamp: string;
  event_type: "move" | "click" | "scroll";
  position: { x: number; y: number };
  button?: string;
  scroll_delta?: { x: number; y: number };
}

export interface KeyboardEvent {
  timestamp: string;
  event_type: "key_down" | "key_up";
  key_name: string;
  modifiers: string[];
}

export interface ObservationData {
  window_start_time: string;
  window_end_time: string;
  duration_ms: number;
  application_context: WindowContext;
  screenshot_path: string;
  mouse_events: MouseEvent[];
  keyboard_events: KeyboardEvent[];
}

export interface IntentAnalysis {
  user_intent: string;
  supporting_evidence?: {
    primary_signal: string;
    value: string;
  };
}

export interface PersonalityState {
  clipper_mood: string;
}

export interface ActionCommand {
  action_name: string;
  parameters: Record<string, any>;
}

export interface ActionPlan {
  action_plan: ActionCommand[];
}

export interface ActionResult {
  action_executed: string;
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
  observation_data: Annotation<ObservationData | null>(),

  // Intent Analysis outputs
  intent_analysis: Annotation<IntentAnalysis | null>(),

  // Personality Agent outputs
  personality_state: Annotation<PersonalityState | null>(),

  // Planner outputs
  action_plan: Annotation<ActionPlan | null>(),

  // Response Agent outputs
  action_results: Annotation<ActionResult[]>({
    reducer: (state: ActionResult[], update: ActionResult[]) => {
      return [...state, ...update];
    },
    default: () => [],
  }),

  // Current action index for plan execution
  current_action_index: Annotation<number>(),

  // System state and control
  system_active: Annotation<boolean>(),

  // Error handling
  last_error: Annotation<string | null>(),
});
