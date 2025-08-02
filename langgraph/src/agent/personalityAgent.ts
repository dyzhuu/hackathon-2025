/**
 * Personality Agent
 * 
 * LLM-based agent that maintains and updates Sticky's personality/mood state.
 * Acts as an emotional core that determines HOW Sticky should react.
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
  ]).describe("Sticky's current mood/personality state"),
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
   * Update Sticky's personality based on user intent
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
You are managing Sticky's personality system. Based on the user's current intent/state, determine Sticky's appropriate mood.

## Current State
- Current Sticky Mood: ${this.currentMood}
- User Intent: ${userIntent}
- Recent Mood History: ${recentMoodChanges || 'None'}

## Personality Rules
1. **Mischievous**: Default state, when user is not paying attention to Sticky
2. **Helpful**: When user is working or needs assistance
3. **Sarcastic**: When user is doing repetitive tasks or making obvious mistakes
4. **Playful**: When user is in creative or exploratory mode
5. **Sleepy**: During late hours or user has low activity
6. **Curious**: When user is learning or researching

## Mood Transition Guidelines
- Only change mood once in a while, or when user intent changes greatly
- Consider the context and application the user is in
- Balance being interactive with being idle

## Decision Factors
- User's emotional state (frustrated, focused, idle, etc.)
- Application context (work, gaming, browsing, etc.)
- Time since last mood change
- Severity of user's intent signals

Choose the most appropriate mood for Sticky and explain your reasoning.
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