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
