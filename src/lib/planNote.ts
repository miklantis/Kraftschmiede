// Hinweistext des Wochenplans fuer den Trainingsbildschirm (Issue #225,
// Schritt 5). Ueber den Uebungen soll stehen, was diese Woche gilt und warum:
// Phase und Woche, die Vorgabe der Woche (Saetze, Wiederholungen, Ziel-
// Anstrengung) und was passieren muss, damit das Gewicht steigt.
//
// Reine Textbildung ohne DB-/DOM-Bezug: der Text wird beim Start der Einheit
// gebaut und dort eingefroren, wie der Lastfaktor-Hinweis (lib/loadFactor).

import type { WeekPlanWeek } from "@/engine";
import { fmtKg } from "@/lib/format";

/** Der Hinweis in vier Teilen, damit die Anzeige ihn gestalten kann. */
export interface PlanNote {
  /** "Maximalkraft · Woche 3 von 5". */
  title: string;
  /** "4 Sätze × 4 Wiederholungen · Ziel RIR 1". */
  targets: string;
  /** Woran die Steigerung haengt: welche Einheit gewertet wird und was
   *  "sauber" heisst (Issue #268, Schritt 4). */
  progress: string;
  /** Umgang mit schweren Saetzen; null in der Entlastungswoche. */
  hint: string | null;
}

export interface PlanNoteInput {
  /** Name der laufenden Phase ("Maximalkraft"). */
  phaseName: string;
  /** 1-basierte Woche in der Phase. */
  weekInPhase: number;
  /** Laenge der Phase in Wochen. */
  phaseWeeks: number;
  /** Geltende Zeile des Wochenplans. */
  week: WeekPlanWeek;
  /** Entlastungswoche der Testphase: entlasten statt steigern. */
  deload: boolean;
  /** Schrittweite eines Gewichtssprungs aus den Einstellungen. */
  weightStep: number | null;
  /** Gewichtseinheit aus den Einstellungen ("kg"/"lb"). */
  unit: string;
}

// Regel 1 und 3 des Konzepts: einen schweren Satz teilen statt das Gewicht zu
// senken, und an platten Tagen reicht ein Satz weniger. Beides bleibt bewusst
// Hinweistext und wird nicht als eigene Funktion gebaut (Abgrenzung in #225).
const CLUSTER_HINT =
  "Schaffst du die Wiederholungen nicht am Stück, teile den Satz " +
  "(z. B. 2 + 2 mit kurzer Pause), statt das Gewicht zu senken. Bist du platt, " +
  "reichen auch 3 Sätze.";

const DELOAD_PROGRESS =
  "Locker bleiben: Diese Woche ist die Entlastung vor der Testwoche.";

// Die Steigerungs-Regel steht genau einmal, und zwar hier (Issue #268,
// Schritt 4). Vorher hiess es nur "Schaffst du alle Saetze sauber, geht es
// naechste Woche 2,5 kg hoch" - beide Bedingungen blieben offen:
//
//   - Gewertet wird nur die LETZTE Einheit dieser Uebung in der Woche. Wer
//     zweimal pro Woche trainiert, dessen schwache zweite Einheit kassiert die
//     saubere erste; davon stand nichts da.
//   - "Sauber" heisst: alle Saetze mit den vorgegebenen Wiederholungen und
//     nicht haerter als die Ziel-Anstrengung der Woche.
//
// Die Uebungskarten wiederholen diesen Vorbehalt bewusst nicht - sie zeigen
// Wochenvorgabe und Ausblick, die Regel dahinter steht hier oben.
function progressText(week: WeekPlanWeek, step: number, unit: string): string {
  return (
    "Über die Steigerung entscheidet die letzte Einheit einer Übung in der " +
    `Woche: Schaffst du dort alle Sätze mit ${repsText(week)} und nicht ` +
    `härter als Ziel RIR ${week.rir}, geht es nächste Woche ` +
    `${fmtKg(step)} ${unit} hoch.`
  );
}

function repsText(week: WeekPlanWeek): string {
  const reps =
    week.repsMax != null && week.repsMax !== week.reps
      ? `${week.reps}–${week.repsMax}`
      : `${week.reps}`;
  return `${reps} ${week.reps === 1 && week.repsMax == null ? "Wiederholung" : "Wiederholungen"}`;
}

function setsText(week: WeekPlanWeek): string {
  return `${week.sets} ${week.sets === 1 ? "Satz" : "Sätze"}`;
}

// Anteil des Arbeitsgewichts, falls die Woche entlastet ("60 %").
function loadText(week: WeekPlanWeek): string | null {
  if (week.loadPct >= 1) return null;
  return `${Math.round(week.loadPct * 100)} % vom Startgewicht`;
}

/** Hinweis zur laufenden Planwoche; null, wenn die Phase keinen Plan fuehrt
 *  (dann steuert der Coach wie bisher und es gibt nichts anzukuendigen). */
export function buildPlanNote(input: PlanNoteInput | null): PlanNote | null {
  if (!input) return null;
  const { week } = input;
  const weeks = Math.max(1, Math.round(input.phaseWeeks));
  const cur = Math.min(Math.max(1, Math.round(input.weekInPhase)), weeks);
  const step = input.weightStep != null && input.weightStep > 0 ? input.weightStep : 2.5;

  const targets = [
    `${setsText(week)} × ${repsText(week)}`,
    loadText(week),
    `Ziel RIR ${week.rir}`,
  ]
    .filter((s): s is string => s !== null)
    .join(" · ");

  const progress = input.deload
    ? DELOAD_PROGRESS
    : cur < weeks
      ? progressText(week, step, input.unit)
      : "Letzte Woche der Phase: höher geht es hier nicht mehr, " +
        "hol dir die Wiederholungen.";

  return {
    title: `${input.phaseName} · Woche ${cur} von ${weeks}`,
    targets,
    progress,
    hint: input.deload ? null : CLUSTER_HINT,
  };
}
