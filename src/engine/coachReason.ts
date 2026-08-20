// Kennung einer Coach-Entscheidung samt der Zahlen, die ihr Text braucht
// (Issue #268, Schritt 1). Engine und Rechnung entscheiden und liefern diese
// Kennung; den deutschen Satz baut ausschliesslich `lib/coachText.ts`.
//
// Vorher lagen die Saetze in drei getrennten Toepfen (Doppelprogression,
// Wochenplan, Phasenwechsel) mit unterschiedlicher Sprache und Fachjargon.
// Mit der Kennung laesst sich eine gemeinsame Sprache erzwingen statt nur
// vereinbaren, und spaetere Textaenderungen fassen die Rechenlogik nicht an.
//
// Bewusst hier in der Engine und nicht in der Textschicht: die Kennung ist
// Teil des Ergebnisses der Rechnung, nicht seiner Darstellung.

/** Alle Kennungen an einer Stelle - als Liste, damit der Textkatalog
 *  nachweisbar vollstaendig ist (Test in lib/__tests__/coachText.test.ts). */
export const COACH_REASON_CODES = [
  // Wochenplan der Kraft-, Schnellkraft- und Testphase
  "plan-start",
  "plan-same-week",
  "plan-raised",
  "plan-held",
  "plan-deload",
  // Doppelprogression
  "reps-up",
  "band-top",
  "band-top-partial",
  "hold-target",
  "hold-hard",
  "hold-missed",
  "back-off",
  "too-hard",
  // Vorgegebene Last der Journey (Lastfaktor-Rampe)
  "ramp-raise",
  "ramp-cap",
  "ramp-restore",
  // Phasenwechsel (1RM-Einstieg in die neue Zone)
  "phase-fit",
  "phase-no-rm",
  "phase-raise",
  "phase-lower",
  // Sonderfaelle
  "no-data",
  "reentry-up",
  "reentry-hold",
  "carry-last",
  "carry-start",
  "free-last",
  "free-start",
] as const;

export type CoachReasonCode = (typeof COACH_REASON_CODES)[number];

export interface CoachReason {
  /** Welcher Fall vorliegt - Bezug in den Textkatalog. */
  code: CoachReasonCode;
  /** Tatsaechliche Differenz zum heutigen Gewicht (positiv = mehr, negativ =
   *  weniger). Bewusst die echte Differenz und nicht die eingestellte
   *  Schrittweite: bei Kurzhanteln und krummen Scheiben weicht sie ab. Fehlt
   *  sie oder ist sie 0, bleibt der Satz ohne Zahl. */
  diff?: number;
  /** Oberes Ende des Wiederholungsbandes ("bei 12 geht das Gewicht hoch"). */
  bandTop?: number;
}
