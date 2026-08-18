// Abschnitt 4 – Journey-Vorlagen (kuratierte Periodisierungen). Spiegelt
// journey_templates und journey_template_phases.

import { z } from "zod";
import { focusEnum, uuid } from "./shared";

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
// spaeter die Doppelprogression. load_factor ist der Anteil des
// Referenzgewichts, mit dem in dieser Phase gearbeitet wird (1.0 = volles
// Niveau, also das gewohnte Verhalten).
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
  load_factor: z.number(),
  // Geplante Intensitaet der Phase in Prozent des 1RM (Beginn/Ende der Rampe);
  // null = die Phase plant die Last nicht, der Coach steuert das Gewicht.
  intensity_start: z.number().nullable(),
  intensity_end: z.number().nullable(),
  position: z.number().int(),
});
export type JourneyTemplatePhaseRow = z.infer<typeof journeyTemplatePhaseRow>;

export const journeyTemplatePhaseInsert = journeyTemplatePhaseRow
  .omit({ id: true })
  .partial({
    deload_week: true,
    rep_target_min: true,
    rep_target_max: true,
    load_factor: true,
    intensity_start: true,
    intensity_end: true,
    position: true,
  });
export type JourneyTemplatePhaseInsert = z.infer<
  typeof journeyTemplatePhaseInsert
>;
