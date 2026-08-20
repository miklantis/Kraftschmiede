// Journey-Wechsel: die Texte, die im Bestaetigungs-Dialog stehen, und die
// Sperre bei laufender Einheit (Issue #257). Reine Ableitung ohne DB-/DOM-
// Bezug, damit beides testbar ist und die Seite nur noch anzeigt.

import { longDateYearDE } from "@/lib/format";

/** Stand der laufenden Journey, wie er im Wechsel-Dialog steht. */
export interface JourneySwitchStand {
  /** Name der laufenden Journey - zugleich das abzutippende Wort. */
  name: string;
  /** "Woche 5 von 12"; ohne geplante Gesamtdauer nur "Woche 5". */
  week: string;
  /** "Phase: Aufbau" - null, wenn keine Phase bestimmbar ist. */
  phase: string | null;
  /** "Start: 3. März 2026" - null ohne Startdatum. */
  start: string | null;
}

export function buildJourneySwitchStand(input: {
  name: string;
  globalWeek: number;
  totalWeeks: number;
  phaseName: string | null;
  startDate: string | null;
}): JourneySwitchStand {
  const { name, globalWeek, totalWeeks, phaseName, startDate } = input;
  // Eine durchlaufene Journey steht rechnerisch hinter ihrer letzten Woche -
  // "Woche 13 von 12" waere Unsinn, darum der eigene Satz.
  const week =
    totalWeeks <= 0
      ? `Woche ${globalWeek}`
      : globalWeek > totalWeeks
        ? `Alle ${totalWeeks} Wochen durchlaufen`
        : `Woche ${globalWeek} von ${totalWeeks}`;
  return {
    name,
    week,
    phase: phaseName !== null && phaseName !== "" ? `Phase: ${phaseName}` : null,
    start: startDate !== null && startDate !== "" ? `Start: ${longDateYearDE(startDate)}` : null,
  };
}

/** Sperrgrund fuer den Wechsel, oder null wenn nichts im Weg steht.
 *
 *  Eine noch nicht beendete Live-Einheit haengt sonst zwischen zwei Journeys:
 *  gestartet unter der alten, beendet unter der neuen - ihre Zuordnung waere
 *  nicht mehr zu klaeren. Darum erst beenden oder verwerfen, dann wechseln. */
export function journeySwitchBlockReason(
  live: { title: string } | null,
): string | null {
  if (live === null) return null;
  const name = live.title.trim();
  const wer = name === "" ? "eine Einheit" : `die Einheit „${name}“`;
  return `Es läuft gerade noch ${wer}. Beende oder verwirf sie zuerst – sonst hinge sie zwischen zwei Journeys und ihre Zuordnung wäre unklar.`;
}
