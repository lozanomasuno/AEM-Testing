import { faker } from '@faker-js/faker';
import { DataMode, FieldDescriptor } from '../utils/types';

/**
 * Data Generator Service
 * Produces valid or invalid test values for each form field.
 */

// Build a valid value for a field, honouring the pattern attribute when present.
function validValueFor(field: FieldDescriptor): string {
  if (field.pattern) {
    // Best-effort: handle the most common HTML patterns found in AEM Forms.
    const p = field.pattern;
    if (/email/i.test(p) || p.includes('@')) return faker.internet.email();
    if (/^\d[\d\-]+$/.test(p) || /^\[0-9\]/.test(p)) return faker.string.numeric(10);
    if (/[a-zA-Z]/.test(p) && p.length < 20) return faker.string.alpha(8);
    // Fallback: return alphanumeric that satisfies most simple patterns
    return faker.string.alphanumeric(8);
  }

  switch (field.type) {
    case 'email':     return faker.internet.email();
    case 'number':    return String(faker.number.int({ min: 1, max: 999 }));
    case 'tel':       return faker.phone.number();
    case 'url':       return faker.internet.url();
    case 'date':      return faker.date.recent().toISOString().split('T')[0];
    case 'checkbox':  return 'true';
    default:          return faker.lorem.word();
  }
}

// Build a deliberately invalid value for a field.
function invalidValueFor(field: FieldDescriptor): string {
  switch (field.type) {
    case 'email':  return 'not-an-email@@bad';
    case 'number': return 'abc-not-a-number';
    case 'tel':    return '!!!###';
    case 'url':    return 'not_a_url';
    case 'date':   return '99/99/9999';
    default:       return '';   // empty is the most universal "invalid" for required fields
  }
}

export function generateTestValue(field: FieldDescriptor, mode: DataMode): string {
  if (mode === 'valid')   return validValueFor(field);
  if (mode === 'invalid') return invalidValueFor(field);

  // mixed: alternate randomly
  return Math.random() < 0.5 ? validValueFor(field) : invalidValueFor(field);
}
