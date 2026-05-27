import {
  ConditionalRule,
  FormSnapshot,
  InteractionResult,
  LogicTestReport,
} from '../utils/types';

/**
 * Conditional Validator Service
 *
 * Validates conditional behaviour using two sources of evidence:
 *
 * A) EXPLICIT RULES (from conditional-rule-detector):
 *    Check whether the target element changed state as the rule predicts
 *    when its trigger was interacted with.
 *
 * B) OBSERVED INTERACTIONS (from interaction-simulator):
 *    Report all observed state changes — surfaces hidden-panel detection,
 *    dynamic enable/disable, and multi-step logic without needing
 *    pre-declared rules.
 *
 * C) ANOMALY DETECTION:
 *    Flags required fields that disappeared after an interaction (always wrong).
 */
export function validateConditionalBehavior(
  rules: ConditionalRule[],
  interactions: InteractionResult[],
  initialSnapshot: FormSnapshot
): LogicTestReport {
  const details: string[] = [];
  let passed = 0;
  let failed = 0;
  let logicErrors = 0;

  // Index interactions by triggerSelector for fast lookup
  const interactionsByTrigger = new Map<string, InteractionResult[]>();
  for (const ir of interactions) {
    const list = interactionsByTrigger.get(ir.triggerSelector) ?? [];
    list.push(ir);
    interactionsByTrigger.set(ir.triggerSelector, list);
  }

  // ── A. Validate explicit rules ────────────────────────────────────────────
  if (rules.length === 0) {
    details.push(
      '⚠ No explicit conditional rules detected (aria-controls, data-condition, etc.).'
    );
    details.push(
      '⚠ Falling back to interaction-observation mode only.'
    );
  }

  for (const rule of rules) {
    const relatedInteractions = interactionsByTrigger.get(rule.triggerSelector) ?? [];

    // Find any interaction on this trigger that caused the target to change
    const matchingChange = relatedInteractions
      .flatMap((ir) => ir.stateChanges)
      .find(
        (sc) =>
          sc.selector === rule.targetSelector ||
          sc.label === rule.targetLabel
      );

    if (!matchingChange) {
      // Rule was declared but no state change was observed
      logicErrors++;
      details.push(
        `✖ Logic error: "${rule.targetLabel}" did not respond to interaction on "${rule.triggerLabel}" — expected ${rule.expectedAction} (rule source: ${rule.sourceAttribute})`
      );
    } else if (
      (rule.expectedAction === 'show' && matchingChange.changeType === 'appeared') ||
      (rule.expectedAction === 'hide' && matchingChange.changeType === 'disappeared')
    ) {
      passed++;
      details.push(
        `✔ Conditional rule passed: "${rule.targetLabel}" correctly ${rule.expectedAction}s when "${rule.triggerLabel}" is triggered`
      );
    } else {
      failed++;
      details.push(
        `✖ Conditional rule failed: "${rule.targetLabel}" expected to ${rule.expectedAction} but instead ${matchingChange.changeType} — trigger: "${rule.triggerLabel}"`
      );
    }
  }

  // ── B. Report all observed state changes ─────────────────────────────────
  if (interactions.length === 0) {
    details.push(
      '⚠ No enumerable controls found to simulate (no select, radio, or checkbox).'
    );
  }

  for (const ir of interactions) {
    if (ir.stateChanges.length === 0) continue;

    for (const sc of ir.stateChanges) {
      const emoji =
        sc.changeType === 'appeared' || sc.changeType === 'enabled' ? '✔' : '⚠';
      const typeLabel = sc.type === 'panel' ? 'Panel' : 'Field';

      details.push(
        `${emoji} Observed: ${typeLabel} "${sc.label}" ${sc.changeType} after setting "${ir.triggerLabel}" = "${ir.triggerValue}"`
      );

      // Count panels that appeared as passed (dynamic UI is working)
      if (sc.changeType === 'appeared' && sc.type === 'panel') {
        passed++;
      }
    }
  }

  // ── C. Anomaly detection ─────────────────────────────────────────────────
  const requiredFieldSelectors = new Set(
    initialSnapshot
      .filter((s) => s.type === 'field' && s.visible)
      .map((s) => s.selector)
  );

  for (const ir of interactions) {
    for (const sc of ir.stateChanges) {
      // A required field that was initially visible should NOT disappear
      if (
        sc.changeType === 'disappeared' &&
        sc.type === 'field' &&
        requiredFieldSelectors.has(sc.selector)
      ) {
        logicErrors++;
        details.push(
          `✖ Logic error: Field "${sc.label}" disappeared after interacting with "${ir.triggerLabel}" — was initially visible`
        );
      }
    }
  }

  // ── D. Hidden panels summary ─────────────────────────────────────────────
  const hiddenPanels = initialSnapshot.filter(
    (s) => s.type === 'panel' && !s.visible
  );

  if (hiddenPanels.length > 0) {
    details.push(
      `⚠ Found ${hiddenPanels.length} initially hidden panel(s): ${hiddenPanels.map((p) => `"${p.label}"`).join(', ')}`
    );

    // Check which hidden panels were revealed by interactions
    const revealedPanelSelectors = new Set(
      interactions
        .flatMap((ir) => ir.stateChanges)
        .filter((sc) => sc.changeType === 'appeared' && sc.type === 'panel')
        .map((sc) => sc.selector)
    );

    const unrevealed = hiddenPanels.filter(
      (p) => !revealedPanelSelectors.has(p.selector)
    );

    if (unrevealed.length > 0) {
      unrevealed.forEach((p) => {
        details.push(
          `⚠ Panel "${p.label}" remained hidden throughout all interactions — conditional trigger may not be covered by enumerable controls`
        );
      });
    }
  } else {
    passed++;
    details.push('✔ No hidden panels found at initial load.');
  }

  // Summary line at top
  const summary = `Summary — Passed: ${passed}, Failed: ${failed}, Logic errors: ${logicErrors}`;
  return {
    passed,
    failed,
    logicErrors,
    details: [summary, ...details],
  };
}
