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
  userIntent: z
    .string()
    .describe(
      "Clear description of what the user was doing and their likely emotional state.",
    ),
  supportingEvidence: z
    .object({
      primarySignal: z.string().describe("The image in the screenshotUrl"),
      value: z.string().describe("Quantitative measure supporting the signal"),
    })
    .optional(),
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

      // const humanMessage = new HumanMessage({
      //   content: [
      //     {
      //       type: "text",
      //       text: prompt,
      //     },
      //     {
      //       type: "image_url",
      //       image_url: `data:image/png;base64,${Buffer.from(observationData.screenshotUrl).toString("base64")}`,
      //     },
      //   ],
      // });

      // const imageData = await fetch(observationData.screenshotUrl).then((res) =>
      //   res.arrayBuffer(),
      // );
      // const base64Image = Buffer.from(imageData).toString("base64");

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

      console.log(
        "Intent Analysis Agent: Analyzed user intent -",
        response.userIntent,
      );

      return response;
    } catch (error) {
      console.error("Intent Analysis Agent: Error analyzing intent", error);

      // Fallback intent analysis
      return {
        userIntent: "Unable to determine intent - system error",
        supportingEvidence: {
          primarySignal: "error",
          value: "analysis_failed",
        },
      };
    }
  }

  /**
   * Build the analysis prompt based on observation data
   */
  private buildAnalysisPrompt(observationData: ObservationData): string {
    const stats = this.calculateEventStatistics(observationData);

    return `
Analyze the following user activity data and determine the user's intent and emotional state:

## Application Context
- Process: ${observationData.applicationContext.processName}
- Window: ${observationData.applicationContext.windowTitle}
- Duration: ${observationData.durationMs}ms (${(observationData.durationMs / 1000).toFixed(1)}s)

## Activity Statistics
- Mouse events: ${stats.mouseEventCount}
- Keyboard events: ${stats.keyboardEventCount}
- Mouse clicks: ${stats.clickCount}
- Average mouse velocity: ${stats.averageMouseVelocity.toFixed(2)} pixels/ms
- Key press rate: ${stats.keyPressRate.toFixed(2)} keys/second
- Time with no activity: ${stats.idleTimeMs}ms

## Detailed Events
Mouse events: ${JSON.stringify(observationData.mouseEvents.slice(0, 10))}${observationData.mouseEvents.length > 10 ? "..." : ""}
Keyboard events: ${JSON.stringify(observationData.keyboardEvents.slice(0, 10))}${observationData.keyboardEvents.length > 10 ? "..." : ""}

## Analysis Guidelines
Look for patterns that indicate:
- **Frustration**: High click rate, rapid mouse movements with direction changes, excessive backspace usage
- **Reading/Consumption**: Steady scrolling, minimal mouse movement, low interaction rate
- **Searching**: Text input followed by Enter or clicks, multiple rapid interactions
- **Idle**: Long periods with no events
- **Task-focused**: Consistent interaction patterns, keyboard shortcuts
- **Exploration**: Random mouse movements, varied click patterns

Provide a clear, human-readable assessment of what the user was doing and how they were feeling.
`;
  }

  /**
   * Calculate statistical metrics from event data
   */
  private calculateEventStatistics(observationData: ObservationData) {
    const mouseEvents = observationData.mouseEvents;
    const keyboardEvents = observationData.keyboardEvents;
    const duration = observationData.durationMs;

    // Mouse statistics
    const clickCount = mouseEvents.filter(
      (e) => e.eventType === "click",
    ).length;

    // Calculate mouse velocity
    let totalDistance = 0;
    let totalTime = 0;
    for (let i = 1; i < mouseEvents.length; i++) {
      const prev = mouseEvents[i - 1];
      const curr = mouseEvents[i];
      const distance = Math.sqrt(
        Math.pow(curr.position.x - prev.position.x, 2) +
          Math.pow(curr.position.y - prev.position.y, 2),
      );
      const time =
        new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
      totalDistance += distance;
      totalTime += time;
    }
    const averageMouseVelocity = totalTime > 0 ? totalDistance / totalTime : 0;

    // Keyboard statistics
    const keyPressCount = keyboardEvents.filter((e) => e.input !== "").length;
    const keyPressRate = duration > 0 ? (keyPressCount / duration) * 1000 : 0;

    // Calculate idle time (simplified)
    const allEvents = [
      ...mouseEvents.map((e) => new Date(e.timestamp).getTime()),
      ...keyboardEvents.map((e) => new Date(e.timestamp).getTime()),
    ].sort();

    let idleTime = 0;
    const idleThreshold = 2000; // 2 seconds
    for (let i = 1; i < allEvents.length; i++) {
      const gap = allEvents[i] - allEvents[i - 1];
      if (gap > idleThreshold) {
        idleTime += gap;
      }
    }

    return {
      mouseEventCount: mouseEvents.length,
      keyboardEventCount: keyboardEvents.length,
      clickCount,
      averageMouseVelocity,
      keyPressRate,
      idleTimeMs: idleTime,
    };
  }
}
