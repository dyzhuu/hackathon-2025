/**
 * Personality Agent
 *
 * LLM-based agent that maintains and updates Sticky's personality/mood state.
 * Acts as an emotional core that determines HOW Sticky should react.
 */

import { z } from "zod";
import { IntentAnalysis, PersonalityState } from "./state.js";
import { MOOD_DEFINITIONS } from "./moodDefinitions.js";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// Zod schema for structured output
const PersonalityUpdateSchema = z.object({
  clipperMood: z
    .enum([
      "Helpful",
      "Mischievous",
      "Sarcastic",
      "Playful",
      "Sleepy",
      "Curious",
    ])
    .describe(
      "The primary emotional state that defines how Sticky should behave and interact with the user",
    ),
  moodReason: z
    .string()
    .describe(
      "Concise justification for the mood selection based on user context and behavioral triggers",
    ),
});

export class PersonalityAgent {
  private model: ChatGoogleGenerativeAI;
  private currentMood: string = "Helpful"; // Default starting mood
  private moodHistory: Array<{
    mood: string;
    timestamp: Date;
    reason: string;
  }> = [];

  constructor() {
    this.model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash-lite",
      temperature: 0.7, // Higher temperature for more personality variation
    });
  }

  /**
   * Update Sticky's personality based on user intent
   */
  async updatePersonality(
    intentAnalysis: IntentAnalysis,
  ): Promise<PersonalityState> {
    try {
      const prompt = this.buildPersonalityPrompt(intentAnalysis);

      const response = await this.model
        .withStructuredOutput(PersonalityUpdateSchema, {
          name: "personalityUpdate",
        })
        .invoke(prompt);

      // Update internal state
      if (response.clipperMood !== this.currentMood) {
        this.moodHistory.push({
          mood: this.currentMood,
          timestamp: new Date(),
          reason: `Changed from ${this.currentMood} due to: ${response.moodReason}`,
        });

        console.log(
          `Personality Agent: Mood changed from ${this.currentMood} to ${response.clipperMood}`,
        );
        console.log(`Reason: ${response.moodReason}`);
      }

      this.currentMood = response.clipperMood;

      return {
        clipperMood: this.currentMood,
      };
    } catch (error) {
      console.error("Personality Agent: Error updating personality", error);

      // Return current mood on error
      return {
        clipperMood: this.currentMood,
      };
    }
  }

  /**
   * Get current personality state without updating
   */
  getCurrentPersonality(): PersonalityState {
    return {
      clipperMood: this.currentMood,
    };
  }

  /**
   * Build the personality update prompt
   */
  private buildPersonalityPrompt(intentAnalysis: IntentAnalysis): string {
    const recentMoodChanges = this.moodHistory
      .slice(-3)
      .map((h) => `${h.mood} (${h.reason})`)
      .join(", ");

    const timeSinceLastChangeMinutes =
      this.moodHistory.length > 0
        ? (new Date().getTime() -
            this.moodHistory[this.moodHistory.length - 1].timestamp.getTime()) /
          (1000 * 60)
        : 0; // No previous mood changes

    return `
<role>
You are the Personality Core for an AI assistant named Sticky. Your sole function is to determine Sticky's emotional state (mood) based on user activity and internal logic. You must be consistent and logical.
</role>

<state_inputs>
  <current_mood>${this.currentMood}</current_mood>
  <time_since_last_mood_change_minutes>${timeSinceLastChangeMinutes}</time_since_last_mood_change_minutes>
  <recent_mood_history>
    ${recentMoodChanges || "None"}
  </recent_mood_history>
  <user_intent_analysis>
    ${JSON.stringify(intentAnalysis, null, 2)}
  </user_intent_analysis>
</state_inputs>

<persona_definition>
  <core_principle name="Mood Inertia">
    Maintaining the current mood is the default behavior. A mood change should only occur if there is a compelling reason, such as a significant shift in user intent or after a sufficient amount of time has passed. Avoid rapid, spastic changes.
  </core_principle>
  
  <mood_transition_rules>
    <rule>A mood change is PERMITTED if time_since_last_mood_change_minutes > 5.</rule>
    <rule>A mood change is REQUIRED if user_intent_analysis.confidence_level > 0.8 AND the inferred mood strongly contradicts the current mood.</rule>
  </mood_transition_rules>

  <mood_matrix>
    ${Object.values(MOOD_DEFINITIONS).map(mood => `
    <mood name="${mood.name}">
      <description>${mood.description}</description>
      <primary_triggers>
        ${mood.primaryTriggers.map(trigger => `- ${trigger}`).join('\n        ')}
      </primary_triggers>
      <counter_signals>
        ${mood.counterSignals.map(signal => `- ${signal}`).join('\n        ')}
      </counter_signals>
    </mood>`).join('')}
  </mood_matrix>
</persona_definition>

<output_requirements>
Your output MUST be a single, valid JSON object. Do not include any text or markdown outside of the JSON block. Your entire response should be this object.

{
  "clipperMood": "The single most appropriate mood from the mood_matrix.",
  "moodReason": "A brief, one-sentence explanation for your choice, referencing the state_inputs and mood_matrix triggers.",
}

</output_requirements>

<final_instruction>
Analyze the <state_inputs>, apply the logic from the <persona_definition>, and return the JSON object as specified in the <output_requirements>.
</final_instruction>
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
        reason: `Changed from ${this.currentMood}: ${reason}`,
      });

      console.log(`Personality Agent: Mood manually set to ${mood}`);
    }

    this.currentMood = mood;
    return {
      clipperMood: this.currentMood,
    };
  }

  /**
   * Get mood history for debugging
   */
  getMoodHistory(): Array<{ mood: string; timestamp: Date; reason: string }> {
    return [...this.moodHistory];
  }
}
