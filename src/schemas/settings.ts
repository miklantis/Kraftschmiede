// Abschnitt 8 (Teil) – Einstellungen. Spiegelt settings (eine Zeile pro Nutzer,
// Primaerschluessel ist user_id).
//
// Hinweis zur bewussten Verschaerfung: rm_formula und unit sind in der DB freier
// Text mit Default. Hier als Enums modelliert, passend zur Engine
// (RmFormula = brzycki | epley | wathan | mean) bzw. zur Einheitenwahl. Da nur
// die App diese Spalten schreibt, ist die engere Form die fachliche Wahrheit.

import { z } from "zod";
import { recoveryWindowsSchema, timersSchema, uuid } from "./shared";

// 1RM-Formel (settings.rm_formula) – deckt sich mit der Engine.
export const rmFormulaEnum = z.enum(["brzycki", "epley", "wathan", "mean"]);
// Gewichtseinheit (settings.unit).
export const unitEnum = z.enum(["kg", "lb"]);

// settings – Konfiguration je Nutzer.
export const settingsRow = z.object({
  user_id: uuid,
  rm_formula: rmFormulaEnum,
  weekly_frequency_target: z.number().int(),
  weight_step: z.number(),
  unit: unitEnum,
  recovery_windows: recoveryWindowsSchema,
  timers: timersSchema,
  // Profilbild als Data-URL (quadratisch, 256 Pixel, im Browser erzeugt).
  // Leerstring = kein Bild, dann zeigt der Konto-Kreis den Anfangsbuchstaben
  // (Migration 0052).
  avatar: z.string(),
});
export type SettingsRow = z.infer<typeof settingsRow>;

export const settingsInsert = settingsRow.partial({
  rm_formula: true,
  weekly_frequency_target: true,
  weight_step: true,
  unit: true,
  recovery_windows: true,
  timers: true,
  avatar: true,
});
export type SettingsInsert = z.infer<typeof settingsInsert>;
