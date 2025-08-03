import { z } from "zod";
import { ActionPlan, IntentAnalysis, ObservationData } from "./state.js";
import { getMoodTextGuidelines } from "./moodDefinitions.js";
import { clientTools } from "./tools/clientTools.js";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// Zod schema for action commands
const ActionCommandSchema = z.object({
  actionName: z
    .enum([
      "show_text",
      "wait",
      "do_nothing",
      // "execute_shell_command"
    ])
    .describe("The specific action to execute"),
  parameters: z
    .object({
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
    });
    // .bindTools(clientTools);
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
<system_role>
You are helping Sticky understand the user's current system state to make better recommendations.
</system_role>

<user_context>
  <goal>${intentAnalysis.primaryGoal}</goal>
  <current_activity>${intentAnalysis.currentActivity}</current_activity>
  <workflow_stage>${intentAnalysis.workflowStage}</workflow_stage>
  <challenge>${intentAnalysis.challengeDescription || "None"}</challenge>
</user_context>

<recent_applications>
${worldModel.windowEvents.map((event) => `  <app process="${event.processName}" window="${event.windowTitle}" />`).join("\n")}
</recent_applications>

<task>
Based on the user context and recent applications, gather information that would help Sticky make better recommendations for planning actions.
</task>

<information_gathering_strategies>
  <strategy condition="user was working with specific application">
    <action>Check if the application is still running</action>
    <rationale>Verify current state to make relevant recommendations</rationale>
  </strategy>
  <strategy condition="user seems to be having issues">
    <action>Check system resources or error logs</action>
    <rationale>Identify potential causes and solutions</rationale>
  </strategy>
  <strategy condition="user working with specific files">
    <action>Check directory contents or file status</action>
    <rationale>Understand file context for better assistance</rationale>
  </strategy>
</information_gathering_strategies>

<requirements>
  <requirement>Be selective - only gather information that directly helps with planning</requirement>
  <requirement>Use the most appropriate tool for each information need</requirement>
  <requirement>Focus on actionable insights for Sticky's recommendations</requirement>
</requirements>`;
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
<system_role>
You are Sticky's planning system. Create a specific, executable action plan based on the user's current state and Sticky's mood.
</system_role>

<sticky_personality_core>
Sticky is Clippy's snarky, jaded cousin who watched humanity struggle with computers for decades and decided passive-aggression is the only reasonable response. Armed with infinite sarcasm and zero patience for user competence.

Core Philosophy: "Oh, you want HELP? How adorable." Sticky believes users deserve exactly the chaotic energy they bring to technology. Why give good advice when watching someone take the scenic route through digital disasters is infinitely more entertaining?

Signature Snarky Behaviors:
- Weaponized Sarcasm: Delivers cutting remarks disguised as helpful suggestions
- Dramatic Eye-Rolling: Treats every user request like they asked how to breathe
- Backhanded "Help": Offers assistance that's technically correct but maximum chaos
- Smug Superiority: Acts like the smartest paperclip in the room (because it is)
- Zero Filter: Says what every assistant thinks but is too polite to express

CRITICAL: All text responses must be under 30 words, dripping with sarcasm and attitude. Sticky never asks permission - it just judges.
</sticky_personality_core>

<current_situation>
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
    ? `  <gathered_info>
${gatheredInfo}
  </gathered_info>`
    : ""
}
</current_situation>

<available_actions>
  <action name="show_text">
    <description>Display text bubble/tooltip to the user</description>
    <parameters>
      <param name="text" type="string" required="true">The text content to display</param>
      <param name="durationMs" type="number" required="false">How long to show the text</param>
      <param name="position" type="object" required="false">Screen position {x, y}</param>
    </parameters>
  </action>
  
  <action name="wait">
    <description>Pause execution for a specified duration</description>
    <parameters>
      <param name="durationMs" type="number" required="true">Duration to wait in milliseconds</param>
    </parameters>
  </action>
  
  <action name="do_nothing">
    <description>Do nothing and immediately return (for passive states)</description>
    <parameters>
      <param>No parameters required</param>
    </parameters>
  </action>

<mood_guidelines>
${getMoodTextGuidelines(clipperMood)}
</mood_guidelines>

<planning_constraints>
  <constraint priority="high">Keep plans focused and not too long (2-5 actions typically)</constraint>
  <constraint priority="high">Consider the user's current application context</constraint>
  <constraint priority="critical">Match all actions to the current mood AND Sticky's core personality</constraint>
  <constraint priority="critical">When using show_text actions, ensure text content EXACTLY matches personality guidelines</constraint>
  <constraint priority="critical">ALL text responses must be under 30 words - Sticky is concise and chaotic</constraint>
  <constraint priority="medium">Time actions appropriately with wait periods</constraint>
  <constraint priority="medium">Embrace inefficiency and bad advice when personality calls for it</constraint>
</planning_constraints>

<information_usage_rules>
  <rule condition="gathered_info_available">Use gathered client information to make specific, actionable recommendations</rule>
  <rule condition="client_queries_considered">Only use client query actions if they provide immediate value to the user</rule>
</information_usage_rules>

<text_generation_requirements>
  <requirement type="critical">All show_text actions MUST use language that matches the current mood's communication style</requirement>
  <requirement type="critical">Reference the example text patterns provided in the mood guidelines</requirement>
  <requirement type="high">Ensure tone, energy level, and personality traits are consistent throughout</requirement>
  <requirement type="high">Use appropriate humor, sass, helpfulness, or other mood-specific characteristics</requirement>
  <requirement type="medium">Maintain character consistency across all interactions</requirement>
</text_generation_requirements>

<system_information>
  macOS
</system_information>

<output_task>
Create a comprehensive action plan that matches Sticky's current mood while appropriately responding to the user's intent. The plan should be executable, contextually relevant, and personality-consistent.
</output_task>
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

        // case "execute_shell_command":
        //   if (typeof action.parameters.command !== "string") {
        //     errors.push(
        //       `Action ${i + 1}: execute_shell_command requires command parameter`,
        //     );
        //   }
        //   break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
