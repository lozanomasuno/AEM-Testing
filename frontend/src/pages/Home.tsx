import { useState } from 'react';
import { runTest, TestOptions, DataMode, TestReport } from '../services/api.service';
import TestOptionsPanel from '../components/TestOptionsPanel';
import ResultPanel from '../components/ResultPanel';

const DEFAULT_OPTIONS: TestOptions = {
  regex: true,
  required: true,
  hidden: true,
};

export default function Home() {
  const [url, setUrl] = useState('');
  const [options, setOptions] = useState<TestOptions>(DEFAULT_OPTIONS);
  const [dataMode, setDataMode] = useState<DataMode>('valid');
  const [report, setReport] = useState<TestReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    if (!url.trim()) {
      setError('Please enter a form URL.');
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const result = await runTest(url.trim(), options, dataMode);
      setReport(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-xl bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-5">

        {/* Header */}
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-base font-bold tracking-tight text-gray-900">
            AEM Forms QA Assistant
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Sprint 1 MVP</p>
        </div>

        {/* URL Input */}
        <div>
          <label
            htmlFor="formUrl"
            className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1"
          >
            Form URL
          </label>
          <input
            id="formUrl"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/form"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
            onKeyDown={(e) => e.key === 'Enter' && handleRun()}
          />
        </div>

        {/* Options */}
        <TestOptionsPanel
          options={options}
          dataMode={dataMode}
          onChange={setOptions}
          onDataModeChange={setDataMode}
        />

        {/* Run button */}
        <button
          onClick={handleRun}
          disabled={loading}
          className="w-full bg-gray-900 text-white text-sm font-semibold py-2 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Running…' : 'RUN TEST'}
        </button>

        {/* Results */}
        <ResultPanel report={report} loading={loading} error={error} />
      </div>
    </div>
  );
}
