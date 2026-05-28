import { useEffect, useState } from 'react';
import { TestReport, LogicTestReport, AITestReport } from '../services/api.service';

interface Props {
  open: boolean;
  report: TestReport | null;
  logicReport: LogicTestReport | null;
  aiReport: AITestReport | null;
  onClose: () => void;
  onRunAgain: () => void;
}

type TabId = 'fields' | 'logic' | 'ai';

function statusClass(detail: string): string {
  if (detail.startsWith('✔') || detail.startsWith('Summary')) return 'text-green-700';
  if (detail.startsWith('✖')) return 'text-red-600';
  if (detail.startsWith('⚠')) return 'text-yellow-600';
  return 'text-gray-600';
}

export default function ResultsModal({
  open,
  report,
  logicReport,
  aiReport,
  onClose,
  onRunAgain,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('fields');

  // Reset to first available tab each time the modal opens
  useEffect(() => {
    if (open) {
      if (report) setActiveTab('fields');
      else if (logicReport) setActiveTab('logic');
      else if (aiReport) setActiveTab('ai');
    }
  }, [open, report, logicReport, aiReport]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const tabs: { id: TabId; label: string; available: boolean }[] = [
    { id: 'fields', label: 'Fields & Validation', available: !!report },
    { id: 'logic',  label: 'Conditional Logic',   available: !!logicReport },
    { id: 'ai',     label: 'AI Coverage',          available: !!aiReport },
  ];

  const visibleTabs = tabs.filter((t) => t.available);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div className="relative z-10 bg-white border border-gray-200 rounded-lg shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[88vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-gray-900">Test Results</h2>
            <p className="text-xs text-gray-400 mt-0.5">AEM Forms QA Assistant</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors text-base leading-none p-1"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        {visibleTabs.length > 1 && (
          <div className="flex border-b border-gray-200 px-5 shrink-0">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-xs font-semibold uppercase tracking-widest py-3 mr-5 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

          {/* TAB 1 — Fields & Validation */}
          {activeTab === 'fields' && report && (
            <>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-green-700 font-semibold">✔ Passed: {report.passed}</span>
                <span className="text-red-600 font-semibold">✖ Failed: {report.failed}</span>
                <span className="text-yellow-600 font-semibold">⚠ Warnings: {report.warnings}</span>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded p-3 max-h-72 overflow-y-auto">
                <ul className="space-y-1">
                  {report.details.map((d, i) => (
                    <li key={i} className={`text-xs leading-relaxed ${statusClass(d)}`}>{d}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* TAB 2 — Conditional Logic */}
          {activeTab === 'logic' && logicReport && (
            <>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-green-700 font-semibold">✔ Passed: {logicReport.passed}</span>
                <span className="text-red-600 font-semibold">✖ Failed: {logicReport.failed}</span>
                <span className="text-orange-600 font-semibold">⚠ Logic errors: {logicReport.logicErrors}</span>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded p-3 max-h-72 overflow-y-auto">
                <ul className="space-y-1">
                  {logicReport.details.map((d, i) => (
                    <li key={i} className={`text-xs leading-relaxed ${statusClass(d)}`}>{d}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* TAB 3 — AI Coverage */}
          {activeTab === 'ai' && aiReport && (
            <>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-indigo-700 font-semibold">✔ Tests generated: {aiReport.testsGenerated}</span>
                <span className="text-indigo-700 font-semibold">✔ Coverage: {aiReport.coverage}%</span>
                <span className="text-orange-600 font-semibold">⚠ Edge cases: {aiReport.edgeCases}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${aiReport.coverage}%` }}
                />
              </div>
              {aiReport.coverageStats.totalFields > 0 && (
                <p className="text-xs text-gray-500">
                  Fields: {aiReport.coverageStats.fieldsCovered}/{aiReport.coverageStats.totalFields}
                  {aiReport.coverageStats.totalRules > 0 &&
                    ` · Rules: ${aiReport.coverageStats.rulesCovered}/${aiReport.coverageStats.totalRules}`}
                  {aiReport.coverageStats.missingScenarios > 0 &&
                    ` · Missing: ${aiReport.coverageStats.missingScenarios} scenario(s)`}
                </p>
              )}
              <div className="bg-gray-50 border border-gray-200 rounded p-3 max-h-64 overflow-y-auto">
                <ul className="space-y-1">
                  {aiReport.details.map((d, i) => (
                    <li key={i} className={`text-xs leading-relaxed ${statusClass(d)}`}>{d}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 shrink-0">
          <button
            onClick={onRunAgain}
            className="text-xs font-semibold uppercase tracking-widest text-gray-700 border border-gray-300 rounded px-4 py-2 hover:bg-gray-50 transition-colors"
          >
            Run Again
          </button>
          <button
            onClick={onClose}
            className="text-xs font-semibold uppercase tracking-widest bg-gray-900 text-white rounded px-4 py-2 hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
