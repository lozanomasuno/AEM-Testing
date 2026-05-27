const BASE_URL = 'http://localhost:3001';

export type DataMode = 'valid' | 'invalid' | 'mixed';

export interface TestOptions {
  regex: boolean;
  required: boolean;
  hidden: boolean;
  conditional: boolean; // Sprint 2
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
