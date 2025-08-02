import { ObservationData } from '../handlers/EventManager';
import { client } from './client';

export async function getIntentActions({
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

  for await (const chunk of streamResponse) {
    console.log(`Receiving new event of type: ${chunk.event}...`);
    console.log(JSON.stringify(chunk.data));
  }
}
