// const { Client } = await import('@langchain/langgraph-sdk');
import { Client } from '@langchain/langgraph-sdk';

// only set the apiUrl if you changed the default port when calling langgraph dev
export const client = new Client({ apiUrl: 'http://localhost:2024' });
