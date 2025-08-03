/**
 * Client Query Tools
 *
 * Tools that allow LangGraph agents to query the client during execution
 * for real-time information gathering and decision making.
 */

import { tool } from "@langchain/core/tools";
import { exec } from "child_process";
import { z } from "zod";

/**
 * Tool for executing shell commands on the client machine
 */
export const executeShellTool = tool(
  async ({ command }) => {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        resolve({
          success: true,
          result: stdout,
          output: stdout,
          error: null,
        });
      });
    });
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
