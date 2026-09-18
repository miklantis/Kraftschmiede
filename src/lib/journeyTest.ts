// Die bewussten 1RM-Tests einer Uebung INNERHALB einer Journey und was in der
// Testwoche daraus in der Kachel steht (#480). Reine Zuordnung und
// Textbildung, kein DOM-/DB-Bezug.
//
// Ein Test ist keine Trainingseinheit (siehe Architektur 3.3) und gehoert
// deshalb nicht in den Verlauf: im Chart riss er die Trendlinie am rechten
// Rand auf seinen Messwert hoch und legte seine Marke neben die Phasengrenze.
// Er steht jetzt dort, wo er hingehoert – im Block neben dem Chart, als
// Ergebnis: was gemessen wurde und was daraus in dieser Journey geworden ist.

import type { ExHistoryEntry } from "./exerciseHistory";
import { fmtNum, fmtWeight } from "./format";

// Ein bewusster 1RM-Test im Zeitraum der Journey (aus rm_tests).
export interface JourneyTestPoint {
  date: string;
  /** Bestes Set des Tests. */
  weight: number;
  reps: number;
  /** Daraus gerechnetes 1RM. */
  estRm: number;
}

/** Test mit Uebungsbezug, wie er aus rm_tests hereinkommt. */
export interface JourneyRmTestInput extends JourneyTestPoint {
  exerciseId: string;
}

// Die Tests EINER Uebung, die in diese Journey fallen, aelteste zuerst.
//
// rm_tests traegt keinen Journey-Stempel (anders als eine Einheit), deshalb
// entscheidet der Zeitraum: Journey-Start bis Journey-Ende, bei der laufenden
// Journey offen nach hinten. Ob der Test in der Testwoche oder zwischendurch
// gemacht wurde, spielt keine Rolle – er ist in dieser Journey passiert.
// Ohne Startdatum ist keine Zuordnung moeglich; dann bleibt die Liste leer,
// statt fremde Tests einzusammeln.
export function journeyTestPoints(
  tests: readonly JourneyRmTestInput[],
  exerciseId: string,
  startDate: string | null,
  endDate: string | null,
): JourneyTestPoint[] {
  if (startDate == null) return [];
  return tests
    .filter(
      (t) =>
        t.exerciseId === exerciseId &&
        t.date >= startDate &&
        (endDate == null || t.date <= endDate),
    )
    .map((t) => ({
      date: t.date,
      weight: t.weight,
      reps: t.reps,
      estRm: t.estRm,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Das gemessene Ergebnis: das getestete Set und das 1RM daraus. */
export interface JourneyTestResultView {
  date: string;
  /** Gemessenes Set, z. B. "100 kg × 3". */
  setText: string;
  /** 1RM aus diesem Set, z. B. "109 kg". */
  rmText: string;
}

/** Wohin sich das 1RM in dieser Journey bewegt hat: von der ersten Schaetzung
 *  zum heutigen Stand (nach einem Test der gemessene Wert). */
export interface JourneyRmProgressView {
  fromText: string;
  toText: string;
  /** Veraenderung in Prozent ("+37%"); null, wenn der Startwert das nicht
   *  hergibt. */
  pctText: string | null;
}

export interface JourneyTestView {
  /** null = in dieser Journey noch nicht getestet. */
  result: JourneyTestResultView | null;
  /** null = zu wenig Daten fuer eine Entwicklung (kein geschaetztes 1RM im
   *  Verlauf, z. B. bei Haltezeit- und Koerpergewichts-Uebungen). */
  progress: JourneyRmProgressView | null;
}

/** Geschaetzte 1RM des Journey-Verlaufs, aelteste zuerst. Nullwerte fallen
 *  weg – ohne Gewicht gibt es keine Schaetzung. */
function estimates(history: readonly ExHistoryEntry[]): number[] {
  return history
    .map((e) => e.est1RM)
    .filter((v): v is number => v != null && v > 0);
}

// Was in der Testwoche im Block einer Uebung steht: das Ergebnis des letzten
// Tests dieser Journey und die Entwicklung des 1RM darin.
//
// Der Endwert der Entwicklung ist der gemessene Test, sobald einer vorliegt –
// die Messung schlaegt die Schaetzung. Ohne Test bleibt es beim letzten
// geschaetzten Wert, und zwar nur, wenn es ueberhaupt zwei Werte gibt: aus
// einer einzigen Einheit laesst sich keine Entwicklung ablesen.
export function buildJourneyTestView(
  tests: readonly JourneyTestPoint[],
  history: readonly ExHistoryEntry[],
  unit: string,
): JourneyTestView {
  const last = tests.length > 0 ? tests[tests.length - 1] : null;
  const result: JourneyTestResultView | null =
    last === null
      ? null
      : {
          date: last.date,
          setText: fmtWeight(last.weight, unit) + " × " + fmtNum(last.reps),
          rmText: fmtWeight(last.estRm, unit),
        };

  const est = estimates(history);
  const from = est.length > 0 ? est[0] : null;
  const to =
    last !== null
      ? last.estRm
      : est.length >= 2
        ? est[est.length - 1]
        : null;

  const progress: JourneyRmProgressView | null =
    from === null || to === null
      ? null
      : {
          fromText: fmtWeight(from, unit),
          toText: fmtWeight(to, unit),
          pctText: pctText(from, to),
        };

  return { result, progress };
}

/** Veraenderung in Prozent, gerundet und mit Vorzeichen – dieselbe
 *  Schreibweise wie in der Statistikzeile (exChangePct). */
function pctText(from: number, to: number): string | null {
  if (from <= 0) return null;
  const pct = Math.round((to / from - 1) * 100);
  return (pct >= 0 ? "+" : "") + pct + "%";
}
