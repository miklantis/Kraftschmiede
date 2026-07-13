// Reine, DOM-/Supabase-freie Pruefung und Aufbereitung eines V2-Exports fuer das
// Voll-Restore. Spiegelt V1 io.js (stripDerived): nimmt einen EIGENEN
// Kraftschmiede-V2-Export (app + schemaVersion "v2"), verwirft die abgeleiteten
// Felder (rir/rpe/scoreLabel je Satz, _scoreScale), entschachtelt die Einheiten
// wieder in die flachen Tabellen (sessions/session_exercises/sets) und liefert
// pro Tabelle eine Zeilenliste plus eine kleine Vorschau (Anzahlen). Validierung
// mit Zod auf der Huelle; die Zeilen selbst bleiben durchgereicht (der Schreiber
// setzt user_id und behaelt ids/Fremdschluessel, damit die Beziehungen halten).

import { z } from "zod";
import type { Row } from "@/lib/exportData";

export interface RestoreTables {
  inventory_bars: Row[];
  inventory_plates: Row[];
  inventory_kettlebells: Row[];
  inventory_dumbbells: Row[];
  inventory_equipment: Row[];
  exercises: Row[];
  exercise_muscles: Row[];
  templates: Row[];
  template_exercises: Row[];
  journey_templates: Row[];
  journey_template_phases: Row[];
  skills: Row[];
  skill_phases: Row[];
  skill_phase_exercises: Row[];
  skill_phase_equipment: Row[];
  journeys: Row[];
  phases: Row[];
  sessions: Row[];
  session_exercises: Row[];
  sets: Row[];
  skill_progress: Row[];
  body_log: Row[];
  composition: Row[];
  settings: Row | null;
}

export interface RestorePreview {
  sessions: number;
  sets: number;
  journeys: number;
  exercises: number;
}

export interface RestoreResult {
  tables: RestoreTables;
  preview: RestorePreview;
}

const zRow = z.record(z.string(), z.unknown());
const zEntry = z.looseObject({ sets: z.array(zRow).optional() });
const zSession = z.looseObject({ entries: z.array(zEntry).optional() });

// Huellen-Schema: nur Struktur, keine Spalten-Tiefe (sonst wuerde ein gueltiger
// Export an Detailregeln scheitern). app + schemaVersion sind die harte Schranke.
const zExport = z.looseObject({
  app: z.literal("Kraftschmiede"),
  schemaVersion: z.union([z.literal("v2"), z.literal("v3")]),
  inventory: z
    .looseObject({
      bars: z.array(zRow).optional(),
      plates: z.array(zRow).optional(),
      kettlebells: z.array(zRow).optional(),
      dumbbells: z.array(zRow).optional(),
      equipment: z.array(zRow).optional(),
    })
    .optional(),
  exercises: z.array(zRow).optional(),
  exerciseMuscles: z.array(zRow).optional(),
  templates: z.array(zRow).optional(),
  templateExercises: z.array(zRow).optional(),
  journeyTemplates: z.array(zRow).optional(),
  journeyTemplatePhases: z.array(zRow).optional(),
  skills: z.array(zRow).optional(),
  skillPhases: z.array(zRow).optional(),
  skillPhaseExercises: z.array(zRow).optional(),
  skillPhaseEquipment: z.array(zRow).optional(),
  journeys: z.array(zRow).optional(),
  phases: z.array(zRow).optional(),
  sessions: z.array(zSession).optional(),
  skillProgress: z.array(zRow).optional(),
  bodyLog: z.array(zRow).optional(),
  composition: z.array(zRow).optional(),
  settings: zRow.nullable().optional(),
});

function arr(v: Row[] | undefined): Row[] {
  return v ?? [];
}

// Abgeleitete Satz-Felder wegwerfen (wie V1 stripDerived).
function stripSet(set: Row): Row {
  const copy: Row = { ...set };
  delete copy.rir;
  delete copy.rpe;
  delete copy.scoreLabel;
  return copy;
}

// Uebungszeilen aus Alt-Backups auf die neue Form bringen: Altfelder verwerfen
// (category/kind aus v2, active aus Backups vor dem Aufraeumen der Aktiv-Spalte),
// tier ableiten falls es fehlt, und die Barbell-Wahrheit aus category in
// equipment sichern (wie die DB-Migration). Neuere Backups passieren unveraendert.
function migrateExerciseRow(r: Row): Row {
  const { category, kind, active, ...rest } = r;
  void active;
  const out: Row = { ...rest };
  if (out.tier == null) {
    out.tier = kind === "accessory" ? "accessory" : "main";
  }
  if (category === "barbell") {
    out.equipment = "barbell";
  }
  return out;
}

// Alt-Backups (vor Version 1.3.16 bzw. Migration 0006) fuehren je Uebung eine
// Rolle. Die Spalte gibt es nicht mehr; sie wird beim Restore verworfen, damit
// ein aelterer Export weiterhin sauber einspielbar bleibt.
function stripTemplateExerciseRow(r: Row): Row {
  const { role: _role, ...rest } = r;
  return rest;
}

export function parseRestore(text: string): RestoreResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(
      "Ungueltiges JSON: " + (e instanceof Error ? e.message : String(e)),
    );
  }

  // Frueh und mit klarer Meldung gegen Fremd-/V1-Dateien abgrenzen.
  const obj = data as Record<string, unknown> | null;
  if (
    obj == null ||
    obj.app !== "Kraftschmiede" ||
    (obj.schemaVersion !== "v2" && obj.schemaVersion !== "v3")
  ) {
    throw new Error(
      "Das ist kein Kraftschmiede-Export. Nur ein eigener Export (Schema v2 " +
        "oder v3) kann wiederhergestellt werden (kein V1-JSON).",
    );
  }

  const parsed = zExport.safeParse(data);
  if (!parsed.success) {
    throw new Error("Der Export hat ein unerwartetes Format.");
  }
  const exp = parsed.data;

  // Einheiten entschachteln: session-Zeile ohne entries, je Uebung ohne sets,
  // Saetze flach (abgeleitete Felder entfernt). ids/Fremdschluessel bleiben.
  const sessions: Row[] = [];
  const session_exercises: Row[] = [];
  const sets: Row[] = [];
  for (const s of arr(exp.sessions)) {
    const { entries, ...sessionRow } = s as Row & { entries?: Row[] };
    sessions.push(sessionRow);
    for (const e of entries ?? []) {
      const { sets: exSets, ...exRow } = e as Row & { sets?: Row[] };
      session_exercises.push(exRow);
      for (const st of exSets ?? []) sets.push(stripSet(st));
    }
  }

  const tables: RestoreTables = {
    inventory_bars: arr(exp.inventory?.bars),
    inventory_plates: arr(exp.inventory?.plates),
    inventory_kettlebells: arr(exp.inventory?.kettlebells),
    inventory_dumbbells: arr(exp.inventory?.dumbbells),
    inventory_equipment: arr(exp.inventory?.equipment),
    exercises: arr(exp.exercises).map(migrateExerciseRow),
    exercise_muscles: arr(exp.exerciseMuscles),
    templates: arr(exp.templates),
    template_exercises: arr(exp.templateExercises).map(stripTemplateExerciseRow),
    journey_templates: arr(exp.journeyTemplates),
    journey_template_phases: arr(exp.journeyTemplatePhases),
    skills: arr(exp.skills),
    skill_phases: arr(exp.skillPhases),
    skill_phase_exercises: arr(exp.skillPhaseExercises),
    skill_phase_equipment: arr(exp.skillPhaseEquipment),
    journeys: arr(exp.journeys),
    phases: arr(exp.phases),
    sessions,
    session_exercises,
    sets,
    skill_progress: arr(exp.skillProgress),
    body_log: arr(exp.bodyLog),
    composition: arr(exp.composition),
    settings: exp.settings ?? null,
  };

  const preview: RestorePreview = {
    sessions: sessions.length,
    sets: sets.length,
    journeys: tables.journeys.length,
    exercises: tables.exercises.length,
  };

  return { tables, preview };
}
