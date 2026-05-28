import { faker } from '@faker-js/faker';
import { InferredField, GeneratedTestCase, ScenarioType } from '../utils/types';

/**
 * AI Test Generator Service  (Sprint 3)
 *
 * Consumes the enriched schema from the Schema Inferencer and produces
 * a flat list of GeneratedTestCase objects covering:
 *   - happy path   (valid inputs)
 *   - negative     (invalid inputs)
 *   - edge cases   (boundary values from InferredField.boundaryValues)
 */

let _counter = 0;
function nextId(): string {
  return `tc-${(++_counter).toString().padStart(4, '0')}`;
}

// ─── Valid value per category ─────────────────────────────────────────────────

function validInput(field: InferredField): string {
  switch (field.category) {
    case 'email':    return faker.internet.email();
    case 'phone':    return faker.phone.number();
    case 'age':      return String(faker.number.int({ min: 18, max: 80 }));
    case 'numeric':  return String(
      faker.number.int({
        min: field.minValue ?? 1,
        max: field.maxValue ?? 999,
      })
    );
    case 'date':     return faker.date.recent({ days: 365 }).toISOString().split('T')[0];
    case 'url':      return faker.internet.url();
    case 'name':     return faker.person.fullName();
    case 'checkbox': return 'true';
    case 'select':   return 'option1';
    default:
      if (field.minLength && field.maxLength) {
        return faker.string.alpha({ length: { min: field.minLength, max: field.maxLength } });
      }
      return faker.lorem.word();
  }
}

// ─── Invalid value per category ───────────────────────────────────────────────

function invalidInput(field: InferredField): string {
  switch (field.category) {
    case 'email':    return 'not@@valid..email';
    case 'phone':    return 'abc-not-phone';
    case 'age':      return '-5';
    case 'numeric':  return 'NaN_value';
    case 'date':     return '99/99/9999';
    case 'url':      return 'just text no url';
    case 'name':     return '1234567890';
    case 'checkbox': return 'maybe';
    default:
      return field.required ? '' : '!!!###$$$';
  }
}

// ─── Case factory ─────────────────────────────────────────────────────────────

function makeCase(
  field: InferredField,
  scenario: ScenarioType,
  input: string,
  expected: 'valid' | 'invalid',
  description: string,
): GeneratedTestCase {
  return {
    id:              nextId(),
    fieldId:         field.id,
    fieldName:       field.name,
    fieldSelector:   field.selector,
    scenario,
    input,
    expectedOutcome: expected,
    description,
  };
}

// ─── Per-field test case expansion ───────────────────────────────────────────

function generateForField(field: InferredField): GeneratedTestCase[] {
  const cases: GeneratedTestCase[] = [];
  const label = field.id || field.name || field.selector;

  // Happy path — one valid case
  cases.push(
    makeCase(field, 'happy', validInput(field), 'valid',
      `[happy] ${label}: valid ${field.category} input accepted`),
  );

  // Negative path — one invalid case
  cases.push(
    makeCase(field, 'negative', invalidInput(field), 'invalid',
      `[negative] ${label}: invalid ${field.category} input rejected`),
  );

  // Required field — empty value must fail
  if (field.required) {
    cases.push(
      makeCase(field, 'negative', '', 'invalid',
        `[negative] ${label}: empty value rejected (required field)`),
    );
  }

  // Edge cases — boundary values from Schema Inferencer
  field.boundaryValues.forEach((bv, i) => {
    const isLikelyValid = bv.length > 0 && bv.trim().length > 0 && bv.length < 100;
    cases.push(
      makeCase(
        field,
        'edge',
        bv,
        isLikelyValid ? 'valid' : 'invalid',
        `[edge #${i + 1}] ${label}: boundary value "${bv.slice(0, 40)}"`,
      ),
    );
  });

  return cases;
}

// ─── Optimisation — remove exact-duplicate inputs per field ──────────────────

function deduplicate(cases: GeneratedTestCase[]): GeneratedTestCase[] {
  const seen = new Set<string>();
  return cases.filter((c) => {
    const key = `${c.fieldSelector}|${c.scenario}|${c.input}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateTestCases(schema: InferredField[]): GeneratedTestCase[] {
  _counter = 0; // reset per-run counter

  const raw = schema.flatMap((field) => generateForField(field));
  return deduplicate(raw);
}
