/**
 * Multi-Agent Clippy System - Main Graph Implementation
 * 
 * This implements the Conductor agent that orchestrates the 6-agent system:
 * 1. World Model Observer -> 2. Intent Analysis -> 3. Personality Agent -> 
 * 4. Planner -> 5. Response (with Conductor managing the flow)
 */

import { StateGraph, END, START } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { StateAnnotation } from "./state.js";
import { WorldModelObserver } from "./worldObserver.js";
import { IntentAnalysisAgent } from "./intentAnalysis.js";
import { PersonalityAgent } from "./personalityAgent.js";
import { PlannerAgent } from "./plannerAgent.js";
import { ResponseAgent } from "./responseAgent.js";

// Initialize all agent instances
const worldObserver = new WorldModelObserver();
const intentAnalyzer = new IntentAnalysisAgent();
const personalityAgent = new PersonalityAgent();
const plannerAgent = new PlannerAgent();
const responseAgent = new ResponseAgent();

/**
 * Node 1: Start observation session
 * This simulates the World Model Observer starting to monitor user activity
 */
const startObservation = async (
  _state: typeof StateAnnotation.State,
  _config: RunnableConfig,
): Promise<typeof StateAnnotation.Update> => {
  console.log("🔍 Starting World Model Observer session...");
  
  try {
    // Get current window context (simulated)
    const windowContext = await WorldModelObserver.getCurrentWindowContext();
    
    // Start monitoring
    await worldObserver.startMonitoring(windowContext);
    
    // Simulate some user activity for demo purposes
    worldObserver.simulateUserActivity();
    
    // Let the simulation run for a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // End monitoring and get observation data
    const observationData = await worldObserver.endMonitoring();
    
    if (!observationData) {
      throw new Error("Failed to capture observation data");
    }
    
    return {
      observation_data: observationData as any,
      last_error: null as any
    };
  } catch (error) {
    console.error("Error in World Model Observer:", error);
    return {
      last_error: (error instanceof Error ? error.message : "Unknown error in observation") as any
    };
  }
};

/**
 * Node 2: Analyze user intent from observation data
 */
const analyzeIntent = async (
  state: typeof StateAnnotation.State,
  _config: RunnableConfig,
): Promise<typeof StateAnnotation.Update> => {
  console.log("🧠 Analyzing user intent...");
  
  try {
    if (!state.observation_data) {
      throw new Error("No observation data available for intent analysis");
    }
    
    const intentAnalysis = await intentAnalyzer.analyzeIntent(state.observation_data);
    
    return {
      intent_analysis: intentAnalysis as any,
      last_error: null as any
    };
  } catch (error) {
    console.error("Error in Intent Analysis:", error);
    return {
      last_error: (error instanceof Error ? error.message : "Unknown error in intent analysis") as any
    };
  }
};

/**
 * Node 3: Update Clippy's personality based on user intent
 */
const updatePersonality = async (
  state: typeof StateAnnotation.State,
  _config: RunnableConfig,
): Promise<typeof StateAnnotation.Update> => {
  console.log("😊 Updating Clippy's personality...");
  
  try {
    if (!state.intent_analysis) {
      throw new Error("No intent analysis available for personality update");
    }
    
    const personalityState = await personalityAgent.updatePersonality(state.intent_analysis.user_intent);
    
    return {
      personality_state: personalityState as any,
      last_error: null as any
    };
  } catch (error) {
    console.error("Error in Personality Agent:", error);
    return {
      last_error: (error instanceof Error ? error.message : "Unknown error in personality update") as any
    };
  }
};

/**
 * Node 4: Create action plan based on intent and personality
 */
const createPlan = async (
  state: typeof StateAnnotation.State,
  _config: RunnableConfig,
): Promise<typeof StateAnnotation.Update> => {
  console.log("📋 Creating action plan...");
  
  try {
    if (!state.intent_analysis || !state.personality_state) {
      throw new Error("Missing intent analysis or personality state for planning");
    }
    
    const actionPlan = await plannerAgent.createPlan(
      state.intent_analysis.user_intent,
      state.personality_state.clipper_mood
    );
    
    // Validate the plan
    const validation = plannerAgent.validatePlan(actionPlan);
    if (!validation.valid) {
      throw new Error(`Invalid action plan: ${validation.errors.join(', ')}`);
    }
    
    return {
      action_plan: actionPlan as any,
      current_action_index: 0 as any,
      last_error: null as any
    };
  } catch (error) {
    console.error("Error in Planner Agent:", error);
    return {
      last_error: (error instanceof Error ? error.message : "Unknown error in planning") as any
    };
  }
};

/**
 * Node 5: Execute a single action from the plan
 */
const executeAction = async (
  state: typeof StateAnnotation.State,
  _config: RunnableConfig,
): Promise<typeof StateAnnotation.Update> => {
  console.log("⚡ Executing action...");
  
  try {
    if (!state.action_plan || !state.action_plan.action_plan) {
      throw new Error("No action plan available for execution");
    }
    
    const currentIndex = state.current_action_index || 0;
    const actions = state.action_plan.action_plan;
    
    if (currentIndex >= actions.length) {
      throw new Error("Action index out of bounds");
    }
    
    const currentAction = actions[currentIndex];
    const result = await responseAgent.executeAction(currentAction);
    
    return {
      action_results: [result] as any,
      current_action_index: (currentIndex + 1) as any,
      last_error: null as any
    };
  } catch (error) {
    console.error("Error in Response Agent:", error);
    return {
      last_error: (error instanceof Error ? error.message : "Unknown error in action execution") as any
    };
  }
};

/**
 * Routing function: Determines the next step in the workflow
 */
const routeFlow = (state: typeof StateAnnotation.State): string => {
  // Check for errors first
  if (state.last_error) {
    console.error("🚨 Workflow error:", state.last_error);
    return END;
  }
  
  // Route based on current state
  if (!state.observation_data) {
    return "startObservation";
  }
  
  if (!state.intent_analysis) {
    return "analyzeIntent";
  }
  
  if (!state.personality_state) {
    return "updatePersonality";
  }
  
  if (!state.action_plan) {
    return "createPlan";
  }
  
  // Check if we have more actions to execute
  if (state.action_plan && state.action_plan.action_plan) {
    const currentIndex = state.current_action_index || 0;
    if (currentIndex < state.action_plan.action_plan.length) {
      return "executeAction";
    }
  }
  
  // All actions completed
  console.log("✅ Multi-agent workflow completed successfully!");
  return END;
};

/**
 * Reset workflow state for a new cycle
 */
const resetWorkflow = async (
  _state: typeof StateAnnotation.State,
  _config: RunnableConfig,
): Promise<typeof StateAnnotation.Update> => {
  console.log("🔄 Resetting workflow for new cycle...");
  
  return {
    observation_data: null as any,
    intent_analysis: null as any,
    personality_state: null as any,
    action_plan: null as any,
    current_action_index: 0 as any,
    action_results: [] as any,
    last_error: null as any
  };
};

// Create the main workflow graph
const builder = new StateGraph(StateAnnotation)
  // Add all agent nodes
  .addNode("startObservation", startObservation)
  .addNode("analyzeIntent", analyzeIntent)
  .addNode("updatePersonality", updatePersonality)
  .addNode("createPlan", createPlan)
  .addNode("executeAction", executeAction)
  .addNode("resetWorkflow", resetWorkflow)
  
  // Set up the flow with conditional routing
  .addEdge(START, "startObservation")
  .addConditionalEdges("startObservation", routeFlow)
  .addConditionalEdges("analyzeIntent", routeFlow)
  .addConditionalEdges("updatePersonality", routeFlow)
  .addConditionalEdges("createPlan", routeFlow)
  .addConditionalEdges("executeAction", routeFlow);

export const graph = builder.compile();

graph.name = "Multi-Agent Clippy System";

/**
 * Convenience function to run a complete observation cycle
 */
export async function runClippyObservationCycle(): Promise<typeof StateAnnotation.State> {
  console.log("🚀 Starting Multi-Agent Clippy System...");
  
  const initialState = {
    messages: [],
    observation_data: null,
    intent_analysis: null,
    personality_state: null,
    action_plan: null,
    action_results: [],
    current_action_index: 0,
    system_active: true,
    last_error: null
  } as any;
  
  const finalState = await graph.invoke(initialState);
  return finalState;
}

/**
 * Function to run continuous monitoring (for production use)
 */
export async function startContinuousMonitoring(): Promise<void> {
  console.log("🔄 Starting continuous monitoring mode...");
  
  while (true) {
    try {
      await runClippyObservationCycle();
      
      // Wait before next cycle (in production, this would be event-driven)
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.error("Error in continuous monitoring:", error);
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}
