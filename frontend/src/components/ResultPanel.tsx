import { TestReport, LogicTestReport, AITestReport } from '../services/api.service';

interface Props {
  report: TestReport | null;
  logicReport: LogicTestReport | null;
  aiReport: AITestReport | null;
  loading: boolean;
  error: string | null;
}

function statusIcon(detail: string): string {
  if (detail.startsWith('✔') || detail.startsWith('Summary')) return 'text-green-700';
  if (detail.startsWith('✖')) return 'text-red-600';
  if (detail.startsWith('⚠')) return 'text-yellow-600';
  return 'text-gray-600';
}

export default function ResultPanel({ report, logicReport, aiReport, loading, error }: Props) {
  if (loading) {
    return (
      <div className="border-t border-gray-200 pt-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
          Results
        </p>
        <p className="text-sm text-gray-500 animate-pulse">
          Running tests… this may take up to 30s
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-t border-gray-200 pt-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
          Results
        </p>
        <p className="text-sm text-red-600">✖ {error}</p>
      </div>
    );
  }

  if (!report && !logicReport && !aiReport) {
    return (
      <div className="border-t border-gray-200 pt-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
          Results
        </p>
        <p className="text-sm text-gray-400">No results yet. Run a test to see output here.</p>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 pt-4 space-y-4">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
        Results
      </p>

      {/* Sprint 1 report */}
      {report && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-widest">Fields &amp; Validation</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-green-700 font-semibold">✔ Passed: {report.passed}</span>
            <span className="text-red-600 font-semibold">✖ Failed: {report.failed}</span>
            <span className="text-yellow-600 font-semibold">⚠ Warnings: {report.warnings}</span>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded p-3 max-h-52 overflow-y-auto">
            <ul className="space-y-1">
              {report.details.map((detail, i) => (
                <li key={i} className={`text-xs leading-relaxed ${statusIcon(detail)}`}>
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Sprint 2 logic report */}
      {logicReport && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-widest">Conditional Logic</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-green-700 font-semibold">✔ Passed: {logicReport.passed}</span>
            <span className="text-red-600 font-semibold">✖ Failed: {logicReport.failed}</span>
            <span className="text-orange-600 font-semibold">⚠ Logic errors: {logicReport.logicErrors}</span>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded p-3 max-h-52 overflow-y-auto">
            <ul className="space-y-1">
              {logicReport.details.map((detail, i) => (
                <li key={i} className={`text-xs leading-relaxed ${statusIcon(detail)}`}>
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Sprint 3 AI report */}
      {aiReport && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-widest">AI Results</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-indigo-700 font-semibold">✔ Tests generated: {aiReport.testsGenerated}</span>
            <span className="text-indigo-700 font-semibold">✔ Coverage: {aiReport.coverage}%</span>
            <span className="text-orange-600 font-semibold">⚠ Edge cases: {aiReport.edgeCases}</span>
          </div>

          {/* Coverage detail bar */}
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

          <div className="bg-gray-50 border border-gray-200 rounded p-3 max-h-52 overflow-y-auto">
            <ul className="space-y-1">
              {aiReport.details.map((detail, i) => (
                <li key={i} className={`text-xs leading-relaxed ${statusIcon(detail)}`}>
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
