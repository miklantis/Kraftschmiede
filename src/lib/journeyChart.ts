// Reine Aufbereitung des Verlaufscharts einer Uebung INNERHALB einer Journey
// (#283, Schritt 2). Kein DOM-/DB-Bezug, testbar; das Zeichnen liegt in der
// Komponente.
//
// Anders als der Chart der Uebungsseite (eine umgeschaltete Metrik) zeigt
// dieser mehrere Linien gleichzeitig: was das Gewicht gemacht hat, wo die
// Wiederholungen gewandert sind, wie schwer es sich anfuehlte und wohin die
// Leistung laeuft. Jede Serie wird auf ihre eigene Spanne normalisiert (das
// macht die Komponente) – hier entstehen nur die Rohwerte je Einheit.
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
}

export interface JourneyChartSeries {
  key: JourneySeriesKey;
  /** Beschriftung in dieser Kachel (z. B. "Haltezeit" statt "Wiederholungen"). */
  label: string;
  unit: JourneySeriesUnit;
  points: JourneyChartPoint[];
}

// Welche Serien eine Uebung ueberhaupt hat. Journey-gesteuert (Profil
// "strength", Haupt- wie Assistenzuebungen) sind es alle vier; Core und
// Koerpergewicht steuert der Coach nicht ueber die Journey – dort gibt es
// weder ein Arbeitsgewicht noch einen Leistungstrend, nur die Leistung je Satz
// (Wiederholungen bzw. Haltezeit) und die Anstrengung.
export function journeySeriesKeysFor(profile: string): JourneySeriesKey[] {
  if (profile === "core" || profile === "bodyweight") return ["reps", "score"];
  return [...JOURNEY_SERIES_KEYS];
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
  if (key === "trend") return e.est1RM;
  if (metric === "duration") return e.sec > 0 ? e.sec : null;
  return repsPerSet(e);
}

// Die Serien einer Uebung aus ihrem (bereits journey-gefilterten) Verlauf.
// Serien ohne einen einzigen Wert fallen weg – eine leere Linie sagt nichts.
export function buildJourneySeries(
  history: readonly ExHistoryEntry[],
  profile: string,
  metric: "reps" | "duration" | null,
): JourneyChartSeries[] {
  const out: JourneyChartSeries[] = [];
  for (const key of journeySeriesKeysFor(profile)) {
    const points: JourneyChartPoint[] = [];
    for (const e of history) {
      const v = seriesValue(key, e, metric);
      if (v == null) continue;
      points.push({ date: e.date, value: v });
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

// Beginn einer Phase im Verlauf: der Index der ersten Einheit, die in dieser
// Phase lag. index 0 ist der Einstieg (keine Grenze davor), jeder weitere Index
// eine Phasengrenze – dort setzt der Coach den Anker neu.
export interface JourneyPhaseMark {
  index: number;
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
    if (name != null) out.push({ index: i, name });
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
