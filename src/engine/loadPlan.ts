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
