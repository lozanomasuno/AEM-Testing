import { generateTestValue } from '../services/data-generator.service';
import { FieldDescriptor } from '../utils/types';

const emailField: FieldDescriptor = {
  tag: 'input',
  type: 'email',
  name: 'email',
  id: 'email',
  required: true,
  pattern: null,
  visible: true,
  selector: '#email',
};

const patternField: FieldDescriptor = {
  tag: 'input',
  type: 'text',
  name: 'zip',
  id: 'zip',
  required: false,
  pattern: '[0-9]{5}',
  visible: true,
  selector: '#zip',
};

describe('generateTestValue — valid mode', () => {
  it('generates a valid email string', () => {
    const val = generateTestValue(emailField, 'valid');
    expect(val).toMatch(/@/);
  });

  it('returns an alphanumeric string for pattern fields', () => {
    const val = generateTestValue(patternField, 'valid');
    expect(typeof val).toBe('string');
    expect(val.length).toBeGreaterThan(0);
  });
});

describe('generateTestValue — invalid mode', () => {
  it('generates an invalid email string', () => {
    const val = generateTestValue(emailField, 'invalid');
    // Invalid values should fail the standard email check
    expect(val).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });
});

describe('generateTestValue — mixed mode', () => {
  it('returns a string (either valid or invalid)', () => {
    const val = generateTestValue(emailField, 'mixed');
    expect(typeof val).toBe('string');
  });
});
