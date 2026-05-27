import express from 'express';
import cors from 'cors';
import { runTestController } from './controllers/test.controller';

const app = express();
const PORT = process.env.PORT ?? 3001;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────
app.post('/api/run-test', runTestController);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`AEM QA Backend running on http://localhost:${PORT}`);
});

export default app;
