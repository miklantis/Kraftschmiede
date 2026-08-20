// Die eine Quelle aller sichtbaren Coach-Begruendungen (Issue #268, Schritt 1).
//
// Engine und Rechnung liefern nur noch eine Kennung samt Zahlen
// (`engine/coachReason.ts`); der deutsche Satz entsteht ausschliesslich hier.
// Vorher lagen die Texte in drei getrennten Toepfen - Doppelprogression,
// Wochenplan, Phasenwechsel - mit unterschiedlicher Sprache: mal mit
// Quellen-Praefix ("Wochenplan – …"), mal mit Fachjargon ("Repband",
// "+Schritt", "Reps zuruecksetzen"), teils ohne echte Umlaute.
//
// Regeln fuer jeden Text hier:
//   - ein Satz, Ursache vorn, Folge hinten
//   - kein Quellen-Praefix, kein Fachjargon
//   - echte Umlaute
//   - statt "ein Schritt" die echte Differenz zum heutigen Gewicht; ergibt die
//     Rechnung keine Differenz, bleibt derselbe Satz ohne Zahl
//
// Reine Textbildung ohne DB-/DOM-Bezug, gleiche Schicht wie `lib/planNote.ts`.

import type { CoachReason, CoachScope } from "@/engine";
import { fmtKg } from "@/lib/format";

/** Ab wann eine Differenz als echte Differenz zaehlt (Rundungsrauschen). */
const DIFF_EPS = 0.01;

/** Betrag der Differenz mit Einheit ("2,5 kg"); null, wenn es keine gibt. */
function diffText(reason: CoachReason, unit: string): string | null {
  const d = reason.diff;
  if (d == null || Math.abs(d) < DIFF_EPS) return null;
  return fmtKg(Math.abs(d)) + " " + unit;
}

/** Oberes Ende des Wiederholungsbandes; null, wenn es nicht mitgeliefert wurde. */
function bandTop(reason: CoachReason): number | null {
  const t = reason.bandTop;
  return t != null && t > 0 ? t : null;
}

/** Der Katalog. Je Kennung ein Satz - mit Zahl, wenn eine vorliegt, sonst
 *  derselbe Satz ohne. Aenderungen an der Sprache passieren nur hier. */
function noteFor(reason: CoachReason, unit: string): string {
  const kg = diffText(reason, unit);
  const top = bandTop(reason);

  switch (reason.code) {
    // ---- Wochenplan der Kraft-, Schnellkraft- und Testphase ----------------
    case "plan-start":
      return "Neu in dieser Phase – das ist dein Startgewicht.";
    case "plan-same-week":
      return "Gleiche Woche, gleiches Gewicht – gesteigert wird erst zur nächsten Woche.";
    case "plan-raised":
      return kg
        ? `Vorwoche sauber durchgezogen – deshalb liegen jetzt ${kg} mehr drauf.`
        : "Vorwoche sauber durchgezogen – deshalb geht das Gewicht jetzt hoch.";
    case "plan-held":
      return "Vorwoche nicht ganz sauber – das Gewicht bleibt noch eine Woche stehen.";
    case "plan-deload":
      return "Entlastung vor der Testwoche – bewusst leicht.";

    // ---- Doppelprogression -------------------------------------------------
    case "reps-up":
      return top
        ? `Ziel sauber erreicht – eine Wiederholung mehr; bei ${top} geht das Gewicht hoch.`
        : "Ziel sauber erreicht – eine Wiederholung mehr.";
    case "band-top": {
      const vorn = top
        ? `${top} Wiederholungen geschafft`
        : "Die Wiederholungen sind oben angekommen";
      return kg
        ? `${vorn} – ${kg} mehr, die Wiederholungen fangen wieder unten an.`
        : `${vorn} – das Gewicht geht hoch, die Wiederholungen fangen wieder unten an.`;
    }
    case "band-top-partial":
      return "Oben angekommen, die letzten Sätze knapp – das Gewicht steigt trotzdem.";
    case "hold-target":
      return top
        ? `Ziel erreicht, aber noch nicht oben – Gewicht bleibt, bis ${top} Wiederholungen stehen.`
        : "Ziel erreicht, aber noch nicht oben – das Gewicht bleibt.";
    case "hold-hard":
      return "Sauber, aber anstrengend – Gewicht und Wiederholungen bleiben, bis es leichter läuft.";
    case "hold-missed":
      return "Ziel knapp verfehlt – dasselbe Gewicht noch einmal.";
    case "back-off":
      return kg
        ? `Zweimal am selben Gewicht vorbei – ${kg} zurück, dann sauber wieder hoch.`
        : "Zweimal am selben Gewicht vorbei – das Gewicht geht zurück, dann sauber wieder hoch.";
    case "too-hard":
      return kg
        ? `Zu schwer geworden – ${kg} runter, damit die Sätze wieder sauber laufen.`
        : "Zu schwer geworden – das Gewicht geht runter, damit die Sätze wieder sauber laufen.";

    // ---- Vorgegebene Last der Journey (Lastfaktor-Rampe) -------------------
    case "ramp-raise":
      return "Vorgabe der Phase – das Gewicht wird auf die Phasenlast angehoben.";
    case "ramp-cap":
      return "Vorgabe der Phase – das Gewicht bleibt gedeckelt.";
    case "ramp-restore":
      return "Letzte Phase – zurück auf dein Referenzgewicht.";

    // ---- Phasenwechsel -----------------------------------------------------
    case "phase-fit":
      return "Neue Phase – das Gewicht passt schon.";
    case "phase-no-rm":
      return "Neue Phase – ohne Testwert bleibt das Gewicht.";
    case "phase-raise":
      return "Neue Phase – das Gewicht wird auf die neue Zone angehoben.";
    case "phase-lower":
      return "Neue Phase – das Gewicht wird auf die neue Zone gesenkt.";

    // ---- Sonderfaelle ------------------------------------------------------
    case "no-data":
      return "Noch keine Werte – wir starten mit dem Startgewicht.";
    case "reentry-up":
      return kg
        ? `Wiedereinstieg – vorsichtig ${kg} mehr.`
        : "Wiedereinstieg – vorsichtig etwas mehr.";
    case "reentry-hold":
      return "Wiedereinstieg – das Gewicht bleibt erst einmal.";
    case "carry-last":
      return "Begleitübung – Werte vom letzten Mal, frei anpassbar.";
    case "carry-start":
      return "Begleitübung – Startwert, frei anpassbar.";
    case "free-last":
      return "Freies Training – Werte vom letzten Mal, der Coach gibt nichts vor.";
    case "free-start":
      return "Freies Training – Startwert, der Coach gibt nichts vor.";
  }
}

/** Begruendung zu einer Coach-Entscheidung. `unit` kommt aus den Einstellungen
 *  ("kg"/"lb") und wird nur gebraucht, wenn der Satz eine Differenz nennt. */
export function coachNote(
  reason: CoachReason | null | undefined,
  unit: string,
): string {
  if (!reason) return "";
  return noteFor(reason, unit);
}

// ---- Beschriftung der Zeilen ------------------------------------------------
//
// Die Beschriftung folgt der Logik, die gerade gilt (Issue #268, Schritt 2).
// Vorher stand ueber beiden Logiken dasselbe "Beim naechsten Mal", und aus der
// Anzeige liess sich nicht ablesen, welche greift: in der Kraftphase gilt die
// Vorgabe die ganze Woche, in der Doppelprogression nur bis zur naechsten
// Einheit. Unterschiedliche Beschriftungen auf verschiedenen Karten derselben
// Einheit sind gewollt - so werden die beiden Logiken zum ersten Mal sichtbar.

/** Beschriftung der Zahlen-Zeile. Die Wochenvorgabe der Kraftphase steht fest,
 *  egal wie die Einheit laeuft - sie traegt darum nie den Zwischenstand-Zusatz;
 *  der Vorschlag fuer die naechste Einheit wandert mit jedem abgehakten Satz. */
export function coachLineLabel(scope: CoachScope, provisional: boolean): string {
  if (scope === "week") return "Diese Woche";
  return provisional ? "Beim nächsten Mal (Stand jetzt)" : "Beim nächsten Mal";
}

/** Beschriftung der Ausblick-Zeile. Sie haengt am Verlauf der Einheit und traegt
 *  darum den Zwischenstand-Zusatz, solange Arbeitssaetze offen sind. */
export function coachOutlookLabel(provisional: boolean): string {
  return provisional ? "Nächste Woche (Stand jetzt)" : "Nächste Woche";
}
