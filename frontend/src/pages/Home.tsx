import { useState } from 'react';
import {
  runTest,
  runLogicTest,
  generateTests,
  getFormStructure,
  TestOptions,
  DataMode,
  TestReport,
  LogicTestReport,
  AITestReport,
  FormStructure,
} from '../services/api.service';
import TestOptionsPanel from '../components/TestOptionsPanel';
import ResultsModal from '../components/ResultsModal';

const DEFAULT_OPTIONS: TestOptions = {
  regex: true,
  required: true,
  hidden: true,
  conditional: false,
  aiGeneration: false,
  coverage: false,
  formStructure: false,
};

export default function Home() {
  const [url, setUrl] = useState('');
  const [options, setOptions] = useState<TestOptions>(DEFAULT_OPTIONS);
  const [dataMode, setDataMode] = useState<DataMode>('valid');
  const [report, setReport] = useState<TestReport | null>(null);
  const [logicReport, setLogicReport] = useState<LogicTestReport | null>(null);
  const [aiReport, setAiReport] = useState<AITestReport | null>(null);
  const [structureReport, setStructureReport] = useState<FormStructure | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  function handleReset() {
    setUrl('');
    setOptions(DEFAULT_OPTIONS);
    setDataMode('valid');
    setReport(null);
    setLogicReport(null);
    setAiReport(null);
    setStructureReport(null);
    setLoading(false);
    setError(null);
    setModalOpen(false);
  }

  async function handleRun() {
    if (!url.trim()) {
      setError('Please enter a form URL.');
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);
    setLogicReport(null);
    setAiReport(null);
    setStructureReport(null);

    try {
      // Sprint 1 — always run field/regex/required tests
      const result = await runTest(url.trim(), options, dataMode);
      setReport(result);

      // Sprint 2 — run conditional logic test only when checkbox is on
      if (options.conditional) {
        const logicResult = await runLogicTest(url.trim());
        setLogicReport(logicResult);
      }

      // Sprint 3 — run AI test generation when checkbox is on
      if (options.aiGeneration) {
        const aiResult = await generateTests(url.trim(), {
          aiGeneration: true,
          coverage: options.coverage,
        });
        setAiReport(aiResult);
      }
      // Sprint 4 — Form Structure always runs (core feature)
      const structureResult = await getFormStructure(url.trim());
      setStructureReport(structureResult);
      setModalOpen(true);
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
          <p className="text-xs text-gray-400 mt-0.5">Sprint 3</p>
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

        {/* Loading indicator */}
        {loading && (
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-500 animate-pulse">Running tests… this may take up to 30s</p>
          </div>
        )}

        {/* Error inline */}
        {!loading && error && (
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm text-red-600">✖ {error}</p>
          </div>
        )}

        {/* View results link (when modal is closed but results exist) */}
        {!modalOpen && (report || logicReport || aiReport || structureReport) && !error && (
          <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
            <p className="text-xs text-gray-400">Last run complete</p>
            <button
              onClick={() => setModalOpen(true)}
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 underline underline-offset-2 transition-colors"
            >
              View results ↗
            </button>
          </div>
        )}
      </div>

      {/* Results modal */}
      <ResultsModal
        open={modalOpen}
        report={report}
        logicReport={logicReport}
        aiReport={aiReport}
        structureReport={structureReport}
        onClose={() => setModalOpen(false)}
        onRunAgain={handleReset}
      />
    </div>
  );
}
