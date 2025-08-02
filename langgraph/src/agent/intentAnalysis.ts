/**
 * Intent Analysis Agent
 *
 * LLM-based agent that interprets raw observation data to determine user intent.
 * Transforms dense event data into meaningful insights about user behavior.
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { ObservationData, IntentAnalysis } from "./state.js";

// Zod schema for structured JSON output - flattened for Gemini compatibility
const IntentAnalysisSchema = z.object({
  primaryGoal: z
    .string()
    .describe(
      "What the user is fundamentally trying to achieve (their high-level objective)",
    ),
  currentActivity: z
    .string()
    .describe("Specific description of what the user was doing in this moment"),
  workflowStage: z
    .enum([
      "searching",
      "executing",
      "reviewing",
      "problemsolving",
      "exploring",
      "idle",
      "consuming",
    ])
    .describe("What stage of their workflow the user appears to be in"),
  challengeDescription: z
    .string()
    .optional()
    .describe(
      "Description of any notable friction or complexity in the current activity, or null if none observed",
    ),
  confidenceLevel: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence in this analysis (0-1)"),
});

export class IntentAnalysisAgent {
  private model: ChatGoogleGenerativeAI;

  constructor() {
    this.model = new ChatGoogleGenerativeAI({
      // model: "gemini-2.0-flash-001",
      model: "gemini-2.5-pro",
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

      const structuredLLM = this.model.withStructuredOutput(
        IntentAnalysisSchema,
        {
          name: "intentAnalysis",
        },
      );

      let response: z.infer<typeof IntentAnalysisSchema>;

      if (!observationData.screenshotB64) {
        response = await structuredLLM.invoke(prompt);
      } else {
        response = await structuredLLM.invoke([
          ["system", prompt],
          [
            "user",
            [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${observationData.screenshotB64}`,
                },
                // image_url: { url: observationData.screenshotUrl },
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
        workflowStage: "exploring" as const,
        challengeDescription: "System analysis failure",
        confidenceLevel: 0.1,
      };
    }
  }

  /**
   * Build the analysis prompt based on observation data
   */
  private buildAnalysisPrompt(observationData: ObservationData): string {
    const insights = this.calculateEnhancedInsights(observationData);

    return `
<role>
You are an expert task analysis assistant that understands user workflows and provides contextual support. Focus on understanding what users are trying to accomplish and how to help them succeed.
</role>

<context>
<session_overview>
<applications>
${observationData.windowEvents.map((e) => `• ${e.processName}: "${e.windowTitle}"`).join("\n")}
</applications>
<duration>${insights.durationSec} seconds</duration>
<screenshot_available>${observationData.screenshotB64 ? "Yes - analyze visual context for task understanding" : "No"}</screenshot_available>
</session_overview>

<activity_context>
<interaction_summary>
• Total interactions: ${insights.totalEvents}
• Clicks: ${insights.clickCount} (${insights.clickRate}/sec)
• Typing: ${insights.keyPressCount} keystrokes (${insights.keyPressRate}/sec)
• Scrolling: ${insights.scrollCount} scrolls (${insights.scrollRate}/sec)
• Active engagement: ${Math.round(insights.engagementRatio * 100)}% of session
• Context switches: ${insights.contextSwitches} (${insights.switchRate}/min)
• Error/correction rate: ${Math.round(insights.correctionRatio * 100)}% of keystrokes
• Navigation keys: ${Math.round(insights.navigationRatio * 100)}% of keystrokes
${insights.hasExtendedPauses ? "• Contains extended pauses (5+ seconds)" : ""}
</interaction_summary>

<task_indicators>
• Click patterns: ${insights.clickCount > 10 ? "High interaction (navigation/selection heavy)" : insights.clickCount > 3 ? "Moderate interaction" : "Low interaction (reading/viewing focus)"}
• Typing patterns: ${insights.keyPressCount > 50 ? "Heavy text input (writing/coding/data entry)" : insights.keyPressCount > 10 ? "Some text input" : "Minimal typing"}
• Scroll behavior: ${insights.scrollCount > 10 ? "Extensive scrolling (reading/browsing)" : insights.scrollCount > 3 ? "Some scrolling" : "Minimal scrolling"}
• Work rhythm: ${insights.engagementRatio > 0.8 ? "Sustained focus" : insights.engagementRatio > 0.5 ? "Regular activity with breaks" : "Intermittent activity"}
• Context switching: ${insights.switchRate > 2 ? "High app switching (information gathering/multitasking)" : insights.switchRate > 0.5 ? "Some app switching" : "Focused on single context"}
• Error patterns: ${insights.correctionRatio > 0.15 ? "High correction rate (debugging/problem-solving)" : insights.correctionRatio > 0.05 ? "Some corrections" : "Clean input (confident execution)"}
• Navigation style: ${insights.navigationRatio > 0.2 ? "High navigation key use (reviewing/code navigation)" : insights.navigationRatio > 0.1 ? "Some navigation" : "Direct input focused"}
</task_indicators>
</activity_context>
</context>

<analysis_framework>
<task_understanding>
1. **Application Context Analysis**: What type of work does this application combination suggest?
   - Creative work (design, writing, media)
   - Technical work (coding, data analysis, system admin)
   - Research/learning (browsing, reading, note-taking)
   - Communication (email, messaging, meetings)
   - Business tasks (documents, spreadsheets, presentations)

2. **Workflow Pattern Recognition**: What stage of work does the activity pattern suggest?
   - **Searching**: Rapid navigation, multiple tabs/windows, scanning behavior
   - **Executing**: Sustained typing/clicking in primary work applications
   - **Reviewing**: Mix of reading and minor edits, checking multiple sources
   - **Problem-solving**: Back-and-forth patterns, testing/debugging behaviors, high correction rates
   - **Exploring**: Curious browsing, learning new tools/interfaces
   - **Idle**: Minimal activity, extended pauses, user not actively engaged
   - **Passive-Consumption**: Watching videos, reading without interaction, consuming content

3. **Context Pattern Recognition**: What patterns in the activity suggest about their current state?
   - Information seeking (searching, browsing, researching behavior)
   - Technical interaction (complex software use, troubleshooting patterns)
   - Decision points (comparing, evaluating, pausing between options)
   - Workflow transitions (switching contexts, changing tools or approaches)
</task_understanding>

<contextual_interpretation>
• **Application combinations** reveal task type and complexity
• **Interaction density** indicates focus level and task demands
• **Activity rhythm** suggests workflow stage and potential friction
• **Visual context** (if available) provides immediate task understanding
• **Duration and engagement** indicate task complexity and progress
</contextual_interpretation>

<context_understanding>
Focus analysis on:
1. **Current task state** - what stage of their work process are they in?
2. **Interaction patterns** - what do their behaviors reveal about their approach?
3. **Context switching** - how are they navigating between different tools or information?
4. **Activity rhythm** - what does the pace and flow suggest about their current state?
</context_understanding>
</analysis_framework>

<critical_guidelines>
• Analyze TASKS and WORKFLOWS, not personal traits or capabilities
• Use activity patterns to understand WHAT they're doing, not judge HOW well they're doing it
• Focus on CONTEXTUAL UNDERSTANDING rather than providing assistance
• Respect privacy - analyze only what's necessary for understanding user intent
• Avoid assumptions about user skill, experience, or personal characteristics
• Consider individual work styles as valid variations, not performance indicators
• Observe and understand patterns without making recommendations or suggestions
</critical_guidelines>
`;
  }

  /**
   * Calculate enhanced activity metrics for task understanding (not behavioral profiling)
   */
  private calculateEnhancedInsights(observationData: ObservationData) {
    const mouseData = observationData.mouseData;
    const keyboardEvents = observationData.keyboardEvents;
    const duration = observationData.durationMs;

    // Basic activity counts
    const mouseEvents = mouseData.events;
    const clickCount = mouseData.clickSummary.totalClicks;
    const scrollCount = mouseData.scrollSummary.scrollCount;
    const keyPressCount = keyboardEvents.filter((e) => e.input !== "").length;

    const durationSec = duration / 1000;
    const durationMin = durationSec / 60;

    // Calculate rates for task pattern recognition
    const clickRate =
      durationSec > 0 ? Math.round((clickCount / durationSec) * 100) / 100 : 0;
    const scrollRate =
      durationSec > 0 ? Math.round((scrollCount / durationSec) * 100) / 100 : 0;
    const keyPressRate =
      durationSec > 0
        ? Math.round((keyPressCount / durationSec) * 100) / 100
        : 0;

    // Context switching analysis - application changes
    const contextSwitches =
      observationData.windowEvents.length > 1
        ? observationData.windowEvents.length - 1
        : 0;
    const switchRate =
      durationMin > 0
        ? Math.round((contextSwitches / durationMin) * 100) / 100
        : 0;

    // Error/correction analysis - backspace and delete usage
    const correctionEvents = keyboardEvents.filter(
      (e) => e.input.includes("Backspace") || e.input.includes("Delete"),
    ).length;
    const correctionRatio =
      keyPressCount > 0 ? correctionEvents / keyPressCount : 0;

    // Navigation key analysis - arrow keys, page up/down, home/end
    const navigationEvents = keyboardEvents.filter(
      (e) =>
        e.input.includes("Arrow") ||
        e.input.includes("Page") ||
        e.input.includes("Home") ||
        e.input.includes("End") ||
        e.input.includes("Up") ||
        e.input.includes("Down") ||
        e.input.includes("Left") ||
        e.input.includes("Right"),
    ).length;
    const navigationRatio =
      keyPressCount > 0 ? navigationEvents / keyPressCount : 0;

    // Engagement analysis for workflow understanding
    const allEvents = [
      ...mouseEvents.map((e) => e.timestamp),
      ...keyboardEvents.map((e) => e.timestamp),
    ].sort((a, b) => a - b);

    let idleTime = 0;
    let maxIdlePeriod = 0;
    const idleThreshold = 5000; // 5 seconds - significant pauses

    for (let i = 1; i < allEvents.length; i++) {
      const gap = allEvents[i] - allEvents[i - 1];
      if (gap > idleThreshold) {
        idleTime += gap;
        maxIdlePeriod = Math.max(maxIdlePeriod, gap);
      }
    }

    const engagementRatio = duration > 0 ? (duration - idleTime) / duration : 0;
    const hasExtendedPauses = maxIdlePeriod > 5000;

    return {
      // Core activity metrics
      totalEvents: mouseEvents.length + keyboardEvents.length,
      clickCount,
      scrollCount,
      keyPressCount,

      // Rates for pattern recognition
      clickRate,
      scrollRate,
      keyPressRate,

      // Advanced indicators
      contextSwitches,
      switchRate,
      correctionRatio: Math.round(correctionRatio * 100) / 100,
      navigationRatio: Math.round(navigationRatio * 100) / 100,

      // Engagement for workflow understanding
      engagementRatio: Math.round(engagementRatio * 100) / 100,
      hasExtendedPauses,

      // Context
      durationSec: Math.round(durationSec * 10) / 10,
      durationMin: Math.round(durationMin * 100) / 100,
    };
  }
}
