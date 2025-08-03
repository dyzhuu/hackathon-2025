// Export the main graph and utility functions
export {
  graph,
  runStickyObservationCycle,
  startContinuousMonitoring,
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
