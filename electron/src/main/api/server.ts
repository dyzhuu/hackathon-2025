import express from 'express';

const app = express();
const port = 3000;

// Basic middleware
app.use(express.json());

// Simple health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Simple command endpoint
app.post('/api/execute-shell', (req, res) => {
  const { command } = req.body;
  console.log('Command received:', command);
  res.json({ result: 'command executed', command });
});

// Start server
export function startServer(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
      resolve();
    });

    server.on('error', reject);
  });
}
