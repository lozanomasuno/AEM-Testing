import { Request, Response } from 'express';
import { chromium, Browser, Page } from 'playwright';
import { LogicTestRequest, LogicTestReport } from '../utils/types';
import { captureSnapshot } from '../services/state-tracker.service';
import { detectConditionalRules } from '../services/conditional-rule-detector.service';
import { simulateInteractions } from '../services/interaction-simulator.service';
import { validateConditionalBehavior } from '../services/conditional-validator.service';
import { buildLogicReport } from '../services/report.service';

/**
 * POST /api/run-logic-test
 *
 * Orchestrates the Sprint 2 pipeline:
 *   Open page → Capture initial state → Detect rules
 *   → Simulate interactions → Validate → Report
 *
 * A single Playwright browser is shared across all steps so
 * DOM state is continuous throughout the session.
 */
export async function runLogicTestController(
  req: Request,
  res: Response
): Promise<void> {
  const { url, options }: LogicTestRequest = req.body;

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'A valid "url" string is required.' });
    return;
  }

  if (!options?.conditional) {
    res.status(400).json({ error: '"options.conditional" must be true.' });
    return;
  }

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page: Page = await context.newPage();

    // Step 1 — Load the page
    // domcontentloaded: AEM Forms never reach networkidle due to long-poll XHRs
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(2_500);

    // Step 2 — Capture initial state (before any interaction)
    const initialSnapshot = await captureSnapshot(page);

    // Step 3 — Detect explicit conditional rules from the DOM
    const rules = await detectConditionalRules(page);

    // Step 4 — Simulate all enumerable interactions, capture state deltas
    const interactions = await simulateInteractions(page, initialSnapshot);

    // Step 5 — Validate rules + observations → produce report
    const rawReport: LogicTestReport = validateConditionalBehavior(
      rules,
      interactions,
      initialSnapshot
    );

    // Step 6 — Apply Human Readable Interpretation Layer
    res.json(buildLogicReport(rawReport));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      passed: 0,
      failed: 1,
      logicErrors: 0,
      details: [`✖ Engine error: ${message}`],
    } satisfies LogicTestReport);
  } finally {
    if (browser) await browser.close();
  }
}
