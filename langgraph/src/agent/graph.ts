/**
 * Multi-Agent Sticky System - Main Graph Implementation
 *
 * This implements the Conductor agent that orchestrates the 6-agent system:
 * START -> Intent Analysis -> Personality Agent -> Planner -> Response -> END
 *
 * The workflow starts with intent analysis receiving observationData from API/SDK calls,
 * then flows through personality updates, planning, and action execution.
 */

import { StateGraph, END, START } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { StateAnnotation } from "./state.js";
import { IntentAnalysisAgent } from "./intentAnalysis.js";
import { PersonalityAgent } from "./personalityAgent.js";
import { PlannerAgent } from "./plannerAgent.js";
import { ResponseAgent } from "./responseAgent.js";

// Initialize all agent instances
const intentAnalyzer = new IntentAnalysisAgent();
const personalityAgent = new PersonalityAgent();
const plannerAgent = new PlannerAgent();
const responseAgent = new ResponseAgent();

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

    const intentAnalysis = await intentAnalyzer.analyzeIntent(
      state.observationData,
    );

    return {
      intentAnalysis: intentAnalysis as any,
      lastError: null as any,
    };
  } catch (error) {
    console.error("Error in Intent Analysis:", error);
    return {
      lastError: (error instanceof Error
        ? error.message
        : "Unknown error in intent analysis") as any,
    };
  }
};

/**
 * Node 3: Update Sticky's personality based on user intent
 */
const updatePersonality = async (
  state: typeof StateAnnotation.State,
  _config: RunnableConfig,
): Promise<typeof StateAnnotation.Update> => {
  console.log("😊 Updating Sticky's personality...");

  try {
    if (!state.intentAnalysis) {
      throw new Error("No intent analysis available for personality update");
    }

    const personalityState = await personalityAgent.updatePersonality(
      state.intentAnalysis,
    );

    return {
      personalityState: personalityState as any,
      lastError: null as any,
    };
  } catch (error) {
    console.error("Error in Personality Agent:", error);
    return {
      lastError: (error instanceof Error
        ? error.message
        : "Unknown error in personality update") as any,
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
      throw new Error(
        "Missing intent analysis or personality state for planning",
      );
    }

    const actionPlan = await plannerAgent.createPlan(
      state.intentAnalysis,
      state.personalityState.clipperMood,
    );

    // Validate the plan
    const validation = plannerAgent.validatePlan(actionPlan);
    if (!validation.valid) {
      throw new Error(`Invalid action plan: ${validation.errors.join(", ")}`);
    }

    return {
      actionPlan: actionPlan as any,
      currentActionIndex: 0 as any,
      lastError: null as any,
    };
  } catch (error) {
    console.error("Error in Planner Agent:", error);
    return {
      lastError: (error instanceof Error
        ? error.message
        : "Unknown error in planning") as any,
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
      lastError: null as any,
    };
  } catch (error) {
    console.error("Error in Response Agent:", error);
    return {
      lastError: (error instanceof Error
        ? error.message
        : "Unknown error in action execution") as any,
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

  // Intent analysis completed, move to personality
  if (state.intentAnalysis && !state.personalityState) {
    return "updatePersonality";
  }

  // Personality updated, move to planning
  if (state.personalityState && !state.actionPlan) {
    return "createPlan";
  }

  // Plan created, check if we have more actions to execute
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
    lastError: null as any,
  };
};

// Create the main workflow graph
const builder = new StateGraph(StateAnnotation)
  // Add all agent nodes
  .addNode("analyzeIntent", analyzeIntent)
  .addNode("updatePersonality", updatePersonality)
  .addNode("createPlan", createPlan)
  .addNode("executeAction", executeAction)
  .addNode("resetWorkflow", resetWorkflow)

  // Start with intent analysis - this is the entry point
  .addEdge(START, "analyzeIntent")

  // Set up the flow with conditional routing
  .addConditionalEdges("analyzeIntent", routeFlow)
  .addConditionalEdges("updatePersonality", routeFlow)
  .addConditionalEdges("createPlan", routeFlow)
  .addConditionalEdges("executeAction", routeFlow);

export const graph = builder.compile();

graph.name = "Multi-Agent Sticky System";

/**
 * Run the system with provided observation data (useful for API endpoints)
 */
export async function runWithObservationData(
  observationData: (typeof StateAnnotation.State)["observationData"],
): Promise<typeof StateAnnotation.State> {
  console.log("🚀 Starting Multi-Agent Sticky System with provided data...");

  const initialState = {
    messages: [],
    observationData: observationData,
    intentAnalysis: null,
    personalityState: null,
    actionPlan: null,
    actionResults: [],
    currentActionIndex: 0,
    systemActive: true,
    lastError: null,
  } as any;

  const finalState = await graph.invoke(initialState);
  return finalState;
}

/**
 * Convenience function to run a complete observation cycle (fetches data from API)
 */
export async function runStickyObservationCycle(): Promise<
  typeof StateAnnotation.State
> {
  console.log("🚀 Starting Multi-Agent Sticky System...");

  const initialState = {
    messages: [],
    observationData: null,
    intentAnalysis: null,
    personalityState: null,
    actionPlan: null,
    actionResults: [],
    currentActionIndex: 0,
    systemActive: true,
    lastError: null,
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
      await runStickyObservationCycle();

      // Wait before next cycle (in production, this would be event-driven)
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      console.error("Error in continuous monitoring:", error);
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }
}
