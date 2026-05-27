import { chromium, Browser, Page } from 'playwright';
import { DataMode, FieldDescriptor, TestOptions, TestReport } from '../utils/types';
import { generateTestValue } from './data-generator.service';

/**
 * Test Engine Service
 * Drives Playwright to fill the form and run QA checks.
 */
export async function runPlaywrightTests(
  url: string,
  fields: FieldDescriptor[],
  options: TestOptions,
  dataMode: DataMode
): Promise<TestReport> {
  const details: string[] = [];
  let passed = 0;
  let failed = 0;
  let warnings = 0;

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const page: Page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });

    // ── 1. Hidden elements scan ──────────────────────────────────────────────
    if (options.hidden) {
      const hiddenFields = fields.filter((f) => !f.visible);
      if (hiddenFields.length > 0) {
        warnings += hiddenFields.length;
        hiddenFields.forEach((f) => {
          details.push(
            `⚠ Hidden field detected: ${f.id || f.name || f.selector}`
          );
        });
      } else {
        passed++;
        details.push('✔ No unexpected hidden fields found.');
      }
    }

    // ── 2. Required fields validation ────────────────────────────────────────
    if (options.required) {
      const requiredFields = fields.filter((f) => f.required && f.visible);

      for (const field of requiredFields) {
        try {
          // Attempt to submit with the field empty
          const locator = page.locator(field.selector).first();
          await locator.fill('');
        } catch {
          warnings++;
          details.push(
            `⚠ Could not interact with required field: ${field.id || field.name || field.selector}`
          );
        }
      }

      // Try submitting the empty form and check for validation messages
      const submitBtn = page
        .locator('button[type="submit"], input[type="submit"]')
        .first();
      const hasSubmit = (await submitBtn.count()) > 0;

      if (hasSubmit) {
        await submitBtn.click({ force: true }).catch(() => null);
        await page.waitForTimeout(800);

        // Check for browser-native validation messages
        const invalidInputs = await page.evaluate(() => {
          const inputs = Array.from(
            document.querySelectorAll<HTMLInputElement>(
              'input:invalid, textarea:invalid, select:invalid'
            )
          );
          return inputs.map((el) => el.id || el.name || el.tagName);
        });

        if (invalidInputs.length > 0) {
          passed++;
          details.push(
            `✔ Browser validation triggered for: ${invalidInputs.join(', ')}`
          );
        } else if (requiredFields.length > 0) {
          warnings++;
          details.push(
            '⚠ Required fields present but browser validation did not trigger — may use custom JS validation.'
          );
        } else {
          passed++;
          details.push('✔ No required fields found that block submission.');
        }
      } else {
        warnings++;
        details.push(
          '⚠ No submit button found — required-field check skipped.'
        );
      }
    }

    // ── 3. Regex / pattern validation ───────────────────────────────────────
    if (options.regex) {
      const patternFields = fields.filter(
        (f) => f.pattern && f.visible
      );

      if (patternFields.length === 0) {
        warnings++;
        details.push('⚠ No fields with pattern attribute found.');
      }

      for (const field of patternFields) {
        const value = generateTestValue(field, dataMode);
        const locator = page.locator(field.selector).first();

        try {
          await locator.fill(value);

          const isValid = await page.evaluate(
            ({ sel, val }: { sel: string; val: string }) => {
              const el = document.querySelector<HTMLInputElement>(sel);
              if (!el) return null;
              el.value = val;
              return el.checkValidity();
            },
            { sel: field.selector, val: value }
          );

          if (isValid === null) {
            warnings++;
            details.push(
              `⚠ Could not verify pattern on: ${field.id || field.name}`
            );
          } else if (dataMode === 'valid' && isValid) {
            passed++;
            details.push(
              `✔ Pattern valid for: ${field.id || field.name} (value: "${value}")`
            );
          } else if (dataMode === 'invalid' && !isValid) {
            passed++;
            details.push(
              `✔ Pattern correctly rejected invalid input for: ${field.id || field.name}`
            );
          } else if (dataMode === 'valid' && !isValid) {
            failed++;
            details.push(
              `✖ Pattern mismatch for: ${field.id || field.name} — value "${value}" did not satisfy pattern "${field.pattern}"`
            );
          } else if (dataMode === 'invalid' && isValid) {
            // Mixed or unexpected pass — treat as warning
            warnings++;
            details.push(
              `⚠ Invalid value was accepted by: ${field.id || field.name} — pattern may not be enforced.`
            );
          } else {
            // mixed mode
            passed++;
          }
        } catch (err) {
          failed++;
          details.push(
            `✖ Error testing pattern field ${field.id || field.name}: ${String(err)}`
          );
        }
      }
    }

    // ── 4. Fill all visible fields and do a final submit attempt ─────────────
    for (const field of fields.filter((f) => f.visible)) {
      try {
        const value = generateTestValue(field, dataMode);
        const locator = page.locator(field.selector).first();

        if (field.tag === 'select') {
          // Select first available option as fallback
          await locator.selectOption({ index: 1 }).catch(() => null);
        } else if (field.type !== 'checkbox' && field.type !== 'radio') {
          await locator.fill(value);
        }
      } catch {
        // Non-critical — field may have been removed by JS
      }
    }

    // Final submission attempt
    const finalSubmit = page
      .locator('button[type="submit"], input[type="submit"]')
      .first();
    if ((await finalSubmit.count()) > 0) {
      await finalSubmit.click({ force: true }).catch(() => null);
      await page.waitForTimeout(1_000);

      const pageErrors = await page.evaluate(() => {
        const errorEls = document.querySelectorAll(
          '[class*="error"], [class*="invalid"], [aria-invalid="true"]'
        );
        return Array.from(errorEls).map(
          (el) => el.textContent?.trim() ?? el.className
        );
      });

      if (pageErrors.length > 0) {
        failed += pageErrors.length;
        pageErrors.forEach((msg) =>
          details.push(`✖ Form error after submit: "${msg}"`)
        );
      } else {
        passed++;
        details.push('✔ Form submitted without visible errors.');
      }
    }
  } finally {
    if (browser) await browser.close();
  }

  return { passed, failed, warnings, details };
}
