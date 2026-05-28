import { FieldDescriptor, InferredField } from '../utils/types';

/**
 * Schema Inferencer Service  (Sprint 3)
 *
 * Analyses the raw FieldDescriptor[] produced by the Scanner and enriches
 * each field with:
 *   - semantic category  (email, phone, age, name, date, …)
 *   - inferred constraints  (minLength, maxLength, minValue, maxValue)
 *   - boundary values  ready-made for edge-case generation
 *   - relatedFields  – ids/names that appear to be in the same logical group
 */

// ─── Category detection helpers ──────────────────────────────────────────────

const EMAIL_HINTS   = /email|correo|mail/i;
const PHONE_HINTS   = /phone|tel|celular|movil|mobile|fax/i;
const AGE_HINTS     = /age|edad|años|birth|nacimiento/i;
const DATE_HINTS    = /date|fecha|day|dia|mes|month|year|año/i;
const NAME_HINTS    = /name|nombre|apellido|surname|firstname|lastname/i;
const URL_HINTS     = /url|website|sitio|link/i;
const NUMERIC_HINTS = /amount|monto|price|precio|quantity|cantidad|score|number|numero|zip|postal|code/i;

function inferCategory(field: FieldDescriptor): InferredField['category'] {
  const probe = `${field.type} ${field.name} ${field.id}`;

  if (field.type === 'email' || EMAIL_HINTS.test(probe))   return 'email';
  if (field.type === 'tel'   || PHONE_HINTS.test(probe))   return 'phone';
  if (field.type === 'url'   || URL_HINTS.test(probe))     return 'url';
  if (field.type === 'date'  || DATE_HINTS.test(probe))    return 'date';
  if (field.type === 'number'|| AGE_HINTS.test(probe))     return 'age';
  if (field.type === 'number'|| NUMERIC_HINTS.test(probe)) return 'numeric';
  if (field.tag === 'select')                               return 'select';
  if (field.type === 'checkbox')                            return 'checkbox';
  if (NAME_HINTS.test(probe))                               return 'name';
  return 'text';
}

// ─── Constraint extraction ────────────────────────────────────────────────────

interface Constraints {
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
}

function extractConstraints(field: FieldDescriptor): Constraints {
  const c: Constraints = {};

  if (field.pattern) {
    // Extract numeric bounds from patterns like {3,10} or {5}
    const rangeMatch = field.pattern.match(/\{(\d+),(\d+)\}/);
    if (rangeMatch) {
      c.minLength = parseInt(rangeMatch[1], 10);
      c.maxLength = parseInt(rangeMatch[2], 10);
    }
    const exactMatch = field.pattern.match(/\{(\d+)\}/);
    if (exactMatch && !rangeMatch) {
      c.minLength = parseInt(exactMatch[1], 10);
      c.maxLength = parseInt(exactMatch[1], 10);
    }
  }

  // Age/numeric heuristics
  const probe = `${field.name} ${field.id}`.toLowerCase();
  if (/age|edad/.test(probe)) {
    c.minValue = 0;
    c.maxValue = 120;
  } else if (/year|año/.test(probe)) {
    c.minValue = 1900;
    c.maxValue = new Date().getFullYear();
  } else if (/zip|postal/.test(probe)) {
    c.minLength = c.minLength ?? 4;
    c.maxLength = c.maxLength ?? 10;
  } else if (/phone|tel|celular/.test(probe)) {
    c.minLength = c.minLength ?? 7;
    c.maxLength = c.maxLength ?? 15;
  }

  return c;
}

// ─── Boundary value generation ────────────────────────────────────────────────

function buildBoundaryValues(
  field: FieldDescriptor,
  category: InferredField['category'],
  constraints: Constraints,
): string[] {
  const boundaries: string[] = [];

  // Universal boundaries
  boundaries.push('');                     // empty / below minimum
  boundaries.push(' ');                    // whitespace only
  boundaries.push('a'.repeat(256));        // excessively long string

  switch (category) {
    case 'email':
      boundaries.push('a@b.c');            // minimal valid email
      boundaries.push('no-at-sign');
      boundaries.push('@nodomain.com');
      boundaries.push('user@');
      break;

    case 'phone':
      boundaries.push('0');
      boundaries.push('00000000000000000'); // too long
      boundaries.push('+1 (800) 555-0100');
      boundaries.push('abc-def-ghij');      // non-numeric
      break;

    case 'age':
    case 'numeric': {
      const lo = constraints.minValue ?? 0;
      const hi = constraints.maxValue ?? 9999;
      boundaries.push(String(lo - 1));           // below min
      boundaries.push(String(lo));               // at min
      boundaries.push(String(lo + 1));           // just above min
      boundaries.push(String(Math.floor((lo + hi) / 2))); // midpoint
      boundaries.push(String(hi - 1));           // just below max
      boundaries.push(String(hi));               // at max
      boundaries.push(String(hi + 1));           // above max
      boundaries.push('-1');
      boundaries.push('0');
      boundaries.push('999999');
      break;
    }

    case 'date':
      boundaries.push('2000-01-01');
      boundaries.push('1900-01-01');
      boundaries.push('2099-12-31');
      boundaries.push('99/99/9999');
      boundaries.push('not-a-date');
      break;

    case 'url':
      boundaries.push('https://valid.example.com');
      boundaries.push('not_a_url');
      boundaries.push('ftp://');
      boundaries.push('http://');
      break;

    case 'text':
    case 'name':
      if (constraints.minLength) {
        boundaries.push('a'.repeat(constraints.minLength - 1)); // below min
        boundaries.push('a'.repeat(constraints.minLength));     // at min
        boundaries.push('a'.repeat(constraints.minLength + 1)); // above min
      }
      if (constraints.maxLength) {
        boundaries.push('a'.repeat(constraints.maxLength - 1)); // below max
        boundaries.push('a'.repeat(constraints.maxLength));     // at max
        boundaries.push('a'.repeat(constraints.maxLength + 1)); // above max
      }
      boundaries.push('<script>alert(1)</script>'); // XSS probe
      boundaries.push("'; DROP TABLE forms;--");    // SQL injection probe
      boundaries.push('🚀🎉💥');                    // emoji / unicode
      break;

    default:
      break;
  }

  // Deduplicate while preserving order
  return [...new Set(boundaries)];
}

// ─── Related field grouping ───────────────────────────────────────────────────

/**
 * Simple heuristic: fields sharing a common stem in their id/name
 * (e.g. "address1" / "address2", "phone" / "phoneConfirm") are treated as related.
 */
function findRelatedFields(
  field: FieldDescriptor,
  all: FieldDescriptor[],
): string[] {
  const key = (field.id || field.name).toLowerCase().replace(/\d+$/, '');
  if (key.length < 3) return [];

  return all
    .filter((f) => {
      if (f.selector === field.selector) return false;
      const fKey = (f.id || f.name).toLowerCase().replace(/\d+$/, '');
      return fKey.startsWith(key) || key.startsWith(fKey);
    })
    .map((f) => f.id || f.name)
    .filter(Boolean);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function inferSchema(fields: FieldDescriptor[]): InferredField[] {
  return fields.map((field): InferredField => {
    const category    = inferCategory(field);
    const constraints = extractConstraints(field);
    const boundaries  = buildBoundaryValues(field, category, constraints);
    const related     = findRelatedFields(field, fields);

    return {
      ...field,
      category,
      ...constraints,
      boundaryValues: boundaries,
      relatedFields:  related,
    };
  });
}
