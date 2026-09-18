// Reine Aufbereitung des Verlaufscharts einer Uebung INNERHALB einer Journey
// (#283, Schritt 2). Kein DOM-/DB-Bezug, testbar; das Zeichnen liegt in der
// Komponente.
//
// Anders als der Chart der Uebungsseite (eine umgeschaltete Metrik) zeigt
// dieser mehrere Linien gleichzeitig: was das Gewicht gemacht hat, wo die
// Wiederholungen gewandert sind, wie schwer es sich anfuehlte und wohin die
// Leistung laeuft. Jede Serie wird auf ihre eigene Spanne normalisiert (das
// macht die Komponente) – hier entstehen nur die Rohwerte je Einheit. Welche
// Serien eine Uebung hat, sagen ihre Daten (siehe buildJourneySeries).
//
// Ein Datenpunkt ist eine absolvierte Einheit dieser Uebung in dieser Journey,
// nicht die Journey-Woche: bei Hypertrophie fallen mehrere Entscheidungen pro
// Woche, eine Wochen-Achse wuerde sie verschlucken.

import { repsPerSet, type ExHistoryEntry } from "./exerciseHistory";
import { fmtNum, fmtScore, fmtWeight } from "./format";

export type JourneySeriesKey = "weight" | "reps" | "score" | "trend";

// Reihenfolge der Serien in Schalterreihe und Zeichnung.
export const JOURNEY_SERIES_KEYS: readonly JourneySeriesKey[] = [
  "weight",
  "reps",
  "score",
  "trend",
];

// Kurzbeschriftung der Schalterreihe im Abschnittskopf. Sie gilt fuer alle
// Kacheln gemeinsam, deshalb bewusst neutral: bei Haltezeit-Uebungen traegt
// dieselbe Serie in der Kachel das Label "Haltezeit" (siehe seriesLabel).
export const JOURNEY_SERIES_CHIP: Record<JourneySeriesKey, string> = {
  weight: "Gewicht",
  reps: "Wdh",
  score: "Score",
  trend: "Trend",
};

// Was die Serie misst – entscheidet ueber die Schreibweise im Tooltip.
export type JourneySeriesUnit = "weight" | "reps" | "seconds" | "score";

export interface JourneyChartPoint {
  /** Tag der Einheit (ISO). Traegt die Platzierung auf der x-Achse. */
  date: string;
  value: number;
  /** Punkt stammt aus einem bewussten 1RM-Test, nicht aus einer Einheit
   *  (nur auf der Trendlinie moeglich). Die Kachel hebt ihn hervor. */
  test?: boolean;
}

// Ein bewusster 1RM-Test im Zeitraum der Journey (aus rm_tests). Er ist KEINE
// Trainingseinheit (siehe Architektur 3.3) und taucht deshalb nur an zwei
// Stellen im Chart auf: als Punkt auf der Trendlinie – der Test misst genau
// das, was die Trendlinie schaetzt – und als senkrechte Marke auf der
// Zeitachse. Gewicht, Wiederholungen und Score bleiben unberuehrt: ein
// Testsatz ist kein Arbeitssatz, in diesen Linien wuerde er den Verlauf
// verfaelschen (Gewicht springt, Wiederholungen knicken ein, eine
// Anstrengung speichert der Test gar nicht).
export interface JourneyTestPoint {
  date: string;
  /** Bestes Set des Tests. */
  weight: number;
  reps: number;
  /** Daraus geschaetztes 1RM – der Wert, der auf der Trendlinie sitzt. */
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

export interface JourneyChartSeries {
  key: JourneySeriesKey;
  /** Beschriftung in dieser Kachel (z. B. "Haltezeit" statt "Wiederholungen"). */
  label: string;
  unit: JourneySeriesUnit;
  points: JourneyChartPoint[];
}

function seriesLabel(
  key: JourneySeriesKey,
  metric: "reps" | "duration" | null,
): string {
  if (key === "reps") {
    return metric === "duration" ? "Haltezeit" : "Wiederholungen";
  }
  if (key === "weight") return "Gewicht";
  if (key === "score") return "Score";
  return "Trend";
}

function seriesUnit(
  key: JourneySeriesKey,
  metric: "reps" | "duration" | null,
): JourneySeriesUnit {
  if (key === "weight" || key === "trend") return "weight";
  if (key === "score") return "score";
  return metric === "duration" ? "seconds" : "reps";
}

// Wert einer Einheit fuer eine Serie; null = diese Einheit traegt zu dieser
// Serie nichts bei (z. B. keine Wiederholungen bei reiner Haltezeit).
function seriesValue(
  key: JourneySeriesKey,
  e: ExHistoryEntry,
  metric: "reps" | "duration" | null,
): number | null {
  if (key === "weight") return e.topW > 0 ? e.topW : null;
  if (key === "score") return e.score;
  // Ohne Gewicht gibt es kein geschaetztes 1RM (die Engine liefert dann null);
  // die 0 wird zusaetzlich abgefangen, damit keine Nulllinie entsteht.
  if (key === "trend") return e.est1RM != null && e.est1RM > 0 ? e.est1RM : null;
  if (metric === "duration") return e.sec > 0 ? e.sec : null;
  return repsPerSet(e);
}

// Die Serien einer Uebung aus ihrem (bereits journey-gefilterten) Verlauf.
//
// Welche Serien erscheinen, entscheiden die DATEN, nicht das Profil: eine Serie
// ohne einen einzigen Wert faellt weg. Damit zeigt eine Core-Uebung mit
// Arbeitsgewicht (Core Twist) ihre Gewichts- und Trendlinie, waehrend Plank und
// die Koerpergewichts-Uebungen (kein Gewicht, kein geschaetztes 1RM) von selbst
// nur Leistung je Satz und Anstrengung tragen. Eine Regel am Profil hatte genau
// hier danebengelegen und Core pauschal die Gewichtslinie genommen.
export function buildJourneySeries(
  history: readonly ExHistoryEntry[],
  metric: "reps" | "duration" | null,
  tests: readonly JourneyTestPoint[] = [],
): JourneyChartSeries[] {
  const testDates = new Set(tests.map((t) => t.date));
  const out: JourneyChartSeries[] = [];
  for (const key of JOURNEY_SERIES_KEYS) {
    const points: JourneyChartPoint[] = [];
    for (const e of history) {
      // Am Testtag gilt der gemessene Wert: die Schaetzung aus der Einheit
      // desselben Tages faellt weg, sonst staenden zwei 1RM uebereinander.
      if (key === "trend" && testDates.has(e.date)) continue;
      const v = seriesValue(key, e, metric);
      if (v == null) continue;
      points.push({ date: e.date, value: v });
    }
    if (key === "trend") {
      for (const t of tests) {
        points.push({ date: t.date, value: t.estRm, test: true });
      }
      points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    }
    if (points.length === 0) continue;
    out.push({
      key,
      label: seriesLabel(key, metric),
      unit: seriesUnit(key, metric),
      points,
    });
  }
  return out;
}

// Die Zeitachse der Kachel: ein Eintrag je TAG mit Ereignis in dieser Journey,
// aelteste zuerst. Ereignis heisst Einheit oder Test – die Testwoche plant
// keine Einheit, der Testtag liegt also in aller Regel hinter der letzten
// Einheit und braucht seinen eigenen Platz auf der Achse. Mehrere Einheiten
// desselben Tages teilen sich wie bisher einen Platz; die Zeit bleibt die
// Wahrheit der Achse.
export function journeyChartDates(
  history: readonly ExHistoryEntry[],
  tests: readonly JourneyTestPoint[] = [],
): string[] {
  const days = new Set<string>();
  for (const e of history) days.add(e.date);
  for (const t of tests) days.add(t.date);
  return [...days].sort();
}

// Anzeigetext des getesteten Sets im Tooltip. Das geschaetzte 1RM steht schon
// als Trendwert daneben – hier steht, woraus es kommt.
export function testValueText(
  test: JourneyTestPoint,
  weightUnit: string,
): string {
  return (
    "Test " + fmtWeight(test.weight, weightUnit) + " × " + fmtNum(test.reps)
  );
}

// Anzeigetext eines Wertes im Tooltip. Der Trend ist ein geschaetztes 1RM und
// traegt deshalb sein Wort mit, sonst staenden zwei Gewichte ohne Unterschied
// nebeneinander.
export function seriesValueText(
  series: Pick<JourneyChartSeries, "key" | "unit">,
  value: number,
  weightUnit: string,
): string {
  if (series.key === "trend") return "Trend " + fmtWeight(value, weightUnit);
  if (series.unit === "weight") return fmtWeight(value, weightUnit);
  if (series.unit === "seconds") return fmtNum(value) + " s";
  if (series.unit === "score") return "Ø " + fmtScore(value);
  return fmtNum(value) + " Wdh";
}

// Beginn einer Phase im Verlauf: der TAG der ersten Einheit, die in dieser
// Phase lag. Der erste Tag der Achse ist der Einstieg (keine Grenze davor),
// jeder weitere eine Phasengrenze – dort setzt der Coach den Anker neu.
//
// Am Datum, nicht am Listenindex: die Achse traegt seit dem Test auch Tage
// ohne Einheit, ein Index in die Verlaufsliste zeigte dort ins Leere.
export interface JourneyPhaseMark {
  date: string;
  name: string;
}

export function journeyPhaseMarks(
  history: readonly ExHistoryEntry[],
  phaseNames: Readonly<Record<string, string>>,
): JourneyPhaseMark[] {
  const out: JourneyPhaseMark[] = [];
  let prev: string | null = null;
  history.forEach((e, i) => {
    const id = e.phaseId ?? null;
    if (i > 0 && id === prev) return;
    prev = id;
    const name = id == null ? null : (phaseNames[id] ?? null);
    if (name != null) out.push({ date: e.date, name });
  });
  return out;
}

// ---------------------------------------------------------------------------
// Geraete-lokaler Merker, welche Serien eingeschaltet sind. Wie beim Anheften
// (pinnedCharts) bewusst nicht in der Datenbank: die Auswahl ist eine
// Ansichtssache dieses Geraets, kein Datenbestand. Reine Helfer hier, die
// Persistenz liegt in hooks/useJourneySeries.ts.

export const JOURNEY_SERIES_STORAGE_KEY = "ks_journey_series_v1";

// Nichts gemerkt (oder unlesbar) heisst: alle Serien an. Ein gemerktes leeres
// Array bleibt dagegen leer – "alles aus" ist eine gueltige Wahl.
export function parseSeriesKeys(raw: string | null): JourneySeriesKey[] {
  if (!raw) return [...JOURNEY_SERIES_KEYS];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [...JOURNEY_SERIES_KEYS];
  }
  if (!Array.isArray(data)) return [...JOURNEY_SERIES_KEYS];
  return JOURNEY_SERIES_KEYS.filter((k) => data.includes(k));
}

export function serializeSeriesKeys(keys: readonly JourneySeriesKey[]): string {
  return JSON.stringify(keys);
}

// Umschalten; die Reihenfolge bleibt immer die feste Serien-Reihenfolge.
export function toggleSeriesKey(
  keys: readonly JourneySeriesKey[],
  key: JourneySeriesKey,
): JourneySeriesKey[] {
  const on = keys.includes(key);
  return JOURNEY_SERIES_KEYS.filter((k) =>
    k === key ? !on : keys.includes(k),
  );
}
