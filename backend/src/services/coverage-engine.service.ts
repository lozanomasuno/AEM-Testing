import { GeneratedTestCase, InferredField, ConditionalRule, CoverageStats } from '../utils/types';

/**
 * Coverage Engine Service  (Sprint 3)
 *
 * Measures how thoroughly the generated test suite covers the form:
 *
 *   fieldsCovered   – fields that have at least one test case
 *   rulesCovered    – conditional rules exercised by at least one trigger interaction
 *   missingScenarios – fields with no negative OR no edge case
 *   coverage        – weighted % score (field 60% + rules 40%)
 */

// ─── Field coverage ───────────────────────────────────────────────────────────

function computeFieldCoverage(
  fields: InferredField[],
  cases: GeneratedTestCase[],
): { covered: number; total: number } {
  const coveredSelectors = new Set(cases.map((c) => c.fieldSelector));
  const covered = fields.filter((f) => coveredSelectors.has(f.selector)).length;
  return { covered, total: fields.length };
}

// ─── Rule coverage ────────────────────────────────────────────────────────────

/**
 * A rule is considered "covered" when we have at least one test case
 * targeting the trigger field of that rule.
 */
function computeRuleCoverage(
  rules: ConditionalRule[],
  cases: GeneratedTestCase[],
): { covered: number; total: number } {
  if (rules.length === 0) return { covered: 0, total: 0 };

  const testedSelectors = new Set(cases.map((c) => c.fieldSelector));
  const covered = rules.filter((r) => testedSelectors.has(r.triggerSelector)).length;
  return { covered, total: rules.length };
}

// ─── Missing scenario detection ───────────────────────────────────────────────

function countMissingScenarios(
  fields: InferredField[],
  cases: GeneratedTestCase[],
): number {
  let missing = 0;

  for (const field of fields) {
    const fieldCases = cases.filter((c) => c.fieldSelector === field.selector);
    const hasNegative = fieldCases.some((c) => c.scenario === 'negative');
    const hasEdge     = fieldCases.some((c) => c.scenario === 'edge');

    if (!hasNegative) missing++;
    if (!hasEdge)     missing++;
  }

  return missing;
}

// ─── Weighted coverage score ──────────────────────────────────────────────────

function weightedScore(fieldPct: number, rulePct: number, hasRules: boolean): number {
  if (!hasRules) return Math.round(fieldPct);
  // Fields 60 %, rules 40 %
  return Math.round(fieldPct * 0.6 + rulePct * 0.4);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function computeCoverage(
  fields: InferredField[],
  cases: GeneratedTestCase[],
  rules: ConditionalRule[],
): CoverageStats {
  const fieldResult = computeFieldCoverage(fields, cases);
  const ruleResult  = computeRuleCoverage(rules, cases);
  const missing     = countMissingScenarios(fields, cases);

  const fieldPct = fieldResult.total > 0
    ? (fieldResult.covered / fieldResult.total) * 100
    : 100;

  const rulePct = ruleResult.total > 0
    ? (ruleResult.covered / ruleResult.total) * 100
    : 100;

  const coverage = weightedScore(fieldPct, rulePct, ruleResult.total > 0);

  return {
    coverage,
    fieldsCovered:    fieldResult.covered,
    totalFields:      fieldResult.total,
    rulesCovered:     ruleResult.covered,
    totalRules:       ruleResult.total,
    missingScenarios: missing,
  };
}
