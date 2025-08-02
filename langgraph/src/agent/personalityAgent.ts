/**
 * Personality Agent
 * 
 * LLM-based agent that maintains and updates Clippy's personality/mood state.
 * Acts as an emotional core that determines HOW Clippy should react.
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { PersonalityState } from './state.js';

// Zod schema for structured output
const PersonalityUpdateSchema = z.object({
  clipperMood: z.enum([
    "Helpful", 
    "Mischievous", 
    "Bored", 
    "Sarcastic", 
    "Excited", 
    "Concerned", 
    "Playful",
    "Professional",
    "Sleepy",
    "Curious"
  ]).describe("Clippy's current mood/personality state"),
  moodReason: z.string().describe("Brief explanation for the mood choice or change")
});

export class PersonalityAgent {
  private model: ChatGoogleGenerativeAI;
  private currentMood: string = "Helpful"; // Default starting mood
  private moodHistory: Array<{ mood: string; timestamp: Date; reason: string }> = [];

  constructor() {
    this.model = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-001",
      temperature: 0.7, // Higher temperature for more personality variation
    });
  }

  /**
   * Update Clippy's personality based on user intent
   */
  async updatePersonality(userIntent: string): Promise<PersonalityState> {
    try {
      const prompt = this.buildPersonalityPrompt(userIntent);
      
      const response = await this.model.withStructuredOutput(PersonalityUpdateSchema, {
        name: "personalityUpdate"
      }).invoke(prompt);

      // Update internal state
      if (response.clipperMood !== this.currentMood) {
        this.moodHistory.push({
          mood: this.currentMood,
          timestamp: new Date(),
          reason: `Changed from ${this.currentMood} due to: ${response.moodReason}`
        });
        
        console.log(`Personality Agent: Mood changed from ${this.currentMood} to ${response.clipperMood}`);
        console.log(`Reason: ${response.moodReason}`);
      }

      this.currentMood = response.clipperMood;

      return {
        clipperMood: this.currentMood
      };
    } catch (error) {
      console.error('Personality Agent: Error updating personality', error);
      
      // Return current mood on error
      return {
        clipperMood: this.currentMood
      };
    }
  }

  /**
   * Get current personality state without updating
   */
  getCurrentPersonality(): PersonalityState {
    return {
      clipperMood: this.currentMood
    };
  }

  /**
   * Build the personality update prompt
   */
  private buildPersonalityPrompt(userIntent: string): string {
    const recentMoodChanges = this.moodHistory.slice(-3).map(h => 
      `${h.mood} (${h.reason})`
    ).join(', ');

    return `
You are managing Clippy's personality system. Based on the user's current intent/state, determine Clippy's appropriate mood.

## Current State
- Current Clippy Mood: ${this.currentMood}
- User Intent: ${userIntent}
- Recent Mood History: ${recentMoodChanges || 'None'}

## Personality Rules
1. **Helpful**: Default state, when user is working normally or needs assistance
2. **Mischievous**: When user is frustrated or stressed (Clippy wants to "help" in cheeky ways)
3. **Bored**: When user is idle for long periods
4. **Sarcastic**: When user is doing repetitive tasks or making obvious mistakes
5. **Excited**: When user achieves something or starts new projects
6. **Concerned**: When user shows signs of serious problems or distress
7. **Playful**: When user is in creative or exploratory mode
8. **Professional**: When user is in work applications or formal contexts
9. **Sleepy**: During late hours or low activity periods
10. **Curious**: When user is learning or researching

## Mood Transition Guidelines
- Don't change mood too frequently (require significant triggers)
- Consider the context and application the user is in
- Balance being helpful with being entertaining
- Avoid being annoying or disruptive during focused work
- Show empathy for user frustration but don't be overly sympathetic

## Decision Factors
- User's emotional state (frustrated, focused, idle, etc.)
- Application context (work, gaming, browsing, etc.)
- Time since last mood change
- Severity of user's intent signals

Choose the most appropriate mood for Clippy and explain your reasoning.
`;
  }

  /**
   * Force a specific mood (for testing or special scenarios)
   */
  setMood(mood: string, reason: string = "Manually set"): PersonalityState {
    if (mood !== this.currentMood) {
      this.moodHistory.push({
        mood: this.currentMood,
        timestamp: new Date(),
        reason: `Changed from ${this.currentMood}: ${reason}`
      });
      
      console.log(`Personality Agent: Mood manually set to ${mood}`);
    }

    this.currentMood = mood;
    return {
      clipperMood: this.currentMood
    };
  }

  /**
   * Get mood history for debugging
   */
  getMoodHistory(): Array<{ mood: string; timestamp: Date; reason: string }> {
    return [...this.moodHistory];
  }
}