// Lastliste einer Phase: je Phasenwoche der Anteil des beim Journey-Start
// eingefrorenen Referenzgewichts, mit dem gearbeitet wird. Sie ersetzt den
// einzelnen Lastfaktor (Konzept Bausteine, Abschnitt 7).
//
// Bewusst eine Liste und keine Formel: Der Vorlaeufer interpolierte zwischen
// Start- und Zielanteil ueber die Phasenwochen und wurde zurueckgebaut
// (ADR-0018). Eine Liste entsteht einmal beim Anlegen der Phase - genau wie der
// Wochenplan - und wird danach nur noch gelesen. Das erspart die Division durch
// null bei einer Ein-Wochen-Phase, das Weiterlaufen ueber den Zielwert hinaus
// bei einer ueberlangen Phase und den Zwang, dieselbe Rechnung in jeder Anzeige
// noch einmal zu bauen.
//
// Reine Rechenlogik ohne DB-/DOM-Bezug. Gespeichert wird die Liste an der Phase
// (load_plan), gelesen wird sie ueber loadPlanForWeek.

import { z } from "zod";

import type { LoadBuilderName } from "./weekPlan";

// ---- Form -------------------------------------------------------------------

/** Eine Woche der Lastliste. Quelle der Wahrheit fuer die Form ist dieses
 *  Schema; der TypeScript-Typ wird daraus abgeleitet. */
export const loadPlanWeekSchema = z.object({
  /** 1-basierte Woche innerhalb der Phase. */
  week: z.number().int().positive(),
  /** Anteil des Referenzgewichts (0.65 = 65 %, 1 = volles Niveau). */
  loadPct: z.number().positive(),
});
export type LoadPlanWeek = z.infer<typeof loadPlanWeekSchema>;

/** Die ganze Liste: eine Zeile je Phasenwoche, aufsteigend nach week. */
export const loadPlanSchema = z.array(loadPlanWeekSchema);
export type LoadPlan = z.infer<typeof loadPlanSchema>;

/** Lastliste aus einem unbekannten Wert (z. B. jsonb-Spalte) lesen. Alles, was
 *  nicht zur Form passt, gilt als „keine Vorgabe" - dann bleibt es beim
 *  gewohnten Verhalten, statt mit halben Daten zu rechnen. */
export function parseLoadPlan(value: unknown): LoadPlan | null {
  if (value == null) return null;
  const parsed = loadPlanSchema.safeParse(value);
  if (!parsed.success || parsed.data.length === 0) return null;
  return parsed.data;
}

// ---- Bauregel ---------------------------------------------------------------
// Die Lastliste entsteht einmal beim Anlegen der Phase - genau wie der
// Wochenplan - und wird danach nur noch gelesen. Welcher Baustein nach welcher
// Regel baut, steht in der Bausteine-Tabelle (`load_builder`); die Rechnung
// dazu steht hier (Konzept Bausteine, Abschnitt 6).

/** Anteil auf vier Nachkommastellen bringen (0,01 %). Das ist kein Raster,
 *  sondern das Wegraeumen des Rechenrauschens: 0,65 + 2 × 0,06 soll 0,77
 *  ergeben und nicht 0,7700000000000001. Auf volle 5 % wird bewusst nicht
 *  gerundet - bei fuenf Wochen ergaebe das ungleiche Schritte, und das
 *  gerechnete Gewicht landet ohnehin auf einer ladbaren Stufe. */
function gerundeterAnteil(pct: number): number {
  return Math.round(pct * 10000) / 10000;
}

/**
 * Bauregel `rebuild_ramp` des Wiederaufbaus: gleichmaessig verteilte Stufen vom
 * Start- auf den Zielanteil, eine je Phasenwoche.
 *
 * Drei Wochen ergeben 65/80/95, sechs Wochen 65/71/77/83/89/95. Wie viele
 * Wochen erlaubt sind, sagt der Baustein (mindestens drei - zwei Wochen waeren
 * kein Verlauf, sondern ein Sprung von 65 auf 100 %). Eine einzelne Woche
 * traegt hier trotzdem den Zielanteil: die Regel soll auch ausserhalb ihrer
 * Grenzen etwas Sinnvolles liefern statt durch null zu teilen.
 */
export function buildRebuildRamp(
  weeks: number,
  start: number,
  end: number,
): LoadPlan {
  const wochen = Math.max(1, Math.round(weeks));
  if (wochen === 1) return [{ week: 1, loadPct: gerundeterAnteil(end) }];
  const schritt = (end - start) / (wochen - 1);
  return Array.from({ length: wochen }, (_, i) => ({
    week: i + 1,
    loadPct: gerundeterAnteil(start + schritt * i),
  }));
}

/** Lastliste zur Bauregel des Bausteins. `null` heisst: keine Lastvorgabe -
 *  dann bestimmt der Coach das Gewicht wie gewohnt aus der letzten Leistung.
 *  Ohne Start- oder Zielanteil entsteht ebenfalls keine Liste; aus einer halben
 *  Angabe wird nichts geraten. */
export function buildLoadPlanFor(
  builder: LoadBuilderName | null | undefined,
  weeks: number,
  start: number | null | undefined,
  end: number | null | undefined,
): LoadPlan | null {
  if (builder !== "rebuild_ramp") return null;
  if (start == null || end == null) return null;
  return buildRebuildRamp(weeks, start, end);
}

/** Lastliste aus getippten Anteilen (eine Zahl je Phasenwoche) - fuer Phasen,
 *  die ihre Stufen ausdruecklich vorgeben, statt sie bauen zu lassen. Eine
 *  leere Angabe heisst "keine Vorgabe". */
export function loadPlanFromShares(
  shares: readonly number[] | null | undefined,
): LoadPlan | null {
  if (shares == null || shares.length === 0) return null;
  return shares.map((loadPct, i) => ({ week: i + 1, loadPct }));
}

// ---- Zugriff ----------------------------------------------------------------

/** Sortierte Kopie der Liste. */
function sorted(plan: LoadPlan): LoadPlan {
  return plan.slice().sort((a, b) => a.week - b.week);
}

/** Geltender Lastanteil aus Liste und 1-basierter Woche in der Phase; null ohne
 *  Liste (= keine Vorgabe, der Coach rechnet wie gewohnt).
 *
 *  Jenseits der Liste haelt die Vorgabe - wie beim Wochenplan: vor Woche 1 gilt
 *  die erste Zeile, hinter der letzten Woche die letzte. Eine ueberlange Phase
 *  faellt damit nicht ploetzlich auf freie Steuerung zurueck, sondern bleibt auf
 *  dem Zielanteil stehen. */
export function loadPlanForWeek(
  plan: LoadPlan | null | undefined,
  weekInPhase: number,
): number | null {
  if (!plan || plan.length === 0) return null;
  const rows = sorted(plan);
  const w = Math.round(weekInPhase);
  const exact = rows.find((row) => row.week === w);
  if (exact) return exact.loadPct;
  if (w < rows[0]!.week) return rows[0]!.loadPct;
  return rows[rows.length - 1]!.loadPct;
}

/** Spanne der Liste als [Start, Ziel]; null ohne Liste. Eine gleichbleibende
 *  Last liefert zweimal denselben Wert - die Anzeige macht daraus eine Zahl
 *  statt eines Pfeils. */
export function loadPlanSpan(
  plan: LoadPlan | null | undefined,
): [number, number] | null {
  if (!plan || plan.length === 0) return null;
  const rows = sorted(plan);
  return [rows[0]!.loadPct, rows[rows.length - 1]!.loadPct];
}

/** Traegt diese Phase ueberhaupt eine Lastvorgabe? */
export function hasLoadPlan(plan: LoadPlan | null | undefined): boolean {
  return plan != null && plan.length > 0;
}
