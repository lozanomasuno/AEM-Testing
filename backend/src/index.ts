import express from 'express';
import cors from 'cors';
import { runTestController } from './controllers/test.controller';
import { runLogicTestController } from './controllers/logic-test.controller';

const app = express();
const PORT = process.env.PORT ?? 3001;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────
app.post('/api/run-test', runTestController);
app.post('/api/run-logic-test', runLogicTestController); // Sprint 2

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`AEM QA Backend running on http://localhost:${PORT}`);
});

export default app;
