import { FormField, FormPanel, FormStructure } from '../services/api.service';

// ─── Field card ───────────────────────────────────────────────────────────────

function FieldCard({ field }: { field: FormField }) {
  const badges: { label: string; active: boolean; on: string; off: string }[] = [
    { label: 'Required', active: field.required, on: 'bg-red-100 text-red-700',    off: 'bg-gray-100 text-gray-400' },
    { label: 'Visible',  active: field.visible,  on: 'bg-green-100 text-green-700', off: 'bg-gray-100 text-gray-400' },
    { label: 'Readonly', active: field.readonly,  on: 'bg-yellow-100 text-yellow-700', off: '' },
    { label: 'Disabled', active: field.disabled,  on: 'bg-orange-100 text-orange-700', off: '' },
  ];

  return (
    <div className="border border-gray-200 rounded bg-white px-4 py-3 space-y-2">
      {/* Field name + type */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-semibold text-gray-900 leading-tight">{field.label}</span>
        <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{field.type}</span>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-1.5">
        {badges
          .filter(b => b.active || (b.off === '' ? false : true))
          .filter(b => b.active ? true : b.off !== '')
          .map(b => (
            b.active ? (
              <span key={b.label} className={`text-xs font-medium px-2 py-0.5 rounded-full ${b.on}`}>
                {b.label}
              </span>
            ) : (
              <span key={b.label} className={`text-xs px-2 py-0.5 rounded-full ${b.off}`}>
                {b.label}: No
              </span>
            )
          ))}
      </div>

      {/* Regex / pattern */}
      {field.pattern && (
        <div className="flex items-start gap-2">
          <span className="text-xs text-gray-400 uppercase tracking-widest shrink-0 mt-0.5">Regex</span>
          <code className="text-xs font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded break-all leading-relaxed">
            {field.pattern}
          </code>
        </div>
      )}

      {/* Placeholder (if different from label) */}
      {field.placeholder && field.placeholder !== field.label && (
        <p className="text-xs text-gray-400">
          <span className="uppercase tracking-widest">Placeholder</span>{' '}
          <span className="text-gray-600">{field.placeholder}</span>
        </p>
      )}

      {/* Error messages */}
      {field.errors.length > 0 && (
        <div className="border-t border-gray-100 pt-2 space-y-1">
          <p className="text-xs uppercase tracking-widest text-gray-400">Error messages</p>
          <ul className="space-y-0.5">
            {field.errors.map((err, i) => (
              <li key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0">•</span>
                <span>{err}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Panel block ──────────────────────────────────────────────────────────────

const PANEL_TYPE_BADGE: Record<string, string> = {
  fieldset:  'bg-blue-50 text-blue-600',
  section:   'bg-teal-50 text-teal-600',
  accordion: 'bg-purple-50 text-purple-600',
  tab:       'bg-orange-50 text-orange-600',
  group:     'bg-gray-100 text-gray-500',
  unknown:   'bg-gray-100 text-gray-400',
};

function PanelBlock({ panel }: { panel: FormPanel }) {
  const badgeClass = PANEL_TYPE_BADGE[panel.type] ?? PANEL_TYPE_BADGE.unknown;

  return (
    <div className="space-y-2">
      {/* Panel header */}
      <div className="flex items-center gap-2 pt-1">
        <div className="flex-1 h-px bg-gray-200" />
        <div className="flex items-center gap-2 px-1 shrink-0">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-700">
            {panel.name}
          </span>
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${badgeClass}`}>
            {panel.type}
          </span>
        </div>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Fields */}
      <div className="space-y-2 pl-1">
        {panel.fields.map((field, i) => (
          <FieldCard key={field.id || field.name || i} field={field} />
        ))}
      </div>
    </div>
  );
}

// ─── Main tab component ───────────────────────────────────────────────────────

interface Props {
  structure: FormStructure;
}

export default function FormStructureTab({ structure }: Props) {
  const totalFields =
    structure.panels.reduce((n, p) => n + p.fields.length, 0) +
    structure.orphanFields.length;

  if (totalFields === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">
        No form fields detected in the scanned URL.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap gap-4 text-sm pb-1 border-b border-gray-100">
        <span className="text-teal-700 font-semibold">
          ✔ Panels: {structure.panels.length}
        </span>
        <span className="text-gray-700 font-semibold">
          ✔ Fields: {totalFields}
        </span>
        {structure.orphanFields.length > 0 && (
          <span className="text-yellow-700 font-semibold">
            ⚠ Uncategorized: {structure.orphanFields.length}
          </span>
        )}
      </div>

      {/* Panels */}
      {structure.panels.map((panel, i) => (
        <PanelBlock key={panel.name + i} panel={panel} />
      ))}

      {/* Orphan fields */}
      {structure.orphanFields.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-bold uppercase tracking-widest text-yellow-700 px-1 shrink-0">
              Uncategorized Fields
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="space-y-2 pl-1">
            {structure.orphanFields.map((field, i) => (
              <FieldCard key={field.id || field.name || i} field={field} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
