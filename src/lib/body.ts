// Reine Helfer fuer die Koerper-Seite (Phase 9): Muskelkater-Skala, der
// rechnerische Kater-Verfall (-1 pro Tag) samt Regions-Aggregation fuer die
// MuscleMap, und die Aufbereitung der Verlaufszeilen. Kein DOM-/DB-Bezug.
// Portiert 1:1 aus V1 (app.js: KATER_HEX/READY_HEX, soreDaysSince,
// bodySoreValues, bodyHistCard-Chips). Die Region-Aggregation baut auf der
// Muskel-Registry (lib/muscles.ts) auf, deshalb liegt dieses Stueck in lib und
// nicht in der reinen Engine.

import { MUSCLES, regionsForSection } from "@/lib/muscles";

// Skala gruen -> grau. Kater 0 (gut) gruen ... 3 (schlecht) dunkelgrau. Die
// Farbwerte selbst stehen als Bewertungs-Skala in den Design-Tokens
// (--rating-*); hier steht nur, welche Stufe welchen Ton bekommt. Sie werden der
// generischen RatingScale (Buttons) und der MuscleMap (colorFn) hereingereicht.
export const KATER_HEX = [
  "var(--rating-good)",
  "var(--rating-1)",
  "var(--rating-2)",
  "var(--rating-4)",
] as const;
export const KATER_LIGHT = [
  "var(--rating-good-tint)",
  "var(--rating-1-tint)",
  "var(--rating-2-tint)",
  "var(--rating-4-tint)",
] as const;

// Readiness 5 (gut) gruen ... 1 (schlecht) dunkelgrau.
export const READY_HEX: Record<number, string> = {
  5: "var(--rating-good)",
  4: "var(--rating-1)",
  3: "var(--rating-2)",
  2: "var(--rating-3)",
  1: "var(--rating-4)",
};
export const READY_LIGHT: Record<number, string> = {
  5: "var(--rating-good-tint)",
  4: "var(--rating-1-tint)",
  3: "var(--rating-2-tint)",
  2: "var(--rating-3-tint)",
  1: "var(--rating-4-tint)",
};

function clampInt(v: number, lo: number, hi: number): number {
  const r = Math.round(v);
  return r < lo ? lo : r > hi ? hi : r;
}

// Button-Farbe fuer einen Kater-Wert (0..3). selected = gefuellt, sonst dezent.
export function soreButtonColors(v: number, selected: boolean): {
  bg: string;
  fg: string;
} {
  const i = clampInt(v, 0, 3);
  return selected
    ? { bg: KATER_HEX[i], fg: "var(--primary-foreground)" }
    : { bg: KATER_LIGHT[i], fg: KATER_HEX[i] };
}

// Button-Farbe fuer einen Readiness-Wert (1..5).
export function readyButtonColors(v: number, selected: boolean): {
  bg: string;
  fg: string;
} {
  const i = clampInt(v, 1, 5);
  return selected
    ? { bg: READY_HEX[i], fg: "var(--primary-foreground)" }
    : { bg: READY_LIGHT[i], fg: READY_HEX[i] };
}

// MuscleMap-colorFn fuer Kater: Wert 1..3 -> Kater-Hex (0 wird ueber idle in der
// Map abgedeckt; clamp ab 1, damit ein Restwert sichtbar bleibt).
export function soreColor(v: number): string {
  return KATER_HEX[clampInt(v, 1, 3)];
}

// Ganze Tage zwischen zwei ISO-Datumsangaben (>= 0). Null, wenn keins gesetzt.
export function soreDaysSince(
  fromIso: string | null | undefined,
  todayIso: string,
): number | null {
  if (!fromIso) return null;
  const a = Date.parse(fromIso + "T12:00:00");
  const b = Date.parse(todayIso + "T12:00:00");
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.max(0, Math.round((b - a) / 86400000));
}

export interface SoreSource {
  date: string;
  legs?: number;
  upper_body?: number;
  overall?: number;
}

// Geschaetzter aktueller Kater je Region. Quelle ist ausschliesslich der letzte
// Eintrag: pro vergangenem Tag sinkt der Wert um 1 (3 -> nach 3 Tagen 0).
// overall ist die Basis aller Regionen; upper_body/legs ueberschreiben ihre
// Sektion (Maximum). Ergebnis ist eine reine Region->Wert-Map (0..3) fuer ALLE
// Regionen, passend fuer die MuscleMap (Wert 0 faellt dort auf idle).
export function soreRegionValues(
  src: SoreSource | null,
  todayIso: string,
): Record<string, number> | null {
  if (!src || !src.date) return null;
  const d = soreDaysSince(src.date, todayIso) ?? 0;
  const ov = Math.max(0, (src.overall || 0) - d);
  const ub = Math.max(0, (src.upper_body || 0) - d);
  const lg = Math.max(0, (src.legs || 0) - d);
  const out: Record<string, number> = {};
  for (const m of MUSCLES) out[m.id] = ov;
  for (const r of regionsForSection("oberkoerper"))
    out[r] = Math.max(out[r] ?? 0, ub);
  for (const r of regionsForSection("unterkoerper"))
    out[r] = Math.max(out[r] ?? 0, lg);
  return out;
}

// Info-Zeile unter der Kater-Figur ("Letzter Eintrag heute/gestern/vor X Tagen").
export function soreInfoLine(
  src: SoreSource | null,
  todayIso: string,
): string {
  if (!src || !src.date) return "Noch kein Kater erfasst.";
  const d = soreDaysSince(src.date, todayIso) ?? 0;
  const when = d === 0 ? "heute" : d === 1 ? "gestern" : "vor " + d + " Tagen";
  return "Letzter Eintrag " + when + " · -1/Tag";
}

// Chips einer Befinden-Verlaufszeile (Beine/OK/Gesamt/Readiness + ggf. Schmerz).
export interface BodyLogLike {
  legs?: number;
  upper_body?: number;
  overall?: number;
  readiness?: number;
  pain_flag?: boolean;
}
export function bodyLogChips(e: BodyLogLike): string[] {
  const chips = [
    "Beine " + (e.legs || 0),
    "OK " + (e.upper_body || 0),
    "Ges " + (e.overall || 0),
    "Rdy " + (e.readiness || 3),
  ];
  if (e.pain_flag) chips.push("Schmerz");
  return chips;
}
