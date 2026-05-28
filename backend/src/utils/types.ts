// Shared TypeScript types for the QA backend

export interface TestOptions {
  regex: boolean;
  required: boolean;
  hidden: boolean;
}

export type DataMode = 'valid' | 'invalid' | 'mixed';

export interface RunTestRequest {
  url: string;
  options: TestOptions;
  dataMode: DataMode;
}

export interface TestReport {
  passed: number;
  failed: number;
  warnings: number;
  details: string[];
}

export interface FieldDescriptor {
  tag: string;         // input | textarea | select
  type: string;        // text | email | number | etc.
  name: string;
  id: string;
  required: boolean;
  pattern: string | null;
  visible: boolean;
  selector: string;    // CSS selector to locate the element
}

// ─── Sprint 2 — Conditional Logic Types ──────────────────────────────────────

export interface LogicTestOptions {
  conditional: boolean;
}

export interface LogicTestRequest {
  url: string;
  options: LogicTestOptions;
}

export interface LogicTestReport {
  passed: number;
  failed: number;
  logicErrors: number;
  details: string[];
}

/** Snapshot of a single DOM element (field or panel) at one point in time */
export interface ElementSnapshot {
  selector: string;
  label: string;
  visible: boolean;
  ariaHidden: boolean;
  htmlHidden: boolean;
  disabled: boolean;
  value: string;
  type: 'field' | 'panel';
}

export type FormSnapshot = ElementSnapshot[];

/** A single state-change detected between two snapshots */
export interface StateChange {
  selector: string;
  label: string;
  changeType: 'appeared' | 'disappeared' | 'enabled' | 'disabled';
  type: 'field' | 'panel';
}

/** Result of one simulated user interaction */
export interface InteractionResult {
  triggerLabel: string;
  triggerSelector: string;
  triggerValue: string;
  stateChanges: StateChange[];
}

/** An explicit conditional rule inferred from DOM attributes */
export interface ConditionalRule {
  triggerSelector: string;
  triggerLabel: string;
  targetSelector: string;
  targetLabel: string;
  expectedAction: 'show' | 'hide';
  sourceAttribute: string;
}

// ─── Sprint 3 — AI Test Generation + Coverage Intelligence ───────────────────

export interface AITestOptions {
  aiGeneration: boolean;
  coverage: boolean;
}

export interface GenerateTestsRequest {
  url: string;
  options: AITestOptions;
}

/** Inferred semantic metadata for a field, built by the Schema Inferencer */
export interface InferredField extends FieldDescriptor {
  category: 'email' | 'phone' | 'name' | 'age' | 'date' | 'numeric' | 'text' | 'url' | 'checkbox' | 'select';
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  boundaryValues: string[];
  relatedFields: string[];   // ids / names of logically related sibling fields
}

export type ScenarioType = 'happy' | 'negative' | 'edge' | 'conditional';

/** A single generated test case targeting one field */
export interface GeneratedTestCase {
  id: string;
  fieldId: string;
  fieldName: string;
  fieldSelector: string;
  scenario: ScenarioType;
  input: string;
  expectedOutcome: 'valid' | 'invalid';
  description: string;
}

/** Coverage statistics produced by the Coverage Engine */
export interface CoverageStats {
  coverage: number;          // 0-100 %
  fieldsCovered: number;
  totalFields: number;
  rulesCovered: number;
  totalRules: number;
  missingScenarios: number;
}

/** Final response from POST /api/generate-tests */
export interface AITestReport {
  testsGenerated: number;
  coverage: number;
  edgeCases: number;
  details: string[];
  tests: GeneratedTestCase[];
  coverageStats: CoverageStats;
}

// ─── Sprint 4 — Form Structure Analyzer ──────────────────────────────────────

export type PanelType = 'fieldset' | 'section' | 'accordion' | 'tab' | 'group' | 'unknown';

/** A single form field with its full semantic metadata */
export interface FormField {
  label: string;
  type: string;
  id: string;
  name: string;
  placeholder: string;
  required: boolean;
  pattern: string | null;
  visible: boolean;
  readonly: boolean;
  disabled: boolean;
  errors: string[];      // English-only error/validation messages
  selector: string;
}

/** A semantic panel / section that groups form fields */
export interface FormPanel {
  name: string;
  type: PanelType;
  fields: FormField[];
}

/** Full semantic structure of the analysed form */
export interface FormStructure {
  panels: FormPanel[];
  orphanFields: FormField[];   // fields not inside any detected panel
}
