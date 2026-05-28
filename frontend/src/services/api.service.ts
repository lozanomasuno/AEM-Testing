const BASE_URL = 'http://localhost:3001';

export type DataMode = 'valid' | 'invalid' | 'mixed';

export interface TestOptions {
  regex: boolean;
  required: boolean;
  hidden: boolean;
  conditional: boolean; // Sprint 2
  aiGeneration: boolean; // Sprint 3
  coverage: boolean;     // Sprint 3
  formStructure: boolean; // Sprint 4
}

export interface TestReport {
  passed: number;
  failed: number;
  warnings: number;
  details: string[];
}

// Sprint 2 ─────────────────────────────────────────────────────────────────

export interface LogicTestReport {
  passed: number;
  failed: number;
  logicErrors: number;
  details: string[];
}

// Sprint 3 ─────────────────────────────────────────────────────────────────

export interface CoverageStats {
  coverage: number;
  fieldsCovered: number;
  totalFields: number;
  rulesCovered: number;
  totalRules: number;
  missingScenarios: number;
}

export interface GeneratedTestCase {
  id: string;
  fieldId: string;
  fieldName: string;
  fieldSelector: string;
  scenario: 'happy' | 'negative' | 'edge' | 'conditional';
  input: string;
  expectedOutcome: 'valid' | 'invalid';
  description: string;
}

export interface AITestReport {
  testsGenerated: number;
  coverage: number;
  edgeCases: number;
  details: string[];
  tests: GeneratedTestCase[];
  coverageStats: CoverageStats;
}

// ─── Sprint 1: POST /api/run-test ─────────────────────────────────────────

export async function runTest(
  url: string,
  options: TestOptions,
  dataMode: DataMode
): Promise<TestReport> {
  const response = await fetch(`${BASE_URL}/api/run-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, options, dataMode }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      (errorBody as { error?: string }).error ?? `HTTP ${response.status}`
    );
  }

  return response.json() as Promise<TestReport>;
}

// ─── Sprint 2: POST /api/run-logic-test ──────────────────────────────────

export async function runLogicTest(url: string): Promise<LogicTestReport> {
  const response = await fetch(`${BASE_URL}/api/run-logic-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, options: { conditional: true } }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      (errorBody as { error?: string }).error ?? `HTTP ${response.status}`
    );
  }

  return response.json() as Promise<LogicTestReport>;
}

// ─── Sprint 3: POST /api/generate-tests ──────────────────────────────────

export async function generateTests(
  url: string,
  options: Pick<TestOptions, 'aiGeneration' | 'coverage'>
): Promise<AITestReport> {
  const response = await fetch(`${BASE_URL}/api/generate-tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, options }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      (errorBody as { error?: string }).error ?? `HTTP ${response.status}`
    );
  }

  return response.json() as Promise<AITestReport>;
}

// ─── Sprint 4: POST /api/form-structure ──────────────────────────────────────

export type PanelType = 'fieldset' | 'section' | 'accordion' | 'tab' | 'group' | 'unknown';

export interface FormField {
  label: string;
  type: string;
  id: string;
  name: string;
  placeholder: string;
  required: boolean;
  pattern: string | null;
  maxlength: number | null;
  visible: boolean;
  readonly: boolean;
  disabled: boolean;
  errors: string[];
  warnings: string[];
  selector: string;
}

export interface FormPanel {
  name: string;
  type: PanelType;
  fields: FormField[];
}

export interface FormStructure {
  panels: FormPanel[];
  orphanFields: FormField[];
}

export async function getFormStructure(url: string): Promise<FormStructure> {
  const response = await fetch(`${BASE_URL}/api/form-structure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      (errorBody as { error?: string }).error ?? `HTTP ${response.status}`
    );
  }

  return response.json() as Promise<FormStructure>;
}

