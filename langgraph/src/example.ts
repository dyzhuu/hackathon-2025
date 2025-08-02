/**
 * Example usage of the Multi-Agent Clippy System
 * 
 * This demonstrates how to use the complete 6-agent architecture.
 */

import { runClippyObservationCycle, startContinuousMonitoring } from './agent/index.js';

// Set up environment variables (you should set these in your actual environment)
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "your-openai-api-key-here";

async function runSingleCycle() {
  console.log("=".repeat(60));
  console.log("🤖 Running Single Observation Cycle");
  console.log("=".repeat(60));
  
  try {
    const result = await runClippyObservationCycle();
    
    console.log("\n📊 Final State Summary:");
    console.log("- Observation Data:", result.observation_data ? "✅ Captured" : "❌ Missing");
    console.log("- Intent Analysis:", result.intent_analysis ? `✅ ${result.intent_analysis.user_intent}` : "❌ Missing");
    console.log("- Personality State:", result.personality_state ? `✅ ${result.personality_state.clipper_mood}` : "❌ Missing");
    console.log("- Action Plan:", result.action_plan ? `✅ ${result.action_plan.action_plan.length} actions` : "❌ Missing");
    console.log("- Actions Executed:", result.action_results.length);
    console.log("- Errors:", result.last_error || "None");
    
    if (result.action_results.length > 0) {
      console.log("\n🎬 Actions Executed:");
      result.action_results.forEach((action, index) => {
        console.log(`  ${index + 1}. ${action.action_executed} - ${action.status}`);
        if (action.error) {
          console.log(`     Error: ${action.error}`);
        }
      });
    }
    
  } catch (error) {
    console.error("❌ Error running cycle:", error);
  }
}

async function runContinuousDemo() {
  console.log("=".repeat(60));
  console.log("🔄 Running Continuous Monitoring Demo (5 cycles)");
  console.log("=".repeat(60));
  
  for (let i = 1; i <= 5; i++) {
    console.log(`\n🔄 Cycle ${i}/5`);
    await runSingleCycle();
    
    if (i < 5) {
      console.log("\n⏳ Waiting 3 seconds before next cycle...");
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log("\n✅ Continuous monitoring demo completed!");
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'single';
  
  switch (mode) {
    case 'single':
      await runSingleCycle();
      break;
      
    case 'demo':
      await runContinuousDemo();
      break;
      
    case 'continuous':
      console.log("🚀 Starting continuous monitoring (Ctrl+C to stop)...");
      await startContinuousMonitoring();
      break;
      
    default:
      console.log("Usage: npm run start [mode]");
      console.log("Modes:");
      console.log("  single     - Run one observation cycle (default)");
      console.log("  demo       - Run 5 cycles with delays");
      console.log("  continuous - Run indefinitely");
      break;
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}