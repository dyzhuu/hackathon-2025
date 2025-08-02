/**
 * Intent Analysis Agent
 *
 * LLM-based agent that interprets raw observation data to determine user intent.
 * Transforms dense event data into meaningful insights about user behavior.
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { ObservationData, IntentAnalysis } from "./state.js";

// Zod schema for structured output
const IntentAnalysisSchema = z.object({
  primaryGoal: z
    .string()
    .describe(
      "What the user is fundamentally trying to achieve (their high-level objective)"
    ),
  currentActivity: z
    .string()
    .describe(
      "Specific description of what the user was doing in this moment"
    ),
  emotionalState: z
    .string()
    .describe(
      "User's emotional state in natural language (can be nuanced, e.g., 'cautiously exploring', 'confidently executing')"
    ),
  workflowStage: z
    .enum([
      "planning",
      "searching", 
      "executing",
      "reviewing",
      "problem-solving",
      "completing",
      "exploring"
    ])
    .describe("What stage of their workflow the user appears to be in"),
  currentChallenge: z
    .string()
    .optional()
    .describe("Any obstacles, difficulties, or friction the user is experiencing"),
  confidenceLevel: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence in this analysis (0-1)"),
  suggestedSupport: z
    .string()
    .optional()
    .describe("What kind of assistance would be most helpful to the user right now"),
  behavioralEvidence: z
    .array(z.string())
    .describe("Key behavioral observations that support this analysis (max 4 items)"),
});

export class IntentAnalysisAgent {
  private model: ChatGoogleGenerativeAI;

  constructor() {
    this.model = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-001",
      temperature: 0.1,
    });
  }

  /**
   * Analyze observation data to determine user intent
   */
  async analyzeIntent(
    observationData: ObservationData,
  ): Promise<IntentAnalysis> {
    try {
      const prompt = this.buildAnalysisPrompt(observationData);

      const structuredLLM = await this.model.withStructuredOutput(
        IntentAnalysisSchema,
        {
          name: "intentAnalysis",
        },
      );

      let response;

      if (!observationData.screenshotUrl) {
        response = await structuredLLM.invoke(prompt);
      } else {
        response = await structuredLLM.invoke([
          ["system", prompt],
          [
            "user",
            [
              {
                type: "image_url",
                // image_url: { url: `data:image/jpeg;base64,${base64Image}` },
                image_url: { url: observationData.screenshotUrl },
              },
            ],
          ],
        ]);
      }

      console.log("Intent Analysis Agent: Analyzed user intent -", response);

      return response;
    } catch (error) {
      console.error("Intent Analysis Agent: Error analyzing intent", error);

      // Fallback intent analysis
      return {
        primaryGoal: "Unable to determine user goal",
        currentActivity: "System error occurred during analysis",
        emotionalState: "unable to assess due to system error",
        workflowStage: "exploring" as const,
        currentChallenge: "System analysis failure",
        confidenceLevel: 0.1,
        suggestedSupport: "Technical support may be needed",
        behavioralEvidence: [
          "system_error",
          "insufficient_data",
          "analysis_failed",
        ],
      };
    }
  }

  /**
   * Build the analysis prompt based on observation data
   */
  private buildAnalysisPrompt(observationData: ObservationData): string {
    const insights = this.calculateBehavioralInsights(observationData);

    return `
<role>
You are an expert user behavior analyst specializing in understanding human intent and emotional states from digital interactions. Your goal is to provide nuanced, empathetic insights that capture the human story behind the data.
</role>

<context>
<session_overview>
<applications>
${observationData.windowEvents.map((e) => `• ${e.processName}: "${e.windowTitle}"`).join("\n")}
</applications>
<duration>${insights.durationSec} seconds</duration>
<screenshot_available>${observationData.screenshotUrl ? "Yes - analyze visual context" : "No"}</screenshot_available>
</session_overview>

<behavioral_data>
<interaction_metrics>
• Clicks: ${insights.clickCount} total (${insights.clickRate}/sec)
• Scrolls: ${insights.scrollCount} total (${insights.scrollRate}/sec) 
• Keystrokes: ${insights.keyPressCount} total (${insights.keyPressRate}/sec)
• Corrections: ${Math.round(insights.backspaceRatio * 100)}% of typing
</interaction_metrics>

<movement_patterns>
• Mouse distance: ${insights.totalMouseDistance} pixels
• Average velocity: ${insights.avgMouseVelocity} pixels/ms
• Direction changes: ${insights.directionalChanges}
• Movement variance: ${insights.mouseErraticness}
</movement_patterns>

<engagement_patterns>
• Active engagement: ${Math.round(insights.engagementRatio * 100)}% of session
• Idle time: ${Math.round(insights.idleTimeMs / 1000)} seconds
• Longest pause: ${Math.round(insights.maxIdlePeriodMs / 1000)} seconds
</engagement_patterns>

<pattern_flags>
${insights.isHighActivity ? "• High activity detected" : ""}
${insights.isReadingPattern ? "• Reading pattern (high scroll, low interaction)" : ""}
${insights.isTypingFocused ? "• Sustained typing focus" : ""}
${insights.isErratic ? "• Erratic mouse behavior" : ""}
${insights.isFrustrated ? "• Potential frustration indicators" : ""}
</pattern_flags>
</behavioral_data>
</context>

<analysis_instructions>
<primary_objectives>
1. **Understand the Human Story**: What is this person trying to accomplish? What matters to them in this moment?

2. **Assess Emotional Context**: How are they feeling about their progress? Are they confident, uncertain, frustrated, or in flow?

3. **Identify Workflow Stage**: Where are they in their journey? Beginning, middle, stuck, or completing something?

4. **Recognize Support Needs**: What would be most helpful to them right now?
</primary_objectives>

<analysis_approach>
<holistic_interpretation>
• Consider the APPLICATION CONTEXT - what kind of work is this?
• Look at INTERACTION PATTERNS - do they suggest confidence or uncertainty?
• Examine VISUAL CUES from screenshot if available
• Notice TEMPORAL PATTERNS - rushed, deliberate, exploratory?
• Identify FRICTION POINTS - where might they be struggling?
</holistic_interpretation>

<evidence_evaluation>
• Prioritize QUALITATIVE observations over raw metrics
• Look for COHERENT PATTERNS rather than isolated events  
• Consider INDIVIDUAL DIFFERENCES in interaction styles
• Account for CONTEXT-SPECIFIC behaviors (e.g., design work vs data entry)
• Distinguish between TEMPORARY states and persistent patterns
</evidence_evaluation>

<emotional_nuance>
Avoid simplistic emotional labels. Instead, capture nuanced states like:
• "Methodically working through a complex problem"
• "Confidently executing a familiar workflow" 
• "Cautiously exploring unfamiliar interface"
• "Persistently troubleshooting despite frustration"
• "Efficiently completing routine tasks"
</emotional_nuance>
</analysis_approach>

<output_requirements>
<primary_goal>
Identify their fundamental objective - what success looks like to them
</primary_goal>

<current_activity>  
Describe specifically what they were doing in this moment
</current_activity>

<emotional_state>
Provide nuanced emotional assessment in natural language
</emotional_state>

<workflow_stage>
Choose: planning | searching | executing | reviewing | problem-solving | completing | exploring
</workflow_stage>

<current_challenge>
If applicable, describe any obstacles or friction they're experiencing
</current_challenge>

<suggested_support>
What kind of assistance would be most valuable right now?
</suggested_support>

<behavioral_evidence>
List 3-4 key observations that support your analysis (focus on meaningful patterns, not raw numbers)
</behavioral_evidence>

<confidence_level>
Rate 0-1 based on data sufficiency and pattern clarity
</confidence_level>
</output_requirements>
</analysis_instructions>

<critical_reminders>
• Focus on UNDERSTANDING the person, not just categorizing behaviors
• Consider what would be HELPFUL to them, not just what they're doing  
• Look for the HUMAN STORY behind the interaction patterns
• Provide ACTIONABLE insights that could improve their experience
• Remember that people have different interaction styles - avoid normative judgments
</critical_reminders>
`;
  }

  /**
   * Calculate behavioral insights from event data
   */
  private calculateBehavioralInsights(observationData: ObservationData) {
    const mouseEvents = observationData.mouseEvents;
    const keyboardEvents = observationData.keyboardEvents;
    const duration = observationData.durationMs;

    // Basic counts
    const clickCount = mouseEvents.filter(
      (e) => e.eventType === "click",
    ).length;
    const scrollCount = mouseEvents.filter(
      (e) => e.eventType === "scroll",
    ).length;
    const moveCount = mouseEvents.filter((e) => e.eventType === "move").length;

    // Temporal analysis
    const durationSec = duration / 1000;
    const clickRate = durationSec > 0 ? clickCount / durationSec : 0;
    const scrollRate = durationSec > 0 ? scrollCount / durationSec : 0;

    // Mouse movement analysis
    let totalDistance = 0;
    let directionalChanges = 0;
    let maxVelocity = 0;
    const velocities: number[] = [];

    for (let i = 1; i < mouseEvents.length; i++) {
      const prev = mouseEvents[i - 1];
      const curr = mouseEvents[i];

      if (prev.eventType === "move" && curr.eventType === "move") {
        const distance = Math.sqrt(
          Math.pow(curr.position.x - prev.position.x, 2) +
            Math.pow(curr.position.y - prev.position.y, 2),
        );
        const timeDiff =
          new Date(curr.timestamp).getTime() -
          new Date(prev.timestamp).getTime();

        if (timeDiff > 0) {
          const velocity = distance / timeDiff;
          velocities.push(velocity);
          maxVelocity = Math.max(maxVelocity, velocity);
          totalDistance += distance;
        }

        // Detect direction changes (simplified)
        if (i > 1) {
          const prevPrev = mouseEvents[i - 2];
          if (prevPrev.eventType === "move") {
            const prevVector = {
              x: prev.position.x - prevPrev.position.x,
              y: prev.position.y - prevPrev.position.y,
            };
            const currVector = {
              x: curr.position.x - prev.position.x,
              y: curr.position.y - prev.position.y,
            };

            // Dot product to detect direction changes
            const dotProduct =
              prevVector.x * currVector.x + prevVector.y * currVector.y;
            if (dotProduct < 0) directionalChanges++;
          }
        }
      }
    }

    const avgVelocity =
      velocities.length > 0
        ? velocities.reduce((a, b) => a + b, 0) / velocities.length
        : 0;
    const velocityVariance =
      velocities.length > 0
        ? velocities.reduce((sum, v) => sum + Math.pow(v - avgVelocity, 2), 0) /
          velocities.length
        : 0;

    // Keyboard analysis
    const keyPressCount = keyboardEvents.filter((e) => e.input !== "").length;
    const keyPressRate = durationSec > 0 ? keyPressCount / durationSec : 0;
    const backspaceCount = keyboardEvents.filter(
      (e) => e.input.includes("Backspace") || e.input.includes("Delete"),
    ).length;
    const backspaceRatio =
      keyPressCount > 0 ? backspaceCount / keyPressCount : 0;

    // Idle time analysis
    const allEvents = [
      ...mouseEvents.map((e) => new Date(e.timestamp).getTime()),
      ...keyboardEvents.map((e) => new Date(e.timestamp).getTime()),
    ].sort();

    let idleTime = 0;
    let maxIdlePeriod = 0;
    const idleThreshold = 2000; // 2 seconds

    for (let i = 1; i < allEvents.length; i++) {
      const gap = allEvents[i] - allEvents[i - 1];
      if (gap > idleThreshold) {
        idleTime += gap;
        maxIdlePeriod = Math.max(maxIdlePeriod, gap);
      }
    }

    const engagementRatio = duration > 0 ? (duration - idleTime) / duration : 0;

    // Pattern recognition
    const isHighActivity = clickRate > 2 || keyPressRate > 3;
    const isErratic =
      velocityVariance > avgVelocity * 0.5 &&
      directionalChanges > moveCount * 0.1;
    const isReadingPattern =
      scrollRate > 0.5 && clickRate < 0.5 && keyPressRate < 1;
    const isTypingFocused =
      keyPressRate > 2 && clickRate < 1 && backspaceRatio < 0.2;
    const isFrustrated = backspaceRatio > 0.3 || (clickRate > 3 && isErratic);

    return {
      // Raw metrics
      totalEvents: mouseEvents.length + keyboardEvents.length,
      clickCount,
      scrollCount,
      moveCount,
      keyPressCount,

      // Rates (per second)
      clickRate: Math.round(clickRate * 100) / 100,
      scrollRate: Math.round(scrollRate * 100) / 100,
      keyPressRate: Math.round(keyPressRate * 100) / 100,

      // Mouse behavior
      avgMouseVelocity: Math.round(avgVelocity * 100) / 100,
      maxMouseVelocity: Math.round(maxVelocity * 100) / 100,
      mouseErraticness: Math.round(velocityVariance * 100) / 100,
      directionalChanges,
      totalMouseDistance: Math.round(totalDistance),

      // Keyboard behavior
      backspaceRatio: Math.round(backspaceRatio * 100) / 100,

      // Engagement
      idleTimeMs: idleTime,
      maxIdlePeriodMs: maxIdlePeriod,
      engagementRatio: Math.round(engagementRatio * 100) / 100,

      // Pattern flags
      isHighActivity,
      isErratic,
      isReadingPattern,
      isTypingFocused,
      isFrustrated,

      // Context
      durationSec: Math.round(durationSec * 10) / 10,
    };
  }
}
