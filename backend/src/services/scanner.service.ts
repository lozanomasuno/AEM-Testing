import { chromium, Browser, Page } from 'playwright';
import { FieldDescriptor } from '../utils/types';

/**
 * Scanner Service
 * Opens the target URL in a headless browser and extracts
 * all form field descriptors from the DOM.
 */
export async function scanFormFields(url: string): Promise<FieldDescriptor[]> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    // ignoreHTTPSErrors: required for corporate-proxy / self-signed certs (e.g. ambientesbc.com dev)
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page: Page = await context.newPage();

    // 'domcontentloaded' instead of 'networkidle' — AEM Forms keep long-poll
    // requests open, so networkidle never fires.
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    // Extra wait for AEM Guide JS to finish rendering panels
    await page.waitForTimeout(2_000);

    const fields = await page.evaluate((): FieldDescriptor[] => {
      const results: FieldDescriptor[] = [];
      const elements = document.querySelectorAll<HTMLElement>(
        'input, textarea, select'
      );

      elements.forEach((el, index) => {
        const tag = el.tagName.toLowerCase();
        const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

        // Skip hidden input types that are not relevant to QA
        const inputType = (input as HTMLInputElement).type ?? 'text';
        if (inputType === 'hidden') return;

        const style = window.getComputedStyle(el);
        const visible =
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          el.offsetParent !== null;

        // Build a stable CSS selector
        let selector = tag;
        if (el.id) {
          selector = `#${el.id}`;
        } else if (el.getAttribute('name')) {
          selector = `${tag}[name="${el.getAttribute('name')}"]`;
        } else {
          selector = `${tag}:nth-of-type(${index + 1})`;
        }

        results.push({
          tag,
          type: inputType,
          name: input.name ?? '',
          id: el.id ?? '',
          required: (input as HTMLInputElement).required ?? false,
          pattern: (input as HTMLInputElement).pattern || null,
          visible,
          selector,
        });
      });

      return results;
    });

    return fields;
  } finally {
    if (browser) await browser.close();
  }
}
