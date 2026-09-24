// Abschnitt – Fastenbegleiter. Spiegelt fasten_tage 1:1 (Migration 0066).

import { z } from "zod";
import { uuid, isoTimestamp } from "./shared";

// fasten_tage – je Zeile der Begleittext eines Fastentags nach Buchinger:
// Titel, was im Koerper passiert, wie man sich fuehlen kann, und die
// Stichpunkte fuer heute. Definition je Nutzer (ADR-0002), der Seed zieht
// fehlende Tage nach. `tag` ist der stabile Seed-Identifikator (ein Tag je
// Nutzer genau einmal).
export const fastenTagRow = z.object({
  id: uuid,
  user_id: uuid,
  tag: z.number().int().min(1),
  titel: z.string(),
  koerper: z.string(),
  gefuehl: z.string(),
  wichtig: z.array(z.string()),
  created_at: isoTimestamp,
});
export type FastenTagRow = z.infer<typeof fastenTagRow>;

export const fastenTagInsert = fastenTagRow.omit({ id: true, created_at: true });
export type FastenTagInsert = z.infer<typeof fastenTagInsert>;
