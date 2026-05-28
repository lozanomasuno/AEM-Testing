import { GeneratedTestCase, ScenarioType } from '../utils/types';

/**
 * Scenario Builder Service  (Sprint 3)
 *
 * Groups GeneratedTestCase[] into named scenarios and returns
 * a summary of what was built, plus the optimised flat list.
 *
 * Responsibilities:
 *   1. Group cases by ScenarioType for reporting
 *   2. Remove cases that are structurally redundant across fields
 *      (e.g. two "empty required" cases whose inputs are identical)
 *   3. Emit human-readable detail lines
 */

export interface ScenarioSummary {
  happy:       number;
  negative:    number;
  edge:        number;
  conditional: number;
  total:       number;
  details:     string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countByType(cases: GeneratedTestCase[], type: ScenarioType): number {
  return cases.filter((c) => c.scenario === type).length;
}

// Cross-field redundancy: if two cases for DIFFERENT fields share the same
// scenario + input + expectedOutcome they are structurally identical — keep one.
function removeCrossFieldRedundancy(cases: GeneratedTestCase[]): GeneratedTestCase[] {
  const seen = new Set<string>();
  return cases.filter((c) => {
    const key = `${c.scenario}|${c.input}|${c.expectedOutcome}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function buildScenarios(raw: GeneratedTestCase[]): {
  optimised: GeneratedTestCase[];
  summary:   ScenarioSummary;
} {
  const optimised = removeCrossFieldRedundancy(raw);

  const happy       = countByType(optimised, 'happy');
  const negative    = countByType(optimised, 'negative');
  const edge        = countByType(optimised, 'edge');
  const conditional = countByType(optimised, 'conditional');
  const total       = optimised.length;
  const removed     = raw.length - total;

  const details: string[] = [
    `✔ Scenario breakdown — Happy: ${happy} | Negative: ${negative} | Edge: ${edge} | Conditional: ${conditional}`,
    `✔ Total test cases after optimisation: ${total}`,
  ];

  if (removed > 0) {
    details.push(`✔ Removed ${removed} redundant duplicate case(s) across fields`);
  }

  // Surface a few representative cases per scenario type for the detail log
  const sampleSize = 3;
  (['happy', 'negative', 'edge'] as ScenarioType[]).forEach((type) => {
    const samples = optimised.filter((c) => c.scenario === type).slice(0, sampleSize);
    samples.forEach((c) => details.push(`  · ${c.description}`));
  });

  return {
    optimised,
    summary: { happy, negative, edge, conditional, total, details },
  };
}
