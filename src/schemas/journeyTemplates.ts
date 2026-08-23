// Abschnitt 4 – Journey-Vorlagen (kuratierte Periodisierungen). Spiegelt
// journey_templates und journey_template_phases.

import { z } from "zod";
import { loadPlanSchema } from "@/engine/loadPlan";
import { weekPlanSchema } from "@/engine/weekPlan";
import { focusEnum, uuid } from "./shared";
import { loadBuilderEnum, planBuilderEnum } from "./phaseTypes";

// journey_templates – kuratierte Periodisierung als Vorlage.
export const journeyTemplateRow = z.object({
  id: uuid,
  user_id: uuid,
  key: z.string().nullable(),
  name: z.string(),
  tagline: z.string().nullable(),
  for_whom: z.string().nullable(),
  summary: z.string().nullable(),
  position: z.number().int(),
});
export type JourneyTemplateRow = z.infer<typeof journeyTemplateRow>;

export const journeyTemplateInsert = journeyTemplateRow
  .omit({ id: true })
  .partial({
    key: true,
    tagline: true,
    for_whom: true,
    summary: true,
    position: true,
  });
export type JourneyTemplateInsert = z.infer<typeof journeyTemplateInsert>;

// journey_template_phases – Phase einer Journey-Vorlage. rep_target_* steuert
// spaeter die Doppelprogression. load_plan ist die Lastliste der Phase (Form:
// engine/loadPlan.ts): je Phasenwoche der Anteil des Referenzgewichts, null =
// keine Vorgabe. week_plan ist der Wochenplan der Phase (Form:
// engine/weekPlan.ts); beide wandern beim Journey-Start mit der Phase mit.
export const journeyTemplatePhaseRow = z.object({
  id: uuid,
  user_id: uuid,
  journey_template_id: uuid,
  name: z.string(),
  focus: focusEnum,
  weeks: z.number().int(),
  sets_start: z.number().int(),
  sets_end: z.number().int(),
  deload_week: z.number().int().nullable(),
  rep_target_min: z.number().int().nullable(),
  rep_target_max: z.number().int().nullable(),
  load_plan: loadPlanSchema.nullable(),
  week_plan: weekPlanSchema.nullable(),
  // Bauart-Vermerk wie an der Phase - die Vorlagenphase wandert beim
  // Journey-Start unveraendert mit.
  plan_builder: planBuilderEnum.nullable(),
  load_builder: loadBuilderEnum.nullable(),
  careful: z.boolean(),
  position: z.number().int(),
});
export type JourneyTemplatePhaseRow = z.infer<typeof journeyTemplatePhaseRow>;

export const journeyTemplatePhaseInsert = journeyTemplatePhaseRow
  .omit({ id: true })
  .partial({
    deload_week: true,
    rep_target_min: true,
    rep_target_max: true,
    load_plan: true,
    week_plan: true,
    plan_builder: true,
    load_builder: true,
    careful: true,
    position: true,
  });
export type JourneyTemplatePhaseInsert = z.infer<
  typeof journeyTemplatePhaseInsert
>;
