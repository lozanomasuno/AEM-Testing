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

// Root route — prevents "Cannot GET /" when opening localhost:3001 in a browser
app.get('/', (_req, res) => {
  res.json({
    name: 'AEM Forms QA Assistant — Backend',
    version: '2.0.0',
    endpoints: [
      'POST /api/run-test',
      'POST /api/run-logic-test',
      'GET  /api/health',
    ],
  });
});

// Chrome DevTools auto-probe — silences the CSP console warning
app.get('/.well-known/appspecific/com.chrome.devtools.json', (_req, res) => {
  res.json([]);
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`AEM QA Backend running on http://localhost:${PORT}`);
});

export default app;
