import type { BodyMetric } from "./composition";

// Geraete-lokale Ansicht der Koerpermessung: welche Metrik der Mess-Chart zeigt
// und ob der „Ziele"-Umschalter an ist. Wie die Anheftungen bewusst nur auf
// diesem Geraet gehalten, getrennt vom synchronisierten Datenbestand und NICHT
// im Export/Restore. Diese Datei haelt nur die reinen Helfer + Typ; die
// Persistenz (localStorage) und der React-Store liegen in
// hooks/useBodyMeasureView.ts.

export interface BodyMeasureView {
  metric: BodyMetric;
  goals: boolean;
}

// Eigener, versionierter localStorage-Schluessel.
export const BODY_VIEW_STORAGE_KEY = "ks_body_view_v1";

export const DEFAULT_BODY_VIEW: BodyMeasureView = {
  metric: "weight",
  goals: false,
};

const VALID_METRICS: readonly BodyMetric[] = [
  "weight",
  "fat",
  "muscle",
  "water",
  "phase",
];

function isValidMetric(m: unknown): m is BodyMetric {
  return typeof m === "string" && (VALID_METRICS as readonly string[]).includes(m);
}

// Aus localStorage gelesenen Rohtext sicher in eine Ansicht uebersetzen. Defekte
// oder fehlende Felder fallen auf den Standard zurueck (Metrik „weight", Ziele
// aus), sodass ein kaputter Eintrag die Seite nie blockiert.
export function parseBodyView(raw: string | null): BodyMeasureView {
  if (!raw) return { ...DEFAULT_BODY_VIEW };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_BODY_VIEW };
  }
  if (!data || typeof data !== "object") return { ...DEFAULT_BODY_VIEW };
  const o = data as Record<string, unknown>;
  return {
    metric: isValidMetric(o.metric) ? o.metric : DEFAULT_BODY_VIEW.metric,
    goals: typeof o.goals === "boolean" ? o.goals : DEFAULT_BODY_VIEW.goals,
  };
}

export function serializeBodyView(v: BodyMeasureView): string {
  return JSON.stringify(v);
}

// Reine Setzer (kein Mutieren des Eingangs) fuer den Store.
export function withMetric(
  v: BodyMeasureView,
  metric: BodyMetric,
): BodyMeasureView {
  return { ...v, metric };
}

export function withGoals(v: BodyMeasureView, goals: boolean): BodyMeasureView {
  return { ...v, goals };
}
