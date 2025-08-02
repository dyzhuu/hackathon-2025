/**
 * Multi-Agent Clippy System - Main Entry Point
 *
 * This file exports all the components of the multi-agent system
 * and provides convenience functions for starting the system.
 */

import { configureObservationAPI } from "./graph.js";

// Export the main graph and utility functions
export {
  graph,
  runClippyObservationCycle,
  startContinuousMonitoring,
  configureObservationAPI,
  runWithObservationData,
} from "./graph.js";

// Export all agent classes for direct use if needed
export { IntentAnalysisAgent } from "./intentAnalysis.js";
export { PersonalityAgent } from "./personalityAgent.js";
export { PlannerAgent } from "./plannerAgent.js";
export { ResponseAgent } from "./responseAgent.js";

// Export state types and interfaces
export * from "./state.js";

// Convenience function to set up environment variables
export function setupEnvironment() {
  // Check for required environment variables
  const requiredVars = ["OPENAI_API_KEY"];
  const missing = requiredVars.filter((varName) => !process.env[varName]);

  configureObservationAPI({
    endpoint: "observation",
    apiKey: process.env.OBSERVATION_API_KEY,
    timeout: 10000,
  });

  if (missing.length > 0) {
    console.warn("⚠️  Missing environment variables:", missing.join(", "));
    console.warn("The system may not function properly without these.");
  }

  // Set default values if needed
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "development";
  }
}

// Initialize environment on import
setupEnvironment();
