import { Page } from 'playwright';
import { ConditionalRule } from '../utils/types';

/**
 * Conditional Rule Detector Service
 *
 * Scans the live DOM for explicit conditional relationships expressed through:
 * - aria-controls / aria-expanded
 * - data-condition / data-show-when / data-hide-when
 * - data-dependency (AEM Forms)
 * - details/summary native HTML5 disclosure
 * - Custom data attributes common in enterprise forms
 *
 * Returns ConditionalRule[] — each rule describes a trigger element, the
 * target it controls, and the expected show/hide action.
 */
export async function detectConditionalRules(page: Page): Promise<ConditionalRule[]> {
  return page.evaluate((): ConditionalRule[] => {
    const rules: ConditionalRule[] = [];

    function labelOf(el: Element, fallback: string): string {
      return (
        (el as HTMLElement).id ||
        (el as HTMLInputElement).name ||
        el.getAttribute('aria-label') ||
        el.getAttribute('data-name') ||
        fallback
      );
    }

    function selectorOf(el: Element): string {
      if ((el as HTMLElement).id) return `#${(el as HTMLElement).id}`;
      const n = (el as HTMLInputElement).name;
      if (n) return `${el.tagName.toLowerCase()}[name="${n}"]`;
      return el.tagName.toLowerCase();
    }

    // ── 1. aria-controls ──────────────────────────────────────────────────────
    // Buttons / inputs that declare what element they control
    document.querySelectorAll('[aria-controls]').forEach((trigger) => {
      const controlledId = trigger.getAttribute('aria-controls');
      if (!controlledId) return;

      const target = document.getElementById(controlledId);
      if (!target) return;

      const expanded = trigger.getAttribute('aria-expanded');
      rules.push({
        triggerSelector: selectorOf(trigger),
        triggerLabel: labelOf(trigger, 'aria-controls trigger'),
        targetSelector: `#${controlledId}`,
        targetLabel: labelOf(target, controlledId),
        expectedAction: expanded === 'false' ? 'show' : 'hide',
        sourceAttribute: 'aria-controls',
      });
    });

    // ── 2. data-condition / data-show-when / data-hide-when ──────────────────
    const conditionAttrs = ['data-condition', 'data-show-when', 'data-show-if'];
    conditionAttrs.forEach((attr) => {
      document.querySelectorAll(`[${attr}]`).forEach((target) => {
        const condition = target.getAttribute(attr);
        if (!condition) return;

        // Try to find a trigger whose id or name matches the condition key
        const [fieldRef] = condition.split(/[=:]/);
        const trigger =
          document.querySelector(`#${fieldRef.trim()}`) ||
          document.querySelector(`[name="${fieldRef.trim()}"]`);

        rules.push({
          triggerSelector: trigger ? selectorOf(trigger) : `[name="${fieldRef.trim()}"]`,
          triggerLabel: trigger ? labelOf(trigger, fieldRef.trim()) : fieldRef.trim(),
          targetSelector: selectorOf(target),
          targetLabel: labelOf(target, attr),
          expectedAction: attr.includes('hide') ? 'hide' : 'show',
          sourceAttribute: attr,
        });
      });
    });

    // ── 3. data-hide-when ────────────────────────────────────────────────────
    document.querySelectorAll('[data-hide-when]').forEach((target) => {
      const condition = target.getAttribute('data-hide-when');
      if (!condition) return;

      const [fieldRef] = condition.split(/[=:]/);
      const trigger =
        document.querySelector(`#${fieldRef.trim()}`) ||
        document.querySelector(`[name="${fieldRef.trim()}"]`);

      rules.push({
        triggerSelector: trigger ? selectorOf(trigger) : `[name="${fieldRef.trim()}"]`,
        triggerLabel: trigger ? labelOf(trigger, fieldRef.trim()) : fieldRef.trim(),
        targetSelector: selectorOf(target),
        targetLabel: labelOf(target, 'data-hide-when target'),
        expectedAction: 'hide',
        sourceAttribute: 'data-hide-when',
      });
    });

    // ── 4. HTML5 <details> / <summary> ──────────────────────────────────────
    document.querySelectorAll('details').forEach((details) => {
      const summary = details.querySelector('summary');
      if (!summary) return;

      rules.push({
        triggerSelector: selectorOf(summary),
        triggerLabel: summary.textContent?.trim() || 'summary',
        targetSelector: selectorOf(details),
        targetLabel: details.id || 'details panel',
        expectedAction: details.open ? 'hide' : 'show',
        sourceAttribute: 'details[open]',
      });
    });

    // ── 5. AEM Forms: data-dependency ────────────────────────────────────────
    document.querySelectorAll('[data-dependency]').forEach((target) => {
      const dep = target.getAttribute('data-dependency');
      if (!dep) return;

      const trigger =
        document.querySelector(`#${dep}`) ||
        document.querySelector(`[name="${dep}"]`);

      rules.push({
        triggerSelector: trigger ? selectorOf(trigger) : `[name="${dep}"]`,
        triggerLabel: trigger ? labelOf(trigger, dep) : dep,
        targetSelector: selectorOf(target),
        targetLabel: labelOf(target, 'data-dependency target'),
        expectedAction: 'show',
        sourceAttribute: 'data-dependency',
      });
    });

    // ── 6. aria-hidden elements that are siblings of interactive triggers ─────
    // Detect panels that start hidden via aria-hidden="true" — these are
    // conditional candidates even without explicit rule attributes
    document.querySelectorAll('[aria-hidden="true"]').forEach((target) => {
      const hasFields = target.querySelector('input, textarea, select') !== null;
      if (!hasFields) return;

      // Look for the nearest preceding sibling trigger (select / radio group)
      let sibling = target.previousElementSibling;
      while (sibling && !sibling.querySelector('select, input[type="radio"], input[type="checkbox"]')) {
        sibling = sibling.previousElementSibling;
      }

      if (sibling) {
        const trigger = sibling.querySelector<HTMLElement>('select, input[type="radio"], input[type="checkbox"]') ?? sibling as HTMLElement;
        rules.push({
          triggerSelector: selectorOf(trigger),
          triggerLabel: labelOf(trigger, 'sibling trigger'),
          targetSelector: selectorOf(target),
          targetLabel: labelOf(target as HTMLElement, 'aria-hidden panel'),
          expectedAction: 'show',
          sourceAttribute: 'aria-hidden (inferred)',
        });
      }
    });

    return rules;
  });
}
