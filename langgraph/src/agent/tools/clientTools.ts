import { tool } from "@langchain/core/tools";
import { exec } from "child_process";
import { z } from "zod";

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

export const clientTools = [executeShellTool];
