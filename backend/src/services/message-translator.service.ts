/**
 * Message Translator Service  — Human Readable Interpretation Layer
 *
 * Converts raw technical detail strings emitted by the test engines
 * into clear, descriptive messages suitable for:
 *   - QA analysts
 *   - Functional testers
 *   - Business teams
 *   - Non-technical stakeholders
 *
 * ⚠  This layer ONLY affects the presentation of messages.
 *    It does NOT alter validation logic, test results, or internal state.
 *
 * Used by: report.service  (Sprint 1 + 2)
 *          generate-tests.controller  (Sprint 3)
 */

// ─── Semantic Field Name Resolver ─────────────────────────────────────────────

/**
 * Converts a raw technical identifier (CSS selector, camelCase id, name attr)
 * into a human-friendly label.
 *
 * Priority:
 *  1. Known keyword dictionary (business terms in Spanish)
 *  2. CSS selector cleanup → capitalised words
 *  3. Raw value as fallback
 */
function friendlyName(raw: string): string {
  // Strip CSS selector wrappers
  let clean = raw
    .replace(/^#/, '')
    .replace(/^input\[name="(.+?)"\]$/, '$1')
    .replace(/^select\[name="(.+?)"\]$/, '$1')
    .replace(/^textarea\[name="(.+?)"\]$/, '$1')
    .replace(/^\w+:nth-of-type\(\d+\)$/, '') // nth-of-type selectors — uninformative
    .trim();

  // camelCase / PascalCase → spaced words
  clean = clean.replace(/([a-z])([A-Z])/g, '$1 $2');
  // kebab-case / snake_case → spaces
  clean = clean.replace(/[-_]/g, ' ').trim();

  if (clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  // ── Known keyword dictionary ─────────────────────────────────────────────
  const dict: [RegExp, string][] = [
    [/\bemail\b|\bcorreo\b|\bmail\b/i,              'Correo Electrónico'],
    [/\bphone\b|\btelefono\b|\btel\b|\bmovil\b|\bcelular\b|\bmobile\b/i, 'Teléfono'],
    [/\bage\b|\bedad\b/i,                           'Edad'],
    [/\bbirthdate\b|\bnacimiento\b|\bbirth\b/i,     'Fecha de Nacimiento'],
    [/\bfirstname\b|\bnombre\b/i,                   'Nombre'],
    [/\blastname\b|\bapellido\b|\bsurname\b/i,      'Apellido'],
    [/\bfullname\b|\bnombrecompleto\b/i,            'Nombre Completo'],
    [/\baddress\b|\bdireccion\b/i,                  'Dirección'],
    [/\bcity\b|\bciudad\b/i,                        'Ciudad'],
    [/\bcountry\b|\bpais\b/i,                       'País'],
    [/\bzip\b|\bpostal\b|\bcodigopostal\b/i,        'Código Postal'],
    [/\bdocument\b|\bcedula\b|\bdni\b|\bnit\b/i,    'Número de Documento'],
    [/\bpassword\b|\bcontrasena\b|\bclave\b/i,       'Contraseña'],
    [/\bgender\b|\bgenero\b|\bsexo\b/i,             'Género'],
    [/\bvehicle\b|\bvehiculo\b|\bauto\b|\bcarro\b/i,'Vehículo'],
    [/\bincome\b|\bingresos\b|\bsalary\b|\bsalario\b/i, 'Ingresos'],
    [/\boccupation\b|\bocupacion\b|\bprofesion\b/i, 'Ocupación'],
    [/\bcompany\b|\bempresa\b/i,                    'Empresa'],
    [/\bdate\b|\bfecha\b/i,                         'Fecha'],
    [/\burl\b|\bwebsite\b|\bsitio\b/i,              'Sitio Web'],
    [/\bcomments?\b|\bcomentarios?\b|\bnotes?\b|\bnotas?\b/i, 'Comentarios'],
    [/\bconfirm\b|\bconfirmacion\b/i,               'Confirmación'],
    [/\bpanel\b/i,                                  'Panel'],
    [/\bsection\b|\bseccion\b/i,                    'Sección'],
  ];

  const probe = (clean || raw).toLowerCase();
  for (const [pattern, label] of dict) {
    if (pattern.test(probe)) return label;
  }

  return clean || raw;
}

// ─── Change-type localisation ─────────────────────────────────────────────────

function changeTypeES(type: string): string {
  const map: Record<string, string> = {
    appeared:    'apareció en pantalla',
    disappeared: 'se ocultó de pantalla',
    enabled:     'quedó habilitado',
    disabled:    'quedó deshabilitado',
  };
  return map[type] ?? type;
}

function actionES(action: string): string {
  return action === 'show' ? 'mostrarse' : 'ocultarse';
}

function categoryES(category: string): string {
  const map: Record<string, string> = {
    email:    'correo electrónico',
    phone:    'teléfono',
    age:      'edad (numérico)',
    numeric:  'número',
    date:     'fecha',
    url:      'URL / sitio web',
    name:     'nombre',
    text:     'texto',
    checkbox: 'casilla de selección',
    select:   'lista desplegable',
  };
  return map[category] ?? category;
}

// ─── Translation rule table ───────────────────────────────────────────────────
// Each entry: [pattern, replacer]
// Patterns are matched against the raw detail line (after trimming).
// The replacer receives the RegExpMatchArray and returns the translated string.

type TranslationRule = [RegExp, (m: RegExpMatchArray) => string];

const RULES: TranslationRule[] = [

  // ── Summary lines ───────────────────────────────────────────────────────────
  [
    /^Summary — Passed: (\d+), Failed: (\d+), Warnings: (\d+)$/,
    (m) => `Resumen — Aprobados: ${m[1]} | Fallidos: ${m[2]} | Advertencias: ${m[3]}`,
  ],
  [
    /^Summary — Passed: (\d+), Failed: (\d+), Logic errors: (\d+)$/,
    (m) => `Resumen — Aprobados: ${m[1]} | Fallidos: ${m[2]} | Errores de lógica: ${m[3]}`,
  ],

  // ── Sprint 1: Hidden fields ─────────────────────────────────────────────────
  [
    /^⚠ Hidden field detected: (.+)$/,
    (m) => `⚠ El campo "${friendlyName(m[1])}" está oculto y no es visible para el usuario.`,
  ],
  [
    /^✔ No unexpected hidden fields found\.$/,
    () => '✔ No se encontraron campos ocultos inesperados en el formulario.',
  ],

  // ── Sprint 1: Required fields ───────────────────────────────────────────────
  [
    /^✔ Browser validation triggered for: (.+)$/,
    (m) => `✔ La validación de campos obligatorios se activó correctamente para: ${m[1]}.`,
  ],
  [
    /^⚠ Required fields present but browser validation did not trigger/,
    () => '⚠ El formulario tiene campos obligatorios pero no los validó al intentar enviarlo — puede estar usando validación personalizada con JavaScript.',
  ],
  [
    /^✔ No required fields found that block submission\.$/,
    () => '✔ No se encontraron campos obligatorios que bloqueen el envío del formulario.',
  ],
  [
    /^⚠ No submit button found/,
    () => '⚠ No se encontró un botón de envío — la verificación de campos obligatorios fue omitida.',
  ],
  [
    /^⚠ Could not interact with required field: (.+)$/,
    (m) => `⚠ No fue posible interactuar con el campo obligatorio "${friendlyName(m[1])}".`,
  ],

  // ── Sprint 1: Regex / pattern validation ────────────────────────────────────
  [
    /^⚠ No fields with pattern attribute found\.$/,
    () => '⚠ No se encontraron campos con restricción de formato (patrón) en el formulario.',
  ],
  [
    /^✔ Pattern valid for: (.+) \(value: "(.+)"\)$/,
    (m) => `✔ El campo "${friendlyName(m[1])}" acepta correctamente valores con el formato esperado (valor probado: "${m[2]}").`,
  ],
  [
    /^✖ Pattern mismatch for: (.+) — value "(.+)" did not satisfy pattern "(.+)"$/,
    (m) => `✖ El campo "${friendlyName(m[1])}" rechazó el valor "${m[2]}" — no cumple el formato requerido.`,
  ],
  [
    /^⚠ Invalid value was accepted by: (.+) — pattern may not be enforced\.$/,
    (m) => `⚠ El campo "${friendlyName(m[1])}" aceptó un valor inválido — la validación de formato puede no estar activa.`,
  ],
  [
    /^⚠ Could not verify pattern on: (.+)$/,
    (m) => `⚠ No se pudo verificar el formato en el campo "${friendlyName(m[1])}".`,
  ],
  [
    /^✖ Error testing pattern field (.+): .+$/,
    (m) => `✖ Ocurrió un error al probar el formato del campo "${friendlyName(m[1])}".`,
  ],

  // ── Sprint 1: Submission ─────────────────────────────────────────────────────
  [
    /^✔ Form submitted without visible errors\.$/,
    () => '✔ El formulario se envió correctamente sin errores visibles.',
  ],
  [
    /^✖ Form error after submit: "(.+)"$/,
    (m) => `✖ El formulario mostró el siguiente error al ser enviado: "${m[1]}".`,
  ],

  // ── Sprint 2: No rules / no controls ───────────────────────────────────────
  [
    /^⚠ No explicit conditional rules detected/,
    () => '⚠ No se detectaron reglas condicionales explícitas en el formulario (aria-controls, data-condition, etc.).',
  ],
  [
    /^⚠ Falling back to interaction-observation mode only\.$/,
    () => '⚠ Se utilizará el modo de observación de interacciones para detectar lógica condicional.',
  ],
  [
    /^⚠ No enumerable controls found to simulate/,
    () => '⚠ No se encontraron controles interactivos (listas, radios, casillas) para simular interacciones.',
  ],

  // ── Sprint 2: Explicit conditional rules ────────────────────────────────────
  [
    /^✔ Conditional rule passed: "(.+)" correctly (show|hide)s when "(.+)" is triggered$/,
    (m) => `✔ Regla condicional correcta: la sección/campo "${m[1]}" se ${m[2] === 'show' ? 'muestra' : 'oculta'} correctamente cuando se activa "${m[3]}".`,
  ],
  [
    /^✖ Conditional rule failed: "(.+)" expected to (show|hide) but instead (\w+) — trigger: "(.+)"$/,
    (m) => `✖ Regla condicional fallida: "${m[1]}" debería ${actionES(m[2])} al activar "${m[4]}", pero en su lugar ${changeTypeES(m[3])}.`,
  ],
  [
    /^✖ Logic error: "(.+)" did not respond to interaction on "(.+)" — expected (show|hide)/,
    (m) => `✖ Error de lógica: "${m[1]}" no respondió a la interacción en "${m[2]}" — se esperaba que ${actionES(m[3])}.`,
  ],
  [
    /^✖ Logic error: Field "(.+)" disappeared after interacting with "(.+)" — was initially visible$/,
    (m) => `✖ Error de lógica: El campo "${m[1]}" desapareció al interactuar con "${m[2]}", aunque estaba visible al cargar el formulario.`,
  ],

  // ── Sprint 2: Observed interactions ─────────────────────────────────────────
  [
    /^(✔|⚠) Observed: (Panel|Field) "(.+)" (appeared|disappeared|enabled|disabled) after setting "(.+)" = "(.+)"$/,
    (m) => {
      const kind = m[2] === 'Panel' ? 'La sección' : 'El campo';
      return `${m[1]} ${kind} "${m[3]}" ${changeTypeES(m[4])} al establecer "${m[5]}" en "${m[6]}".`;
    },
  ],

  // ── Sprint 2: Hidden panels summary ─────────────────────────────────────────
  [
    /^⚠ Found (\d+) initially hidden panel\(s\): (.+)$/,
    (m) => `⚠ Se encontraron ${m[1]} sección(es) inicialmente oculta(s): ${m[2]}.`,
  ],
  [
    /^⚠ Panel "(.+)" remained hidden throughout all interactions/,
    (m) => `⚠ La sección "${m[1]}" permaneció oculta durante todas las interacciones — su activador puede no ser un control enumerable.`,
  ],
  [
    /^✔ No hidden panels found at initial load\.$/,
    () => '✔ No se encontraron secciones ocultas al cargar el formulario.',
  ],

  // ── Sprint 3: AI generation summary ─────────────────────────────────────────
  [
    /^✔ Scanned (\d+) field\(s\) — (\d+) visible$/,
    (m) => `✔ Se analizaron ${m[1]} campo(s) en el formulario — ${m[2]} visible(s).`,
  ],
  [
    /^✔ Inferred schema categories: (.+)$/,
    (m) => {
      const cats = m[1].split(', ').map(categoryES).join(', ');
      return `✔ Tipos de campo detectados: ${cats}.`;
    },
  ],
  [
    /^✔ Scenario breakdown — Happy: (\d+) \| Negative: (\d+) \| Edge: (\d+) \| Conditional: (\d+)$/,
    (m) => `✔ Distribución de escenarios — Válidos: ${m[1]} | Inválidos: ${m[2]} | Casos extremos: ${m[3]} | Condicionales: ${m[4]}.`,
  ],
  [
    /^✔ Total test cases after optimisation: (\d+)$/,
    (m) => `✔ Total de casos de prueba tras optimización: ${m[1]}.`,
  ],
  [
    /^✔ Removed (\d+) redundant duplicate case\(s\) across fields$/,
    (m) => `✔ Se eliminaron ${m[1]} caso(s) redundante(s) entre campos.`,
  ],
  [
    /^📊 Coverage: (\d+)%(.*)$/,
    (m) => `📊 Cobertura de pruebas: ${m[1]}%${m[2]}.`,
  ],
  [
    /^⚠ Missing scenarios: (\d+)$/,
    (m) => `⚠ Escenarios sin cobertura: ${m[1]}.`,
  ],
  [
    /^⚠ No form fields detected at the given URL\.$/,
    () => '⚠ No se detectaron campos de formulario en la URL proporcionada.',
  ],

  // ── Sprint 3: Scenario sample lines  (indented "  · ..." lines) ─────────────
  [
    /^\s+·\s+\[(happy)\] (.+?): valid (\w+) input accepted$/,
    (m) => `  · Campo "${friendlyName(m[2])}": se verifica que acepta datos válidos de tipo ${categoryES(m[3])}.`,
  ],
  [
    /^\s+·\s+\[(negative)\] (.+?): invalid (\w+) input rejected$/,
    (m) => `  · Campo "${friendlyName(m[2])}": se verifica que rechaza datos inválidos de tipo ${categoryES(m[3])}.`,
  ],
  [
    /^\s+·\s+\[(negative)\] (.+?): empty value rejected \(required field\)$/,
    (m) => `  · Campo "${friendlyName(m[2])}": se verifica que no permite envío vacío (campo obligatorio).`,
  ],
  [
    /^\s+·\s+\[(edge #\d+)\] (.+?): boundary value "(.+)"$/,
    (m) => `  · Campo "${friendlyName(m[2])}": caso extremo — valor límite "${m[3]}".`,
  ],
];

// ─── Core translation function ────────────────────────────────────────────────

/**
 * Attempts to translate a single raw detail line.
 * Returns the translated string, or the original if no rule matches.
 */
function translateLine(line: string): string {
  const trimmed = line.trimEnd();
  for (const [pattern, replacer] of RULES) {
    const match = trimmed.match(pattern);
    if (match) return replacer(match);
  }
  return trimmed; // pass-through: unknown lines are kept as-is
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Translates an array of raw technical detail strings into
 * human-readable, business-friendly messages.
 *
 * Order and count of items is preserved.
 * Unknown lines are passed through unchanged.
 */
export function translateDetails(details: string[]): string[] {
  return details.map(translateLine);
}
