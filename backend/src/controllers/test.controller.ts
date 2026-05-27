import { Request, Response } from 'express';
import { RunTestRequest, TestReport } from '../utils/types';
import { scanFormFields } from '../services/scanner.service';
import { runPlaywrightTests } from '../services/test-engine.service';
import { buildReport } from '../services/report.service';

/**
 * POST /api/run-test
 * Main controller: orchestrates scan → generate → test → report.
 */
export async function runTestController(
  req: Request,
  res: Response
): Promise<void> {
  const { url, options, dataMode }: RunTestRequest = req.body;

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'A valid "url" string is required.' });
    return;
  }

  try {
    // 1. Scan form fields from the live DOM
    const fields = await scanFormFields(url);

    if (fields.length === 0) {
      const emptyReport: TestReport = {
        passed: 0,
        failed: 0,
        warnings: 1,
        details: ['⚠ No form fields detected on the provided URL.'],
      };
      res.json(emptyReport);
      return;
    }

    // 2. Run Playwright-driven tests
    const rawReport = await runPlaywrightTests(
      url,
      fields,
      options ?? { regex: true, required: true, hidden: true },
      dataMode ?? 'valid'
    );

    // 3. Build and return the report
    const report = buildReport(rawReport);
    res.json(report);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      passed: 0,
      failed: 1,
      warnings: 0,
      details: [`✖ Engine error: ${message}`],
    });
  }
}
