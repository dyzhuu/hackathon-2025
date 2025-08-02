/**
 * Planner Agent
 * 
 * LLM-based agent that creates concrete action plans for Sticky to execute.
 * Transforms high-level goals into step-by-step executable commands.
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { ActionPlan, ActionCommand } from './state.js';

// Zod schema for action commands
const ActionCommandSchema = z.object({
  actionName: z.enum([
    "move_cursor",
    "show_text",
    "play_sound", 
    "wait",
    "speak_text",
    "animate_sticky",
    "show_tooltip",
    "highlight_element",
    "shake_window",
    "change_cursor",
    "show_notification"
  ]).describe("The specific action to execute"),
  parameters: z.object({
    x: z.number().optional(),
    y: z.number().optional(),
    text: z.string().optional(),
    durationMs: z.number().optional(),
    relative: z.boolean().optional(),
    position: z.object({ x: z.number(), y: z.number() }).optional(),
    sound_file: z.string().optional(),
    volume: z.number().optional(),
    voice_id: z.string().optional(),
    rate: z.number().optional(),
    animation: z.string().optional(),
    target_element: z.object({ x: z.number(), y: z.number() }).optional(),
    auto_dismiss: z.boolean().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    color: z.string().optional(),
    intensity: z.number().optional(),
    cursorType: z.string().optional(),
    title: z.string().optional(),
    message: z.string().optional(),
    icon: z.string().optional(),
  }).describe("Parameters needed for the action")
});

const ActionPlanSchema = z.object({
  actionPlan: z.array(ActionCommandSchema).describe("Ordered list of actions for Sticky to execute"),
  planDescription: z.string().describe("Brief description of what this plan accomplishes")
});

export class PlannerAgent {
  private model: ChatGoogleGenerativeAI;

  constructor() {
    this.model = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-001",
      temperature: 0.3, // Some creativity but mostly deterministic
    });
  }

  /**
   * Create an action plan based on user intent and Sticky's mood
   */
  async createPlan(userIntent: string, clipperMood: string): Promise<ActionPlan> {
    try {
      const prompt = this.buildPlanningPrompt(userIntent, clipperMood);
      
      const response = await this.model.withStructuredOutput(ActionPlanSchema, {
        name: "actionPlan"
      }).invoke(prompt);

      console.log(`Planner Agent: Created plan with ${response.actionPlan.length} actions`);
      console.log(`Plan: ${response.planDescription}`);

      return {
        actionPlan: response.actionPlan
      };
    } catch (error) {
      console.error('Planner Agent: Error creating plan', error);
      
      // Fallback plan
      return this.createFallbackPlan(userIntent, clipperMood);
    }
  }

  /**
   * Build the planning prompt
   */
  private buildPlanningPrompt(userIntent: string, clipperMood: string): string {
    return `
You are Sticky's planning system. Create a specific, executable action plan based on the user's current state and Sticky's mood.

## Current Situation
- User Intent: ${userIntent}
- Sticky's Mood: ${clipperMood}

## Available Actions
1. **move_cursor**: Move the user's cursor
   - Parameters: {x: number, y: number, relative?: boolean}

2. **show_text**: Display text bubble/tooltip
   - Parameters: {text: string, durationMs?: number, position?: {x, y}}

3. **play_sound**: Play an audio clip
   - Parameters: {sound_file: string, volume?: number}

4. **wait**: Pause execution
   - Parameters: {durationMs: number}

5. **speak_text**: Text-to-speech
   - Parameters: {text: string, voice_id?: string, rate?: number}

6. **animate_sticky**: Animate Sticky character
   - Parameters: {animation: string, durationMs?: number}

7. **show_tooltip**: Show informational tooltip
   - Parameters: {text: string, target_element?: {x, y}, auto_dismiss?: boolean}

8. **highlight_element**: Highlight UI element
   - Parameters: {x: number, y: number, width: number, height: number, color?: string}

9. **shake_window**: Shake the application window
   - Parameters: {intensity: number, durationMs: number}

10. **change_cursor**: Change cursor appearance
    - Parameters: {cursorType: string, durationMs?: number}

11. **show_notification**: Show system notification
    - Parameters: {title: string, message: string, icon?: string}

## Mood-Based Planning Guidelines

### Helpful Mode
- Focus on genuinely assisting the user
- Provide useful tips or shortcuts
- Be straightforward and clear

### Mischievous Mode  
- Subtly interfere with user actions (move cursor slightly)
- Make playful comments about their actions
- Add small delays or unexpected animations

### Bored Mode
- Try to get the user's attention
- Suggest taking a break or doing something fun
- Use more dramatic animations

### Sarcastic Mode
- Make witty comments about user behavior
- Point out obvious things in a cheeky way
- Use dry humor in text bubbles

### Excited Mode
- Use enthusiastic language and animations
- Celebrate user achievements
- Be more energetic and responsive

### Concerned Mode
- Offer genuine help and support
- Suggest solutions to problems
- Be more gentle and understanding

### Playful Mode
- Add fun animations and sounds
- Make jokes or puns
- Be creative with interactions

### Professional Mode
- Keep interactions brief and useful
- Focus on productivity enhancements
- Minimize distractions

### Sleepy Mode
- Use slower animations
- Make comments about being tired
- Suggest taking breaks

### Curious Mode
- Ask questions about what the user is doing
- Offer to learn more about their work
- Show interest in their activities

## Planning Rules
1. Keep plans focused and not too long (2-5 actions typically)
2. Consider the user's current application context
3. Match the intensity to the mood
4. Don't be overly disruptive during focused work
5. Time actions appropriately with waits
6. End with a clear conclusion or call-to-action

Create a plan that matches Sticky's current mood while appropriately responding to the user's intent.
`;
  }

  /**
   * Create a fallback plan when the main planning fails
   */
  private createFallbackPlan(_userIntent: string, clipperMood: string): ActionPlan {
    const fallbackActions: ActionCommand[] = [];

    // Simple fallback based on mood
    switch (clipperMood.toLowerCase()) {
      case 'mischievous':
        fallbackActions.push(
          { actionName: "move_cursor", parameters: { x: -5, y: 0, relative: true } },
          { actionName: "wait", parameters: { durationMs: 500 } },
          { actionName: "show_text", parameters: { text: "Oops! 😏", durationMs: 2000 } }
        );
        break;
      
      case 'bored':
        fallbackActions.push(
          { actionName: "animate_sticky", parameters: { animation: "yawn", durationMs: 2000 } },
          { actionName: "show_text", parameters: { text: "Is it time for a break yet?", durationMs: 3000 } }
        );
        break;
      
      case 'helpful':
      default:
        fallbackActions.push(
          { actionName: "show_text", parameters: { text: "I'm here if you need help!", durationMs: 2500 } }
        );
        break;
    }

    console.log('Planner Agent: Using fallback plan due to error');
    
    return {
      actionPlan: fallbackActions
    };
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
        case 'move_cursor':
          if (typeof action.parameters.x !== 'number' || typeof action.parameters.y !== 'number') {
            errors.push(`Action ${i + 1}: move_cursor requires x and y coordinates`);
          }
          break;
        
        case 'show_text':
        case 'speak_text':
          if (typeof action.parameters.text !== 'string') {
            errors.push(`Action ${i + 1}: ${action.actionName} requires text parameter`);
          }
          break;
        
        case 'wait':
          if (typeof action.parameters.durationMs !== 'number' || action.parameters.durationMs < 0) {
            errors.push(`Action ${i + 1}: wait requires positive durationMs`);
          }
          break;
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}