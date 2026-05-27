import { Page } from 'playwright';
import { ElementSnapshot, FormSnapshot, StateChange } from '../utils/types';

/**
 * State Tracker Service
 *
 * Captures a point-in-time snapshot of every interactive field and panel
 * in the form DOM, then diffs two snapshots to detect state changes
 * (appeared, disappeared, enabled, disabled).
 */

// CSS selectors for containers that qualify as "panels" in enterprise forms
const PANEL_SELECTOR = [
  'section',
  'fieldset',
  '[role="group"]',
  '[role="tabpanel"]',
  '[role="region"]',
  'details',
  '[data-panel]',
  '[class*="panel"]',
  '[class*="Panel"]',
  '[class*="step"]',
  '[class*="Step"]',
  '[data-guidepanel]',
  '[class*="guidePanel"]',
  '[class*="guidePanelWrapper"]',
].join(', ');

// ─── Public API ───────────────────────────────────────────────────────────────

export async function captureSnapshot(page: Page): Promise<FormSnapshot> {
  return page.evaluate(
    ({ panelSel }: { panelSel: string }): ElementSnapshot[] => {
      const snapshots: ElementSnapshot[] = [];

      function isVisible(el: HTMLElement): boolean {
        const s = window.getComputedStyle(el);
        return (
          s.display !== 'none' &&
          s.visibility !== 'hidden' &&
          s.opacity !== '0' &&
          !el.hidden &&
          el.offsetParent !== null
        );
      }

      function labelOf(el: HTMLElement, idx: number): string {
        return (
          el.id ||
          (el as HTMLInputElement).name ||
          el.getAttribute('aria-label') ||
          el.getAttribute('data-name') ||
          `${el.tagName.toLowerCase()}[${idx}]`
        );
      }

      function selectorOf(el: HTMLElement, idx: number): string {
        if (el.id) return `#${el.id}`;
        const n = (el as HTMLInputElement).name;
        if (n) return `${el.tagName.toLowerCase()}[name="${n}"]`;
        return `${el.tagName.toLowerCase()}:nth-of-type(${idx + 1})`;
      }

      // — Fields ——————————————————————————————————————————————————————————————
      const fields = document.querySelectorAll<HTMLElement>(
        'input:not([type="hidden"]), textarea, select'
      );
      fields.forEach((el, i) => {
        snapshots.push({
          selector: selectorOf(el, i),
          label: labelOf(el, i),
          visible: isVisible(el),
          ariaHidden: el.getAttribute('aria-hidden') === 'true',
          htmlHidden: el.hidden,
          disabled: (el as HTMLInputElement).disabled ?? false,
          value: (el as HTMLInputElement).value ?? '',
          type: 'field',
        });
      });

      // — Panels ——————————————————————————————————————————————————————————————
      const panels = document.querySelectorAll<HTMLElement>(panelSel);
      panels.forEach((el, i) => {
        // Only track panels that actually contain interactive fields
        if (!el.querySelector('input, textarea, select')) return;

        snapshots.push({
          selector: selectorOf(el, i),
          label:
            el.getAttribute('aria-label') ||
            el.getAttribute('data-name') ||
            el.id ||
            `panel[${i}]`,
          visible: isVisible(el),
          ariaHidden: el.getAttribute('aria-hidden') === 'true',
          htmlHidden: el.hidden,
          disabled: false,
          value: '',
          type: 'panel',
        });
      });

      return snapshots;
    },
    { panelSel: PANEL_SELECTOR }
  );
}

/**
 * Compares two snapshots and returns the list of meaningful state changes.
 */
export function diffSnapshots(
  before: FormSnapshot,
  after: FormSnapshot
): StateChange[] {
  const changes: StateChange[] = [];
  const afterMap = new Map(after.map((s) => [s.selector, s]));
  const beforeSet = new Set(before.map((s) => s.selector));

  for (const b of before) {
    const a = afterMap.get(b.selector);
    if (!a) continue;

    if (b.visible !== a.visible) {
      changes.push({
        selector: b.selector,
        label: b.label,
        changeType: a.visible ? 'appeared' : 'disappeared',
        type: b.type,
      });
    }

    if (b.disabled !== a.disabled) {
      changes.push({
        selector: b.selector,
        label: b.label,
        changeType: a.disabled ? 'disabled' : 'enabled',
        type: b.type,
      });
    }
  }

  // Elements that appeared fresh in the after-snapshot
  for (const a of after) {
    if (!beforeSet.has(a.selector) && a.visible) {
      changes.push({
        selector: a.selector,
        label: a.label,
        changeType: 'appeared',
        type: a.type,
      });
    }
  }

  return changes;
}
