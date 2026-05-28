import { LogicTestReport, TestReport } from '../utils/types';
import { translateDetails } from './message-translator.service';

/**
 * Report Service
 * Normalises and enriches the raw test report before sending
 * it to the frontend.
 * Sprint 3+: applies the Human Readable Interpretation Layer via
 * message-translator.service so all detail strings are business-friendly.
 */
export function buildReport(partial: TestReport): TestReport {
  const { passed, failed, warnings, details } = partial;

  const summary = `Summary — Passed: ${passed}, Failed: ${failed}, Warnings: ${warnings}`;
  const translated = translateDetails([summary, ...details]);

  return {
    passed,
    failed,
    warnings,
    details: translated,
  };
}

/**
 * Normalises a Sprint 2 LogicTestReport and applies the translation layer.
 */
export function buildLogicReport(partial: LogicTestReport): LogicTestReport {
  const { passed, failed, logicErrors, details } = partial;
  const translated = translateDetails(details);

  return {
    passed,
    failed,
    logicErrors,
    details: translated,
  };
}
