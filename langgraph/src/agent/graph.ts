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
      observationData: observationData as any,
      lastError: null as any
    };
  } catch (error) {
    console.error("Error in World Model Observer:", error);
    return {
      lastError: (error instanceof Error ? error.message : "Unknown error in observation") as any
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
    if (!state.observationData) {
      throw new Error("No observation data available for intent analysis");
    }
    
    const intentAnalysis = await intentAnalyzer.analyzeIntent(state.observationData);
    
    return {
      intentAnalysis: intentAnalysis as any,
      lastError: null as any
    };
  } catch (error) {
    console.error("Error in Intent Analysis:", error);
    return {
      lastError: (error instanceof Error ? error.message : "Unknown error in intent analysis") as any
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
    if (!state.intentAnalysis) {
      throw new Error("No intent analysis available for personality update");
    }
    
    const personalityState = await personalityAgent.updatePersonality(state.intentAnalysis.userIntent);
    
    return {
      personalityState: personalityState as any,
      lastError: null as any
    };
  } catch (error) {
    console.error("Error in Personality Agent:", error);
    return {
      lastError: (error instanceof Error ? error.message : "Unknown error in personality update") as any
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
    if (!state.intentAnalysis || !state.personalityState) {
      throw new Error("Missing intent analysis or personality state for planning");
    }
    
    const actionPlan = await plannerAgent.createPlan(
      state.intentAnalysis.userIntent,
      state.personalityState.clipperMood
    );
    
    // Validate the plan
    const validation = plannerAgent.validatePlan(actionPlan);
    if (!validation.valid) {
      throw new Error(`Invalid action plan: ${validation.errors.join(', ')}`);
    }
    
    return {
      actionPlan: actionPlan as any,
      currentActionIndex: 0 as any,
      lastError: null as any
    };
  } catch (error) {
    console.error("Error in Planner Agent:", error);
    return {
      lastError: (error instanceof Error ? error.message : "Unknown error in planning") as any
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
    if (!state.actionPlan || !state.actionPlan.actionPlan) {
      throw new Error("No action plan available for execution");
    }
    
    const currentIndex = state.currentActionIndex || 0;
    const actions = state.actionPlan.actionPlan;
    
    if (currentIndex >= actions.length) {
      throw new Error("Action index out of bounds");
    }
    
    const currentAction = actions[currentIndex];
    const result = await responseAgent.executeAction(currentAction);
    
    return {
      actionResults: [result] as any,
      currentActionIndex: (currentIndex + 1) as any,
      lastError: null as any
    };
  } catch (error) {
    console.error("Error in Response Agent:", error);
    return {
      lastError: (error instanceof Error ? error.message : "Unknown error in action execution") as any
    };
  }
};

/**
 * Routing function: Determines the next step in the workflow
 */
const routeFlow = (state: typeof StateAnnotation.State): string => {
  // Check for errors first
  if (state.lastError) {
    console.error("🚨 Workflow error:", state.lastError);
    return END;
  }
  
  // Route based on current state
  if (!state.observationData) {
    return "startObservation";
  }
  
  if (!state.intentAnalysis) {
    return "analyzeIntent";
  }
  
  if (!state.personalityState) {
    return "updatePersonality";
  }
  
  if (!state.actionPlan) {
    return "createPlan";
  }
  
  // Check if we have more actions to execute
  if (state.actionPlan && state.actionPlan.actionPlan) {
    const currentIndex = state.currentActionIndex || 0;
    if (currentIndex < state.actionPlan.actionPlan.length) {
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
    observationData: null as any,
    intentAnalysis: null as any,
    personalityState: null as any,
    actionPlan: null as any,
    currentActionIndex: 0 as any,
    actionResults: [] as any,
    lastError: null as any
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
    observationData: null,
    intentAnalysis: null,
    personalityState: null,
    actionPlan: null,
    actionResults: [],
    currentActionIndex: 0,
    systemActive: true,
    lastError: null
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
