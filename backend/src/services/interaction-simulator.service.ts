import { Page } from 'playwright';
import { FormSnapshot, InteractionResult } from '../utils/types';
import { captureSnapshot, diffSnapshots } from './state-tracker.service';

/**
 * Interaction Simulator Service
 *
 * Drives Playwright to interact with every enumerable form control
 * (select, radio, checkbox, and simple text inputs) and captures
 * which DOM elements change state after each interaction.
 *
 * Only controls with discrete/enumerable values are exercised — this
 * guarantees reliable conditional triggering without guessing text values.
 */

const WAIT_FOR_DOM_MS = 600; // time for JS rules to react

export interface SimulationPlan {
  selector: string;
  label: string;
  interactions: string[]; // values / actions to try
  kind: 'select' | 'radio' | 'checkbox';
}

// ─── Build a plan from the current DOM ───────────────────────────────────────

export async function buildSimulationPlan(page: Page): Promise<SimulationPlan[]> {
  return page.evaluate((): SimulationPlan[] => {
    const plans: SimulationPlan[] = [];

    function selectorOf(el: HTMLElement, idx: number): string {
      if (el.id) return `#${el.id}`;
      const n = (el as HTMLInputElement).name;
      if (n) return `${el.tagName.toLowerCase()}[name="${n}"]`;
      return `${el.tagName.toLowerCase()}:nth-of-type(${idx + 1})`;
    }

    function labelOf(el: HTMLElement, idx: number): string {
      return (
        el.id ||
        (el as HTMLInputElement).name ||
        el.getAttribute('aria-label') ||
        `${el.tagName.toLowerCase()}[${idx}]`
      );
    }

    function isVisible(el: HTMLElement): boolean {
      const s = window.getComputedStyle(el);
      return (
        s.display !== 'none' &&
        s.visibility !== 'hidden' &&
        !el.hidden &&
        el.offsetParent !== null
      );
    }

    // — Selects ———————————————————————————————————————————————————————————————
    document.querySelectorAll<HTMLSelectElement>('select').forEach((el, i) => {
      if (!isVisible(el)) return;
      const options = Array.from(el.options)
        .slice(0, 6) // cap at 6 to avoid excessive iterations
        .map((o) => o.value)
        .filter(Boolean);

      if (options.length > 0) {
        plans.push({
          selector: selectorOf(el, i),
          label: labelOf(el, i),
          interactions: options,
          kind: 'select',
        });
      }
    });

    // — Radio buttons (by name group) ─────────────────────────────────────────
    const radioGroups = new Map<string, HTMLInputElement[]>();
    document
      .querySelectorAll<HTMLInputElement>('input[type="radio"]')
      .forEach((el) => {
        if (!isVisible(el) || !el.name) return;
        const group = radioGroups.get(el.name) ?? [];
        group.push(el);
        radioGroups.set(el.name, group);
      });

    radioGroups.forEach((radios, name) => {
      const first = radios[0];
      plans.push({
        selector: `input[type="radio"][name="${name}"]`,
        label: name,
        interactions: radios.map((r) => r.value).filter(Boolean),
        kind: 'radio',
      });
      void first; // suppress unused-var
    });

    // — Checkboxes ————————————————————————————————————————————————————————————
    document
      .querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
      .forEach((el, i) => {
        if (!isVisible(el)) return;
        plans.push({
          selector: selectorOf(el, i),
          label: labelOf(el, i),
          interactions: ['check', 'uncheck'],
          kind: 'checkbox',
        });
      });

    return plans;
  });
}

// ─── Execute the simulation plan ─────────────────────────────────────────────

export async function simulateInteractions(
  page: Page,
  baseSnapshot: FormSnapshot
): Promise<InteractionResult[]> {
  const plan = await buildSimulationPlan(page);
  const results: InteractionResult[] = [];

  for (const item of plan) {
    for (const value of item.interactions) {
      try {
        // Perform the interaction
        if (item.kind === 'select') {
          const locator = page.locator(item.selector).first();
          await locator.selectOption({ value });
        } else if (item.kind === 'radio') {
          const locator = page
            .locator(`input[type="radio"][name="${item.label}"][value="${value}"]`)
            .first();
          await locator.check({ force: true });
        } else if (item.kind === 'checkbox') {
          const locator = page.locator(item.selector).first();
          if (value === 'check') {
            await locator.check({ force: true });
          } else {
            await locator.uncheck({ force: true });
          }
        }

        // Wait for DOM changes to settle
        await page.waitForTimeout(WAIT_FOR_DOM_MS);

        // Capture new state and diff
        const afterSnapshot = await captureSnapshot(page);
        const stateChanges = diffSnapshots(baseSnapshot, afterSnapshot);

        if (stateChanges.length > 0) {
          results.push({
            triggerLabel: item.label,
            triggerSelector: item.selector,
            triggerValue: value,
            stateChanges,
          });
        }
      } catch {
        // Element may have been removed by a previous interaction — skip
      }
    }
  }

  return results;
}
