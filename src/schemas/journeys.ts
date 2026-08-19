// Abschnitt 6 – Nutzerzustand: Journeys und ihre Phasen. Spiegelt journeys und
// phases. Invariante (genau eine aktive Journey pro Nutzer) liegt als Partial
// Unique Index in der DB.

import { z } from "zod";
import { weekPlanSchema } from "@/engine/weekPlan";
import { focusEnum, isoDate, isoTimestamp, uuid } from "./shared";

// Status einer Journey (journeys.status).
export const journeyStatusEnum = z.enum(["active", "archived"]);

// journeys – konkrete, dem Nutzer zugeordnete Periodisierung.
export const journeyRow = z.object({
  id: uuid,
  user_id: uuid,
  name: z.string(),
  active: z.boolean(),
  status: journeyStatusEnum,
  source_template_id: uuid.nullable(),
  start_date: isoDate.nullable(),
  // Enddatum: gesetzt beim Abschluss bzw. beim Wechsel auf eine neue Journey.
  end_date: isoDate.nullable(),
  created_at: isoTimestamp,
});
export type JourneyRow = z.infer<typeof journeyRow>;

export const journeyInsert = journeyRow
  .omit({ id: true, created_at: true })
  .partial({
    active: true,
    status: true,
    source_template_id: true,
    start_date: true,
    end_date: true,
  });
export type JourneyInsert = z.infer<typeof journeyInsert>;

// phases – Phase der konkreten Journey (Kopie der Vorlagenphase, frei anpassbar).
// load_factor ist der Anteil des eingefrorenen Referenzgewichts, mit dem in
// dieser Phase gearbeitet wird (1.0 = volles Niveau, also gewohntes Verhalten).
// week_plan ist der Wochenplan der Phase (Saetze, Wiederholungen, Ziel-
// Anstrengung je Woche); null = die Phase laeuft wie bisher ueber den Coach.
// Die Form steht in der Engine (engine/weekPlan.ts), wo sie auch gerechnet wird
// - hier steht nur der Spaltenbezug, damit es keine doppelte Pflege gibt.
export const phaseRow = z.object({
  id: uuid,
  user_id: uuid,
  journey_id: uuid,
  name: z.string(),
  focus: focusEnum,
  weeks: z.number().int(),
  sets_start: z.number().int(),
  sets_end: z.number().int(),
  deload_week: z.number().int().nullable(),
  rep_target_min: z.number().int().nullable(),
  rep_target_max: z.number().int().nullable(),
  load_factor: z.number(),
  week_plan: weekPlanSchema.nullable(),
  position: z.number().int(),
});
export type PhaseRow = z.infer<typeof phaseRow>;

export const phaseInsert = phaseRow
  .omit({ id: true })
  .partial({
    deload_week: true,
    rep_target_min: true,
    rep_target_max: true,
    load_factor: true,
    week_plan: true,
    position: true,
  });
export type PhaseInsert = z.infer<typeof phaseInsert>;
