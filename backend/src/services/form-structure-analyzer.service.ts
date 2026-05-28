import { chromium } from 'playwright';
import { FormStructure } from '../utils/types';

/**
 * Form Structure Analyzer Service — Sprint 4
 *
 * Opens the target URL in a headless browser and builds a semantic map of
 * the form:  panels → fields → labels / types / validations / error messages.
 *
 * Re-uses the same browser launch settings as Scanner Service
 * (ignoreHTTPSErrors, domcontentloaded, 2 s extra wait).
 *
 * Error messages are filtered to English only before returning.
 */
export async function analyzeFormStructure(url: string): Promise<FormStructure> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(2_000);

    const raw = await page.evaluate(() => {
      // ── English-only filter ───────────────────────────────────────────────
      function isEnglish(text: string): boolean {
        if (!text?.trim() || text.trim().length < 3) return false;
        // Reject strings with Spanish/French diacritics
        if (/[áéíóúñüÁÉÍÓÚÑÜ¿¡àèìòùâêîôûäëïöü]/.test(text)) return false;
        // Reject common Spanish vocabulary (no-diacritic forms too)
        return !/\b(campo|obligatorio|invalido|ingrese|debe|requerido|por\s*favor|numero|correo|nombre|apellido|direccion|telefono|solo\s*puede|tiene\s*que|entre|valor|formato|dato|ingresa|escribe|selecciona)\b/i.test(text);
      }

      // ── Label extraction ──────────────────────────────────────────────────
      function getLabel(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
        // 1. Explicit <label for="id">
        if (el.id) {
          const lbl = document.querySelector<HTMLLabelElement>(`label[for="${el.id}"]`);
          if (lbl?.textContent?.trim()) return lbl.textContent.trim();
        }
        // 2. aria-labelledby
        const lb = el.getAttribute('aria-labelledby');
        if (lb) {
          const lbEl = document.getElementById(lb.split(' ')[0]);
          if (lbEl?.textContent?.trim()) return lbEl.textContent.trim();
        }
        // 3. aria-label
        const al = el.getAttribute('aria-label')?.trim();
        if (al) return al;
        // 4. Wrapping <label>
        const wrap = el.closest('label');
        if (wrap?.textContent?.trim()) return wrap.textContent.trim();
        // 5. data-label / title attribute
        const dl = (el.getAttribute('data-label') ?? el.getAttribute('title'))?.trim();
        if (dl) return dl;
        // 6. Placeholder
        const ph = (el as HTMLInputElement).placeholder?.trim();
        if (ph) return ph;
        // 7. name or id fallback
        return el.name || el.id || 'Field';
      }

      // ── Error message extraction ──────────────────────────────────────────
      function getErrors(el: Element): string[] {
        const seen = new Set<string>();
        const errors: string[] = [];
        function add(text: string | null | undefined): void {
          const t = (text ?? '').trim();
          if (t.length > 2 && isEnglish(t) && !seen.has(t)) {
            seen.add(t);
            errors.push(t);
          }
        }
        // aria-describedby references
        const db = el.getAttribute('aria-describedby');
        if (db) db.split(/\s+/).forEach(id => add(document.getElementById(id)?.textContent));

        // Nearest semantic wrapper → search common error selectors inside it
        const wrapper =
          el.closest('.guide-field-wrapper,.field-wrapper,.form-group,.field-container,.form-field') ??
          el.parentElement;
        if (wrapper) {
          ['.error-message', '.validation-message', '.field-error', '.error',
            '[role="alert"]', '.help-text', '.helper-text', '.invalid-feedback', '.form-error',
          ].forEach(s => wrapper.querySelectorAll(s).forEach(e => add(e.textContent)));
        }
        // Inline data attributes
        ['data-errormessage', 'data-error-message', 'data-validation-message'].forEach(a => add(el.getAttribute(a)));
        return errors;
      }

      // ── Visibility ────────────────────────────────────────────────────────
      function isVis(el: HTMLElement): boolean {
        const s = window.getComputedStyle(el);
        return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && el.offsetParent !== null;
      }

      // ── Build field descriptor ────────────────────────────────────────────
      function buildField(el: HTMLElement): Record<string, unknown> | null {
        const inp = el as HTMLInputElement;
        const type = (inp.type ?? el.tagName.toLowerCase()).toLowerCase();
        if (type === 'hidden') return null;

        let sel = el.tagName.toLowerCase();
        if (el.id) sel = `#${el.id}`;
        else if (inp.name) sel = `${el.tagName.toLowerCase()}[name="${inp.name}"]`;

        // maxlength — meaningful for text/textarea; -1 = not set
        const ml = inp.maxLength ?? -1;
        const maxlength = (type === 'text' || type === 'textarea') && ml > 0 ? ml : null;

        // QA warnings: text/textarea without regex or maxlength = quality gap
        const warnings: string[] = [];
        if (type === 'text' || type === 'textarea') {
          if (!inp.pattern) warnings.push('Missing regex');
          if (ml <= 0) warnings.push('Missing maxlength');
        }

        return {
          label:       getLabel(inp as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement),
          type,
          id:          el.id ?? '',
          name:        inp.name ?? '',
          placeholder: inp.placeholder ?? '',
          required:    !!inp.required,
          pattern:     inp.pattern || null,
          maxlength,
          visible:     isVis(el),
          readonly:    inp.readOnly != null ? !!inp.readOnly : el.hasAttribute('readonly'),
          disabled:    !!inp.disabled,
          errors:      getErrors(el),
          warnings,
          selector:    sel,
        };
      }

      // ── Panel name detection ──────────────────────────────────────────────
      function getPanelName(c: Element): string {
        if (c.tagName === 'FIELDSET') {
          const lg = c.querySelector(':scope > legend');
          if (lg?.textContent?.trim()) return lg.textContent.trim();
        }
        if (c.tagName === 'DETAILS') {
          const sm = c.querySelector(':scope > summary');
          if (sm?.textContent?.trim()) return sm.textContent.trim();
        }
        const al = c.getAttribute('aria-label')?.trim();
        if (al) return al;
        const lb = c.getAttribute('aria-labelledby');
        if (lb) {
          const e = document.getElementById(lb.split(' ')[0]);
          if (e?.textContent?.trim()) return e.textContent.trim();
        }
        // Explicit title elements used by AEM / accordion / card patterns
        const titleEl = c.querySelector(
          ':scope > .guide-container-title,' +
          ':scope > .panel-title,' +
          ':scope > .section-title,' +
          ':scope > .accordion-title,' +
          ':scope > .card-title,' +
          ':scope > .collapsible-title,' +
          ':scope > [class*="title"]'
        );
        if (titleEl?.textContent?.trim()) return titleEl.textContent.trim();
        // Direct heading child
        const h = c.querySelector(':scope > h1,:scope > h2,:scope > h3,:scope > h4,:scope > h5,:scope > h6');
        if (h?.textContent?.trim()) return h.textContent.trim();
        // Any heading descendant (accordion / card wrappers)
        const ah = c.querySelector('h1,h2,h3,h4,h5,h6');
        if (ah?.textContent?.trim()) return ah.textContent.trim().slice(0, 80);
        // data-name (AEM): convert camelCase → readable text
        const dn = c.getAttribute('data-name');
        if (dn?.trim()) {
          return dn.replace(/([A-Z])/g, ' $1').replace(/[-_]+/g, ' ').trim();
        }
        const d = (c.getAttribute('data-label') ?? c.getAttribute('data-title'))?.trim();
        if (d) return d;
        // title attribute as last resort
        const t = (c as HTMLElement).title?.trim();
        if (t) return t;
        return 'Section';
      }

      // ── Panel type classification ─────────────────────────────────────────
      function getPanelType(c: Element): string {
        const tag = c.tagName.toLowerCase();
        if (tag === 'fieldset') return 'fieldset';
        if (tag === 'section')  return 'section';
        if (tag === 'details')  return 'accordion';
        const role = c.getAttribute('role') ?? '';
        if (role === 'group')    return 'group';
        if (role === 'tabpanel') return 'tab';
        if (role === 'region')   return 'section';
        const cls = (c.getAttribute('class') ?? '').toLowerCase();
        if (cls.includes('accordion')) return 'accordion';
        if (cls.includes('tab'))       return 'tab';
        return 'group';
      }

      // ── Main DOM extraction ───────────────────────────────────────────────
      const PANEL_SEL = [
        'fieldset', 'details',
        'section[aria-label]', 'section[aria-labelledby]',
        '[role="group"]', '[role="tabpanel"]', '[role="region"]',
        '.panel', '.guideFieldSet', '[data-component="panel"]',
      ].join(',');

      const allInputs = Array.from(
        document.querySelectorAll<HTMLElement>('input:not([type="hidden"]),textarea,select'),
      );
      const panelEls = Array.from(
        document.querySelectorAll<HTMLElement>(PANEL_SEL),
      ).filter(p => p.querySelector('input:not([type="hidden"]),textarea,select'));

      // Map each input → its most-specific (closest) panel ancestor
      const inputToPanel = new Map<HTMLElement, HTMLElement | null>();
      for (const input of allInputs) {
        let best: HTMLElement | null = null;
        let bestDepth = -1;
        for (const panel of panelEls) {
          if (panel.contains(input)) {
            let depth = 0;
            let node: HTMLElement | null = input;
            while (node && node !== panel) { depth++; node = node.parentElement; }
            if (best === null || depth < bestDepth) { best = panel; bestDepth = depth; }
          }
        }
        inputToPanel.set(input, best);
      }

      // Group inputs by their panel
      const panelToInputs = new Map<HTMLElement, HTMLElement[]>();
      for (const input of allInputs) {
        const p = inputToPanel.get(input);
        if (p) {
          if (!panelToInputs.has(p)) panelToInputs.set(p, []);
          panelToInputs.get(p)!.push(input);
        }
      }

      // Build ordered panels array
      const seen = new Set<HTMLElement>();
      const panels: Array<{ name: string; type: string; fields: Array<Record<string, unknown>> }> = [];
      for (const panelEl of panelEls) {
        if (seen.has(panelEl)) continue;
        seen.add(panelEl);
        const inputs = panelToInputs.get(panelEl) ?? [];
        const fields = inputs.map(buildField).filter((f): f is Record<string, unknown> => f !== null);
        if (fields.length === 0) continue;
        panels.push({ name: getPanelName(panelEl), type: getPanelType(panelEl), fields });
      }

      // Orphan fields (no panel ancestor)
      const orphanFields = allInputs
        .filter(inp => !inputToPanel.get(inp))
        .map(buildField)
        .filter((f): f is Record<string, unknown> => f !== null);

      return { panels, orphanFields };
    });

    return raw as unknown as FormStructure;
  } finally {
    await browser.close();
  }
}
