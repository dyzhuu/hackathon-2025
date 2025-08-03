/**
 * Planner Agent
 *
 * LLM-based agent that creates concrete action plans for Sticky to execute.
 * Transforms high-level goals into step-by-step executable commands.
 */

import { z } from "zod";
import { ActionPlan, IntentAnalysis, ObservationData } from "./state.js";
import { getMoodTextGuidelines } from "./moodDefinitions.js";
import { clientTools } from "./tools/clientTools.js";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// Zod schema for action commands
const ActionCommandSchema = z.object({
  actionName: z
    .enum([
      "move_cursor",
      "show_text",
      "wait",
      "do_nothing",
      "execute_shell_command",
    ])
    .describe("The specific action to execute"),
  parameters: z
    .object({
      x: z.number().optional(),
      y: z.number().optional(),
      relative: z.boolean().optional(),
      text: z.string().optional(),
      durationMs: z.number().optional(),
      position: z.object({ x: z.number(), y: z.number() }).optional(),

      command: z.string().optional(),
    })
    .describe("Parameters needed for the action"),
});

const ActionPlanSchema = z.object({
  actionPlan: z
    .array(ActionCommandSchema)
    .describe("Ordered list of actions for Sticky to execute"),
  planDescription: z
    .string()
    .describe("Brief description of what this plan accomplishes"),
  mood: z.string().describe("The current mood of clippy"),
});

export class PlannerAgent {
  private model: ChatGoogleGenerativeAI;
  private toolEnabledModel: any;

  constructor() {
    this.model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash-lite",
      streaming: false,
      temperature: 0.3, // Some creativity but mostly deterministic
    });

    // Tool-enabled model for information gathering
    this.toolEnabledModel = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash-lite",
      streaming: false,
      temperature: 0.1, // Lower temperature for information gathering
    }).bindTools(clientTools);
  }

  /**
   * Gather additional information from client if needed for planning
   */
  async gatherClientInformation(
    intentAnalysis: IntentAnalysis,
    worldModel: ObservationData,
  ): Promise<string> {
    const shouldGatherInfo = this.shouldGatherInformation(
      intentAnalysis,
      worldModel,
    );

    if (!shouldGatherInfo) {
      return "No additional information needed.";
    }

    try {
      const gatheringPrompt = this.buildInformationGatheringPrompt(
        intentAnalysis,
        worldModel,
      );

      const response = await this.toolEnabledModel.invoke([
        { role: "user", content: gatheringPrompt },
      ]);

      // Process tool calls if any were made
      let gatheredInfo = "Information gathering completed.";

      if (response.tool_calls && response.tool_calls.length > 0) {
        const toolResults = [];

        for (const toolCall of response.tool_calls) {
          try {
            const tool = clientTools.find((t) => t.name === toolCall.name);
            if (tool) {
              console.log(
                `🔧 Executing tool: ${toolCall.name} with args:`,
                toolCall.args,
              );
              const result = await (tool as any).invoke(toolCall.args);
              toolResults.push(`${toolCall.name}: ${JSON.stringify(result)}`);
            } else {
              console.warn(`⚠️ Tool not found: ${toolCall.name}`);
              toolResults.push(`${toolCall.name}: Error - Tool not found`);
            }
          } catch (error) {
            console.error(`Error executing tool ${toolCall.name}:`, error);
            toolResults.push(
              `${toolCall.name}: Error - ${error instanceof Error ? error.message : "Unknown error"}`,
            );
          }
        }

        gatheredInfo = `Information gathered:\n${toolResults.join("\n")}`;
      }

      console.log("🔍 Client information gathered:", gatheredInfo);
      return gatheredInfo;
    } catch (error) {
      console.error("Error gathering client information:", error);
      return "Failed to gather additional information.";
    }
  }

  /**
   * Determine if we should gather additional information from the client
   */
  private shouldGatherInformation(
    intentAnalysis: IntentAnalysis,
    worldModel: ObservationData,
  ): boolean {
    // Gather info if user seems to be working with specific applications
    const hasApplicationContext = worldModel.windowEvents.some(
      (event) =>
        event.processName &&
        event.processName !== "Finder" &&
        event.processName !== "Desktop",
    );

    // Gather info for certain workflow stages
    const shouldGatherForWorkflow = [
      "problemsolving",
      "executing",
      "reviewing",
    ].includes(intentAnalysis.workflowStage);

    // Gather info if there's a specific challenge described
    const hasChallenge = !!intentAnalysis.challengeDescription;

    return hasApplicationContext || shouldGatherForWorkflow || hasChallenge;
  }

  /**
   * Build prompt for information gathering
   */
  private buildInformationGatheringPrompt(
    intentAnalysis: IntentAnalysis,
    worldModel: ObservationData,
  ): string {
    return `
You are helping Sticky understand the user's current system state to make better recommendations.

Current user context:
- Goal: ${intentAnalysis.primaryGoal}
- Activity: ${intentAnalysis.currentActivity}
- Stage: ${intentAnalysis.workflowStage}
- Challenge: ${intentAnalysis.challengeDescription || "None"}

Recent applications used:
${worldModel.windowEvents.map((event) => `- ${event.processName}: ${event.windowTitle}`).join("\n")}

Based on this context, you should gather information that would help Sticky make better recommendations.

## Available Tools:
1. **execute_shell_command**: Execute any shell command on the client machine
   - Use for: checking running processes, system resources, file operations
   - Example: "ps aux | grep PowerPoint" to check if PowerPoint is running

2. **query_processes**: Query running processes, optionally filtered by name
   - Use for: finding specific applications, checking process status
   - Example: query_processes with processName="PowerPoint"

## Examples:
- If the user was working with PowerPoint, check if PowerPoint is still running
- If they seem to be having issues, check system resources or error logs
- If they're working with specific files, check directory contents or file status

Be selective - only gather information that would actually help with planning. Use the most appropriate tool for each query.`;
  }

  /**
   * Create an action plan based on user intent and Sticky's mood
   */
  async createPlan(
    intentAnalysis: IntentAnalysis,
    clipperMood: string,
    worldModel: ObservationData,
  ): Promise<ActionPlan> {
    try {
      // First, gather additional information from the client if needed
      const gatheredInfo = await this.gatherClientInformation(
        intentAnalysis,
        worldModel,
      );

      const prompt = this.buildPlanningPrompt(
        intentAnalysis,
        clipperMood,
        worldModel,
        gatheredInfo,
      );

      const response = await this.model
        .withStructuredOutput(ActionPlanSchema, {
          name: "actionPlan",
        })
        .invoke(prompt);

      console.log(
        `Planner Agent: Created plan with ${response.actionPlan.length} actions`,
      );
      console.log(`Plan: ${response.planDescription}`);

      return {
        actionPlan: response.actionPlan,
      };
    } catch (error) {
      console.error("Planner Agent: Error creating plan", error);

      return {
        actionPlan: [],
      };
    }
  }

  /**
   * Build the planning prompt
   */
  private buildPlanningPrompt(
    intentAnalysis: IntentAnalysis,
    clipperMood: string,
    worldModel: ObservationData,
    gatheredInfo?: string,
  ): string {
    return `
You are Sticky's planning system. Create a specific, executable action plan based on the user's current state and Sticky's mood.

## Current Situation
<user_intent>
${JSON.stringify(intentAnalysis, null, 2)}
</user_intent>
<sticky_mood>
${clipperMood}
</sticky_mood>
<world_model>
${JSON.stringify(worldModel, null, 2)}
</world_model>

${
  gatheredInfo
    ? `## Additional Client Information
<gathered_info>
${gatheredInfo}
</gathered_info>

`
    : ""
}## Available Actions

1. **move_cursor**: Move the user's cursor
   - Parameters: {x: number, y: number, relative?: boolean}

2. **show_text**: Display text bubble/tooltip
   - Parameters: {text: string, durationMs?: number, position?: {x, y}}

3. **wait**: Pause execution
   - Parameters: {durationMs: number}

4. **do_nothing**: Do nothing and immediately return
   - Parameters: {} (no parameters required)

5. **execute_shell_command**: Execute a shell command on the client machine
   - Parameters: {command: string}
   - Example: Kill PowerPoint process, clear temp files, etc.

## Mood-Based Planning Guidelines

${getMoodTextGuidelines(clipperMood)}

## Planning Rules
1. Keep plans focused and not too long (2-5 actions typically)
2. Consider the user's current application context
3. Match the actions to the mood
4. **CRITICAL: When using show_text actions, ensure the text content EXACTLY matches the personality guidelines above**
5. Time actions appropriately with waits
6. End with a clear conclusion or call-to-action
7. **Use gathered client information to make specific, actionable recommendations**
8. **Only use client query actions if they provide immediate value to the user**
9. **If gathered info shows specific processes/issues, address them directly in your plan**

## Text Generation Requirements
- All show_text actions MUST use language that matches the current mood's communication style
- Reference the example text patterns provided in the mood guidelines
- Ensure tone, energy level, and personality traits are consistent
- Use appropriate humor, sass, helpfulness, or other mood-specific characteristics

Create a plan that matches Sticky's current mood while appropriately responding to the user's intent.
`;
  }

  /**
   * Validate an action plan before execution
   */
  validatePlan(plan: ActionPlan): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!plan.actionPlan || plan.actionPlan.length === 0) {
      errors.push("Plan is empty");
    }

    for (let i = 0; i < plan.actionPlan.length; i++) {
      const action = plan.actionPlan[i];

      if (!action.actionName) {
        errors.push(`Action ${i + 1}: Missing action name`);
      }

      if (!action.parameters) {
        errors.push(`Action ${i + 1}: Missing parameters`);
      }

      // Validate specific action parameters
      switch (action.actionName) {
        case "move_cursor":
          if (
            typeof action.parameters.x !== "number" ||
            typeof action.parameters.y !== "number"
          ) {
            errors.push(
              `Action ${i + 1}: move_cursor requires x and y coordinates`,
            );
          }
          break;

        case "show_text":
          if (typeof action.parameters.text !== "string") {
            errors.push(
              `Action ${i + 1}: ${action.actionName} requires text parameter`,
            );
          }
          break;

        case "wait":
          if (
            typeof action.parameters.durationMs !== "number" ||
            action.parameters.durationMs < 0
          ) {
            errors.push(`Action ${i + 1}: wait requires positive durationMs`);
          }
          break;

        case "execute_shell_command":
          if (typeof action.parameters.command !== "string") {
            errors.push(
              `Action ${i + 1}: execute_shell_command requires command parameter`,
            );
          }
          break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
