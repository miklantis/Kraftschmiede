// Reine Aufbereitungslogik fuer die Uebungsliste. Kein DOM/DB-Bezug.
// 1:1 aus V1 (app.js: exListData, exRowMeta, exRowSub).

import type { ExerciseRow } from "@/schemas";
import { fmtWeight } from "@/lib/format";
import { kindLabel } from "@/lib/labels";
import type { CoachState } from "@/lib/coach";

export interface ExerciseRowModel {
  id: string;
  name: string;
  meta: string;
  // Grobe Coach-Lesart (Steigern/Halten/Senken/Frei/Start) - nur fuer aktive
  // Uebungen gesetzt; fehlt, solange der Status noch nicht berechnet ist.
  coachState?: CoachState;
}

export interface ExerciseGroup {
  title: string;
  items: ExerciseRowModel[];
}

// Meta-Text rechts in der Listenzeile, je nach Uebungstyp (V1 exRowMeta).
// - Koerpergewicht: Zielwiederholungen bzw. Haltezeit
// - Core / Assistenz: Arbeitsgewicht x Zielwiederholungen
// - sonst (Hauptuebung): geschaetztes 1RM, ersatzweise Arbeitsgewicht
export function exerciseRowMeta(e: ExerciseRow, unit: string): string {
  const max = e.rep_range_max;
  if (e.profile === "bodyweight") {
    const u = e.metric === "duration" ? " s" : " Wdh";
    return (max ?? 0) + u;
  }
  if (e.profile === "core" || e.kind === "accessory") {
    return fmtWeight(e.work_weight, unit) + " × " + (max ?? 0);
  }
  return e.rm != null
    ? "1RM " + fmtWeight(e.rm, unit)
    : "Arbeit " + fmtWeight(e.work_weight, unit);
}

// Unterzeile links: die beanspruchten Muskelgruppen (ohne "core"), sonst die
// Uebungsart als Fallback (V1 exRowSub).
export function exerciseRowSub(e: ExerciseRow): string {
  const mg = (e.muscle_groups ?? []).filter((x) => x !== "core");
  if (mg.length) return mg.join(" · ");
  return kindLabel(e.kind);
}

// Gruppiert den Uebungskatalog in die V1-Reihenfolge. Reihenfolge innerhalb
// einer Gruppe bleibt wie geliefert (der Hook sortiert nach position). Leere
// Gruppen fallen weg. Zuordnung 1:1 aus V1 exListData.
export function groupExercises(
  exercises: readonly ExerciseRow[],
  unit: string,
  statuses?: Record<string, CoachState>,
): ExerciseGroup[] {
  const main: ExerciseRow[] = [];
  const assist: ExerciseRow[] = [];
  const core: ExerciseRow[] = [];
  const bw: ExerciseRow[] = [];
  const inactive: ExerciseRow[] = [];

  for (const e of exercises) {
    if (!e.active) inactive.push(e);
    else if (e.profile === "bodyweight") bw.push(e);
    else if (e.profile === "core") core.push(e);
    else if (e.kind === "accessory") assist.push(e);
    else main.push(e);
  }

  const order: Array<[string, ExerciseRow[]]> = [
    ["Hauptübungen", main],
    ["Assistenz", assist],
    ["Core", core],
    ["Körpergewicht", bw],
    ["Inaktiv / Swaps", inactive],
  ];

  return order
    .filter(([, list]) => list.length > 0)
    .map(([title, list]) => ({
      title,
      items: list.map((e) => ({
        id: e.id,
        name: e.name,
        meta: exerciseRowMeta(e, unit),
        coachState: e.active ? statuses?.[e.id] : undefined,
      })),
    }));
}
