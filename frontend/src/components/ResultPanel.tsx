import { TestReport } from '../services/api.service';

interface Props {
  report: TestReport | null;
  loading: boolean;
  error: string | null;
}

function statusIcon(detail: string): string {
  if (detail.startsWith('✔') || detail.startsWith('Summary')) return 'text-green-700';
  if (detail.startsWith('✖')) return 'text-red-600';
  if (detail.startsWith('⚠')) return 'text-yellow-600';
  return 'text-gray-600';
}

export default function ResultPanel({ report, loading, error }: Props) {
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

  if (!report) {
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
    <div className="border-t border-gray-200 pt-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
        Results
      </p>

      {/* Score bar */}
      <div className="flex gap-6 text-sm">
        <span className="text-green-700 font-semibold">✔ Passed: {report.passed}</span>
        <span className="text-red-600 font-semibold">✖ Failed: {report.failed}</span>
        <span className="text-yellow-600 font-semibold">⚠ Warnings: {report.warnings}</span>
      </div>

      {/* Details */}
      <div className="bg-gray-50 border border-gray-200 rounded p-3 max-h-72 overflow-y-auto">
        <ul className="space-y-1">
          {report.details.map((detail, i) => (
            <li key={i} className={`text-xs leading-relaxed ${statusIcon(detail)}`}>
              {detail}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
