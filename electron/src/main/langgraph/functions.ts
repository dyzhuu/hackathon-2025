import { ipcMain } from 'electron';
import { ObservationData } from '../handlers/EventManager';
import { client } from './client';

export async function getIntendedActions({
  observationData
}: {
  observationData: ObservationData;
}): Promise<void> {
  const streamResponse = client.runs.stream(
    null, // Threadless run
    'agent', // Assistant ID
    {
      input: {
        observationData
      },
      streamMode: 'messages-tuple'
    }
  );

  let res = '';

  for await (const chunk of streamResponse) {
    // console.log(`Receiving new event of type: ${chunk.event}...`);
    if (chunk.data[1]?.langgraph_node === 'createPlan') {
      res += chunk.data[0]?.content;
    }
  }

  const { actionPlan } = JSON.parse(res);

  for (const { actionName, parameters } of actionPlan) {
    if (actionName === 'wait') {
      await new Promise((resolve) => setTimeout(resolve, parameters.durationMs));
    } else {
      ipcMain.emit(actionName, parameters);
    }
  }

  console.log(JSON.parse(res));
}
