/**
 * Client Query Tools
 *
 * Tools that allow LangGraph agents to query the client during execution
 * for real-time information gathering and decision making.
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Configuration for client connection
const CLIENT_BASE_URL = process.env.CLIENT_BASE_URL || "http://localhost:3000";
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Tool for executing shell commands on the client machine
 */
export const executeShellTool = tool(
  async ({ command }) => {
    try {
      console.log(`🔧 Executing shell command on client: ${command}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
      );

      const response = await fetch(`${CLIENT_BASE_URL}/api/execute-shell`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ command }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      console.log(`✅ Shell command executed successfully:`, data);
      return {
        success: true,
        result: data.result,
        output: data.stdout || data.stderr || "",
        error: null,
      };
    } catch (error) {
      console.error(`❌ Error executing shell command:`, error);

      if (error instanceof Error && error.name === "AbortError") {
        return "Tool could not be called";
      }

      if (error instanceof TypeError && error.message.includes("fetch")) {
        return "Tool could not be called";
      }

      return {
        success: false,
        result: null,
        output: "",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
  {
    name: "execute_shell_command",
    description:
      "Execute a shell command on the client machine and get the output. Useful for checking system state, finding processes, etc.",
    schema: z.object({
      command: z.string().describe("The shell command to execute"),
    }),
  },
);

/**
 * Export all client tools as an array for easy use in agents
 */
export const clientTools = [executeShellTool];
