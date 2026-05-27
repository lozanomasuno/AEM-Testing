import { TestReport } from '../utils/types';

/**
 * Report Service
 * Normalises and enriches the raw test report before sending
 * it to the frontend.
 */
export function buildReport(partial: TestReport): TestReport {
  const { passed, failed, warnings, details } = partial;

  // Ensure summary line is always at the top of details
  const summary = `Summary — Passed: ${passed}, Failed: ${failed}, Warnings: ${warnings}`;

  return {
    passed,
    failed,
    warnings,
    details: [summary, ...details],
  };
}
