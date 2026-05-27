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
