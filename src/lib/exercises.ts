// Reine Aufbereitungslogik fuer die Uebungsliste. Kein DOM/DB-Bezug.
// 1:1 aus V1 (app.js: exListData, exRowMeta, exRowSub).

import type { ExerciseRow } from "@/schemas";
import { fmtWeight } from "@/lib/format";
import { tierLabel } from "@/lib/labels";
import type { CoachState } from "@/lib/coach";

export interface ExerciseRowModel {
  id: string;
  name: string;
  meta: string;
  // Grobe Coach-Lesart (Steigern/Halten/Senken/Frei/Start); fehlt, solange der
  // Status noch nicht berechnet ist.
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
  if (e.profile === "core" || e.tier === "accessory") {
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
  // Core/Koerpergewicht tragen ihr Label ueber das Profil (tier kennt nur main/accessory).
  if (e.profile === "core") return "Core";
  if (e.profile === "bodyweight") return "Körpergewicht";
  return tierLabel(e.tier);
}

// Die vier Uebungsgruppen der App (V1-Reihenfolge). Eigene Kennung plus
// Ueberschrift, damit ausser der Uebungsliste auch andere Ansichten (Journey-
// Seite) dieselbe Einteilung nutzen koennen, ohne sie nachzubauen.
export type ExerciseGroupKey = "main" | "accessory" | "core" | "bodyweight";

export const EXERCISE_GROUP_ORDER: readonly ExerciseGroupKey[] = [
  "main",
  "accessory",
  "core",
  "bodyweight",
];

export const EXERCISE_GROUP_TITLE: Record<ExerciseGroupKey, string> = {
  main: "Hauptübungen",
  accessory: "Assistenz",
  core: "Core",
  bodyweight: "Körpergewicht",
};

// Gruppe einer Uebung. Reihenfolge der Pruefungen ist bedeutsam: das Profil
// sticht die Stufe (eine Core-Uebung mit tier "accessory" bleibt Core).
export function exerciseGroupKey(
  e: Pick<ExerciseRow, "profile" | "tier">,
): ExerciseGroupKey {
  if (e.profile === "bodyweight") return "bodyweight";
  if (e.profile === "core") return "core";
  if (e.tier === "accessory") return "accessory";
  return "main";
}

// Gruppiert den Uebungskatalog in die V1-Reihenfolge. Reihenfolge innerhalb
// einer Gruppe bleibt wie geliefert (der Hook sortiert nach position). Leere
// Gruppen fallen weg. Zuordnung 1:1 aus V1 exListData.
export function groupExercises(
  exercises: readonly ExerciseRow[],
  unit: string,
  statuses?: Record<string, CoachState>,
): ExerciseGroup[] {
  const buckets: Record<ExerciseGroupKey, ExerciseRow[]> = {
    main: [],
    accessory: [],
    core: [],
    bodyweight: [],
  };

  for (const e of exercises) buckets[exerciseGroupKey(e)].push(e);

  return EXERCISE_GROUP_ORDER.filter((k) => buckets[k].length > 0).map((k) => ({
    title: EXERCISE_GROUP_TITLE[k],
    items: buckets[k].map((e) => ({
      id: e.id,
      name: e.name,
      meta: exerciseRowMeta(e, unit),
      coachState: statuses?.[e.id],
    })),
  }));
}
