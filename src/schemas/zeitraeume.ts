// Abschnitt – Zeitraeume. Spiegelt zeitraeume 1:1 (Migration 0014).

import { z } from "zod";
import { uuid, isoDate, isoTimestamp } from "./shared";

// Feste Typ-Liste des Markers (CHECK-Liste aus dem Schema). Domaenensprache
// deutsch; Reihenfolge und Anzeigenamen liegen in lib/zeitraeume.ts.
export const zeitraumTypEnum = z.enum([
  "heilfasten",
  "urlaub",
  "pause",
  "krankheit",
  "verletzung",
  "sonstiges",
]);
export type ZeitraumTyp = z.infer<typeof zeitraumTypEnum>;

// zeitraeume – je Zeile ein Timeline-Marker: Typ, Startdatum, optionales
// Enddatum (null = laeuft noch) und kurze Notiz. Reiner Rueckschau-Kontext,
// haengt bewusst nicht an sessions, Messungen oder Coach.
export const zeitraumRow = z.object({
  id: uuid,
  user_id: uuid,
  typ: zeitraumTypEnum,
  start_datum: isoDate,
  end_datum: isoDate.nullable(),
  notiz: z.string().nullable(),
  created_at: isoTimestamp,
});
export type ZeitraumRow = z.infer<typeof zeitraumRow>;

export const zeitraumInsert = zeitraumRow
  .omit({ id: true, created_at: true })
  .partial({ end_datum: true, notiz: true });
export type ZeitraumInsert = z.infer<typeof zeitraumInsert>;
