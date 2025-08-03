/**
 * Client Query Tools
 * 
 * Tools that allow LangGraph agents to query the client during execution
 * for real-time information gathering and decision making.
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';

// Configuration for client connection
const CLIENT_BASE_URL = process.env.CLIENT_BASE_URL || 'http://localhost:3000';

/**
 * Tool for executing shell commands on the client machine
 */
export const executeShellTool = tool(
  async ({ command, timeout = 10000 }) => {
    try {
      console.log(`🔧 Executing shell command on client: ${command}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(`${CLIENT_BASE_URL}/api/execute-shell`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ command }),
        signal: controller.signal
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
        output: data.output || '',
        error: null
      };
    } catch (error) {
      console.error(`❌ Error executing shell command:`, error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          result: null,
          output: '',
          error: `Request timeout after ${timeout}ms`
        };
      }
      
      return {
        success: false,
        result: null,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  {
    name: 'execute_shell_command',
    description: 'Execute a shell command on the client machine and get the output. Useful for checking system state, finding processes, etc.',
    schema: z.object({
      command: z.string().describe('The shell command to execute'),
      timeout: z.number().optional().default(10000).describe('Timeout in milliseconds (default: 10000)')
    })
  }
);

/**
 * Tool for querying system processes
 */
export const queryProcessesTool = tool(
  async ({ processName }) => {
    try {
      let command: string;
      
      if (process.platform === 'win32') {
        // Windows
        command = processName 
          ? `tasklist /FI "IMAGENAME eq ${processName}*" /FO CSV`
          : 'tasklist /FO CSV';
      } else {
        // macOS/Linux
        command = processName 
          ? `ps aux | grep -i "${processName}" | grep -v grep`
          : 'ps aux';
      }

      const result = await executeShellTool.invoke({ command });
      
      if (!result.success) {
        return result;
      }

      // Parse the output to extract process information
      let processes = [];
      if (result.output) {
        const lines = result.output.split('\n').filter((line: string) => line.trim());
        
        if (process.platform === 'win32') {
          // Parse Windows CSV output
          processes = lines.slice(1).map((line: string) => {
            const parts = line.split(',').map((part: string) => part.replace(/"/g, ''));
            return {
              name: parts[0] || '',
              pid: parts[1] || '',
              memory: parts[4] || ''
            };
          });
        } else {
          // Parse Unix-style output
          processes = lines.map((line: string) => {
            const parts = line.split(/\s+/);
            return {
              user: parts[0] || '',
              pid: parts[1] || '',
              cpu: parts[2] || '',
              memory: parts[3] || '',
              command: parts.slice(10).join(' ')
            };
          });
        }
      }

      return {
        success: true,
        result: `Found ${processes.length} processes`,
        processes,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        processes: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  {
    name: 'query_processes',
    description: 'Query running processes on the client machine. Can filter by process name.',
    schema: z.object({
      processName: z.string().optional().describe('Optional process name to filter by')
    })
  }
);

/**
 * Export all client tools as an array for easy use in agents
 */
export const clientTools = [
  executeShellTool,
  queryProcessesTool
];