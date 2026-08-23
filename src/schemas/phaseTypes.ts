// Abschnitt 4a – Bausteine einer Journey-Phase. Spiegelt phase_types.
//
// Ein Baustein beantwortet drei Fragen: welche Bausteine es gibt, womit eine
// Phase dieses Typs anfaengt (Wochen, Saetze, Band, Entlastung, Last) und was
// daran einstellbar ist. Er beantwortet ausdruecklich nicht, wie gerechnet wird:
// `plan_builder` und `load_builder` nennen die Bauregel nur beim Namen, die
// Rechnung steht im Code.
//
// Gelesen wird die Tabelle, wenn eine Phase entsteht - nicht, wenn der Coach
// rechnet. Die Werte werden beim Anlegen in die Phasenzeile kopiert; eine
// geaenderte Baustein-Vorgabe greift damit nie in eine laufende Journey.

import { z } from "zod";
import { LOAD_BUILDERS, PLAN_BUILDERS } from "@/engine/weekPlan";
import { phaseTypeKeyEnum, uuid } from "./shared";

// Steuerweg: gibt eine Wochenliste Saetze und Wiederholungen vor, oder steuert
// der Coach?
export const phaseControlEnum = z.enum(["coach", "plan"]);
export type PhaseControl = z.infer<typeof phaseControlEnum>;

// Bauregel der Wochenliste bzw. der Lastliste. Die Bauregeln selbst stehen im
// Code (engine/weekPlan.ts) - von dort kommt auch die Liste der gueltigen
// Namen, damit Tabelle, Schema und Rechnung nicht auseinanderlaufen.
export const planBuilderEnum = z.enum(PLAN_BUILDERS);
export type PlanBuilder = z.infer<typeof planBuilderEnum>;

export const loadBuilderEnum = z.enum(LOAD_BUILDERS);
export type LoadBuilder = z.infer<typeof loadBuilderEnum>;

// phase_types – ein Baustein je Zeile, pro Nutzer geseedet (ADR-0002).
export const phaseTypeRow = z.object({
  id: uuid,
  user_id: uuid,
  /** Schluessel, identisch mit phases.focus – der Vertrag mit dem Code. */
  key: phaseTypeKeyEnum,
  name: z.string(),
  summary: z.string(),
  position: z.number().int(),
  control: phaseControlEnum,
  plan_builder: planBuilderEnum.nullable(),
  /** null = die Phase gibt kein Gewicht vor. */
  load_builder: loadBuilderEnum.nullable(),
  /** Vorsichtige Steigerung des Coaches (Wiedereinstieg, Wiederaufbau). */
  careful: z.boolean(),
  weeks_min: z.number().int(),
  weeks_max: z.number().int(),
  weeks_default: z.number().int(),
  /** Satzrampe von der ersten zur letzten Phasenwoche. */
  sets_start_default: z.number().int(),
  sets_end_default: z.number().int(),
  sets_max: z.number().int(),
  /** true = die Saetze kommen aus der Wochenliste und sind nicht einstellbar. */
  sets_locked: z.boolean(),
  /** null = die Uebung behaelt ihr eigenes Band (Erhaltung). */
  rep_min_default: z.number().int().nullable(),
  rep_max_default: z.number().int().nullable(),
  /** Korridor, in dem das Band verstellt werden darf. */
  rep_bound_min: z.number().int().nullable(),
  rep_bound_max: z.number().int().nullable(),
  /** true = das Band hat in diesem Steuerweg keine Wirkung (ADR-0018). */
  rep_band_locked: z.boolean(),
  deload_allowed: z.boolean(),
  /** null = erlaubt, aber ohne Vorgabe (oder gar nicht erlaubt). */
  deload_default: z.number().int().nullable(),
  /** Start- und Ziellast der Rampe; nur bei gesetztem load_builder. */
  load_start_default: z.number().nullable(),
  load_end_default: z.number().nullable(),
  /** Reiner Hinweistext, ohne jede Wirkung. */
  placement_hint: z.string().nullable(),
});
export type PhaseTypeRow = z.infer<typeof phaseTypeRow>;

export const phaseTypeInsert = phaseTypeRow.omit({ id: true }).partial({
  position: true,
  plan_builder: true,
  load_builder: true,
  careful: true,
  sets_locked: true,
  rep_min_default: true,
  rep_max_default: true,
  rep_bound_min: true,
  rep_bound_max: true,
  rep_band_locked: true,
  deload_allowed: true,
  deload_default: true,
  load_start_default: true,
  load_end_default: true,
  placement_hint: true,
});
export type PhaseTypeInsert = z.infer<typeof phaseTypeInsert>;
