import { useEffect, useState } from 'react';
import { TestReport, LogicTestReport, AITestReport, FormStructure } from '../services/api.service';
import FormStructureTab from './FormStructureTab';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  report: TestReport | null;
  logicReport: LogicTestReport | null;
  aiReport: AITestReport | null;
  structureReport: FormStructure | null;
  onClose: () => void;
  onRunAgain: () => void;
}

type TabId = 'fields' | 'logic' | 'ai' | 'structure';

interface Partitioned {
  passed: string[];
  failed: string[];
  warnings: string[];
  other: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function partitionDetails(details: string[]): Partitioned {
  return {
    passed:   details.filter(d => d.startsWith('✔') || d.startsWith('Summary')),
    failed:   details.filter(d => d.startsWith('✖')),
    warnings: details.filter(d => d.startsWith('⚠')),
    other:    details.filter(d =>
      !d.startsWith('✔') && !d.startsWith('✖') &&
      !d.startsWith('⚠') && !d.startsWith('Summary')
    ),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SectionProps {
  icon: string;
  label: string;
  count: number;
  items: string[];
  headerColor: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  badgeBg: string;
}

function ResultSection({
  icon, label, count, items,
  headerColor, borderColor, bgColor, textColor, badgeBg,
}: SectionProps) {
  return (
    <div className={`rounded border ${borderColor} overflow-hidden`}>
      {/* Section header */}
      <div className={`flex items-center gap-2 px-3 py-2 ${bgColor}`}>
        <span className={`text-xs font-bold uppercase tracking-widest ${headerColor}`}>
          {icon} {label}
        </span>
        <span className={`text-xs font-bold leading-none px-1.5 py-0.5 rounded-full ${badgeBg} ${headerColor}`}>
          {count}
        </span>
      </div>
      {/* Items */}
      <ul className="px-3 py-2 space-y-1">
        {items.map((item, i) => (
          <li key={i} className={`text-xs leading-relaxed ${textColor}`}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface GroupsProps {
  details: string[];
}

function ResultGroups({ details }: GroupsProps) {
  const { passed, failed, warnings, other } = partitionDetails(details);

  return (
    <div className="space-y-2">
      {passed.length > 0 && (
        <ResultSection
          icon="✔" label="Passed" count={passed.length} items={passed}
          headerColor="text-green-700"
          borderColor="border-green-200"
          bgColor="bg-green-50"
          textColor="text-green-800"
          badgeBg="bg-white/70"
        />
      )}
      {failed.length > 0 && (
        <ResultSection
          icon="✖" label="Failed" count={failed.length} items={failed}
          headerColor="text-red-600"
          borderColor="border-red-200"
          bgColor="bg-red-50"
          textColor="text-red-700"
          badgeBg="bg-white/70"
        />
      )}
      {warnings.length > 0 && (
        <ResultSection
          icon="⚠" label="Warnings" count={warnings.length} items={warnings}
          headerColor="text-yellow-700"
          borderColor="border-yellow-200"
          bgColor="bg-yellow-50"
          textColor="text-yellow-800"
          badgeBg="bg-white/70"
        />
      )}
      {other.length > 0 && (
        <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
          <ul className="space-y-1">
            {other.map((d, i) => (
              <li key={i} className="text-xs leading-relaxed text-gray-500">{d}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ResultsModal({
  open,
  report,
  logicReport,
  aiReport,
  structureReport,
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
      else if (structureReport) setActiveTab('structure');
    }
  }, [open, report, logicReport, aiReport, structureReport]);

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
    { id: 'fields',    label: 'Fields & Validation', available: !!report },
    { id: 'logic',     label: 'Conditional Logic',   available: !!logicReport },
    { id: 'ai',        label: 'AI Coverage',          available: !!aiReport },
    { id: 'structure', label: 'Form Structure',       available: !!structureReport },
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

        {/* Tab bar */}
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
              {/* Summary counts */}
              <div className="flex flex-wrap gap-4 text-sm pb-1 border-b border-gray-100">
                <span className="text-green-700 font-semibold">✔ Passed: {report.passed}</span>
                <span className="text-red-600 font-semibold">✖ Failed: {report.failed}</span>
                <span className="text-yellow-700 font-semibold">⚠ Warnings: {report.warnings}</span>
              </div>
              {/* Grouped detail items */}
              <ResultGroups details={report.details} />
            </>
          )}

          {/* TAB 2 — Conditional Logic */}
          {activeTab === 'logic' && logicReport && (
            <>
              {/* Summary counts */}
              <div className="flex flex-wrap gap-4 text-sm pb-1 border-b border-gray-100">
                <span className="text-green-700 font-semibold">✔ Passed: {logicReport.passed}</span>
                <span className="text-red-600 font-semibold">✖ Failed: {logicReport.failed}</span>
                <span className="text-orange-600 font-semibold">⚠ Logic errors: {logicReport.logicErrors}</span>
              </div>
              {/* Grouped detail items */}
              <ResultGroups details={logicReport.details} />
            </>
          )}

          {/* TAB 3 — AI Coverage */}
          {activeTab === 'ai' && aiReport && (
            <>
              {/* AI summary + coverage bar */}
              <div className="space-y-2 pb-1 border-b border-gray-100">
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
              </div>
              {/* Grouped detail items */}
              <ResultGroups details={aiReport.details} />
            </>
          )}

          {/* TAB 4 — Form Structure */}
          {activeTab === 'structure' && structureReport && (
            <FormStructureTab structure={structureReport} />
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
