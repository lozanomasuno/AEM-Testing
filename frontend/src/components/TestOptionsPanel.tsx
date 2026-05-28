import { TestOptions, DataMode } from '../services/api.service';

interface Props {
  options: TestOptions;
  dataMode: DataMode;
  onChange: (options: TestOptions) => void;
  onDataModeChange: (mode: DataMode) => void;
}

const dataModes: { value: DataMode; label: string }[] = [
  { value: 'valid', label: 'Valid data' },
  { value: 'invalid', label: 'Invalid data' },
  { value: 'mixed', label: 'Mixed' },
];

export default function TestOptionsPanel({
  options,
  dataMode,
  onChange,
  onDataModeChange,
}: Props) {
  function toggle(key: keyof TestOptions) {
    onChange({ ...options, [key]: !options[key] });
  }

  return (
    <div className="space-y-4">
      {/* Test checkboxes */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
          Test Options
        </p>
        <div className="space-y-1">
          {(
            [
              { key: 'regex', label: 'Regex validation' },
              { key: 'required', label: 'Required fields' },
              { key: 'hidden', label: 'Hidden elements scan' },
              { key: 'conditional', label: 'Conditional logic test' }, // Sprint 2
            ] as { key: keyof TestOptions; label: string }[]
          ).map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options[key]}
                onChange={() => toggle(key)}
                className="accent-gray-800"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Sprint 3 — AI options */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
          AI Generation  <span className="normal-case font-normal text-gray-400">(Sprint 3)</span>
        </p>
        <div className="space-y-1">
          {(
            [
              { key: 'aiGeneration', label: 'AI Test Generation' },
              { key: 'coverage',     label: 'Coverage Analysis' },
            ] as { key: keyof TestOptions; label: string }[]
          ).map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options[key]}
                onChange={() => toggle(key)}
                className="accent-indigo-600"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Sprint 4 — Form Structure */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
          Form Analysis  <span className="normal-case font-normal text-gray-400">(Sprint 4)</span>
        </p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={options.formStructure}
            onChange={() => toggle('formStructure')}
            className="accent-teal-600"
          />
          <span className="text-sm text-gray-700">Form Structure</span>
        </label>
      </div>

      {/* Data mode radio */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
          Data Mode
        </p>
        <div className="space-y-1">
          {dataModes.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="dataMode"
                value={value}
                checked={dataMode === value}
                onChange={() => onDataModeChange(value)}
                className="accent-gray-800"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
