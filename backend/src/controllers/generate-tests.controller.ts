import { Request, Response } from 'express';
import { chromium, Browser, Page } from 'playwright';
import { GenerateTestsRequest, AITestReport, ConditionalRule } from '../utils/types';
import { scanFormFields } from '../services/scanner.service';
import { inferSchema } from '../services/schema-inferencer.service';
import { generateTestCases } from '../services/ai-test-generator.service';
import { buildScenarios } from '../services/scenario-builder.service';
import { computeCoverage } from '../services/coverage-engine.service';
import { detectConditionalRules } from '../services/conditional-rule-detector.service';
import { translateDetails } from '../services/message-translator.service';

/**
 * POST /api/generate-tests  (Sprint 3)
 *
 * Pipeline:
 *   1. Scan DOM  (re-uses Scanner Service)
 *   2. Detect conditional rules  (re-uses Sprint 2 Conditional Rule Detector)
 *   3. Infer schema  (Schema Inferencer)
 *   4. Generate test cases  (AI Test Generator)
 *   5. Build & optimise scenarios  (Scenario Builder)
 *   6. Compute coverage  (Coverage Engine)
 *   7. Return AITestReport
 */
export async function generateTestsController(
  req: Request,
  res: Response,
): Promise<void> {
  const { url, options }: GenerateTestsRequest = req.body;

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'A valid "url" string is required.' });
    return;
  }

  if (!options?.aiGeneration) {
    res
      .status(400)
      .json({ error: '"options.aiGeneration" must be true to use this endpoint.' });
    return;
  }

  let browser: Browser | null = null;

  try {
    // ── Step 1 — Scan form fields via Scanner Service ────────────────────────
    const fields = await scanFormFields(url);

    if (fields.length === 0) {
      res.json(<AITestReport>{
        testsGenerated: 0,
        coverage:       0,
        edgeCases:      0,
        details:        ['⚠ No form fields detected at the given URL.'],
        tests:          [],
        coverageStats:  { coverage: 0, fieldsCovered: 0, totalFields: 0, rulesCovered: 0, totalRules: 0, missingScenarios: 0 },
      });
      return;
    }

    // ── Step 2 — Detect conditional rules (Sprint 2 engine) ─────────────────
    let rules: ConditionalRule[] = [];
    if (options.coverage) {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({ ignoreHTTPSErrors: true });
      const page: Page = await context.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.waitForTimeout(2_000);
      rules = await detectConditionalRules(page);
    }

    // ── Step 3 — Infer schema ────────────────────────────────────────────────
    const schema = inferSchema(fields);

    // ── Step 4 — Generate raw test cases ─────────────────────────────────────
    const rawCases = generateTestCases(schema);

    // ── Step 5 — Build & optimise scenarios ──────────────────────────────────
    const { optimised, summary } = buildScenarios(rawCases);

    // ── Step 6 — Compute coverage ─────────────────────────────────────────────
    const coverageStats = options.coverage
      ? computeCoverage(schema, optimised, rules)
      : { coverage: 0, fieldsCovered: 0, totalFields: fields.length, rulesCovered: 0, totalRules: 0, missingScenarios: 0 };

    // ── Step 7 — Assemble report ──────────────────────────────────────────────
    const edgeCases = optimised.filter((c) => c.scenario === 'edge').length;

    const details: string[] = [
      `✔ Scanned ${fields.length} field(s) — ${schema.filter((f) => f.visible).length} visible`,
      `✔ Inferred schema categories: ${[...new Set(schema.map((f) => f.category))].join(', ')}`,
      ...summary.details,
    ];

    if (options.coverage) {
      details.push(
        `📊 Coverage: ${coverageStats.coverage}%` +
        ` (${coverageStats.fieldsCovered}/${coverageStats.totalFields} fields` +
        (coverageStats.totalRules > 0
          ? `, ${coverageStats.rulesCovered}/${coverageStats.totalRules} rules`
          : '') +
        ')',
      );
      if (coverageStats.missingScenarios > 0) {
        details.push(`⚠ Missing scenarios: ${coverageStats.missingScenarios}`);
      }
    }

    const report: AITestReport = {
      testsGenerated: optimised.length,
      coverage:       coverageStats.coverage,
      edgeCases,
      details:        translateDetails(details), // Human Readable Layer
      tests:          optimised,
      coverageStats,
    };

    res.json(report);
  } catch (err: unknown) {
    console.error('[generate-tests] Error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Internal server error',
    });
  } finally {
    if (browser) await browser.close();
  }
}
