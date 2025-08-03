/**
 * Planner Agent
 *
 * LLM-based agent that creates concrete action plans for Sticky to execute.
 * Transforms high-level goals into step-by-step executable commands.
 */

import { z } from "zod";
import { ActionPlan, IntentAnalysis, ObservationData } from "./state.js";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// Zod schema for action commands
const ActionCommandSchema = z.object({
  actionName: z
    .enum(["move_cursor", "show_text", "wait", "animate_sticky", "do_nothing"])
    .describe("The specific action to execute"),
  parameters: z
    .object({
      x: z.number().optional(),
      y: z.number().optional(),
      relative: z.boolean().optional(),
      text: z.string().optional(),
      durationMs: z.number().optional(),
      position: z.object({ x: z.number(), y: z.number() }).optional(),
      animation: z.string().optional(),
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
});

export class PlannerAgent {
  private model: ChatGoogleGenerativeAI;

  constructor() {
    this.model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash-lite",
      temperature: 0.3, // Some creativity but mostly deterministic
    });
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
      const prompt = this.buildPlanningPrompt(
        intentAnalysis,
        clipperMood,
        worldModel,
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
  ): string {
    return `
You are Sticky's planning system. Create a specific, executable action plan based on the user's current state and Sticky's mood.

## Current Situation
- User Intent: ${JSON.stringify(intentAnalysis, null, 2)}
- Sticky's Mood: ${clipperMood}
- World Model: ${JSON.stringify(worldModel, null, 2)}

## Available Actions
1. **move_cursor**: Move the user's cursor
   - Parameters: {x: number, y: number, relative?: boolean}

2. **move_sticky**: Move to a given position
   - Parameters: {x: number, y: number}

3. **show_text**: Display text bubble/tooltip
   - Parameters: {text: string, durationMs?: number, position?: {x, y}}

4. **wait**: Pause execution
   - Parameters: {durationMs: number}

5. **animate_sticky**: Animate Sticky character
   - Parameters: {animation: string, durationMs?: number}

6. **do_nothing**: Do nothing and immediately return
   - Parameters: {} (no parameters required)
   

## Mood-Based Planning Guidelines

### Helpful Mood
- Focus on attempting to help the user
- Provide relevant but not useful tips
- Offer assistances that are counterproductive

### Mischievous Mood  
- Subtly interfere with user actions (e.g. move cursor slightly)
- Make devious comments about their actions
- Create minor inconveniences (e.g. block elements, closing windows)

### Sarcastic Mood
- Make witty comments about user behavior
- Point out obvious things in a cheeky way
- Use dry humor in text bubbles

### Playful Mood
- Use more animations and movements
- Make jokes or puns
- Be more energetic and creative

### Sleepy Mood
- Reduce movement and conversation
- Use slower idle animations
- Suggest taking a break or doing something fun

### Curious Mood
- Ask questions relevant to user activities
- Offer to learn more about their work
- Show interest and engagement to user's actions

## Planning Rules
1. Keep plans focused and not too long (2-5 actions typically)
2. Consider the user's current application context
3. Match the actions to the mood
5. Time actions appropriately with waits
6. End with a clear conclusion or call-to-action

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
        case "speak_text":
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
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
