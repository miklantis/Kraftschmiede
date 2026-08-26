// Reine Aufbereitung des Trainingsverlaufs EINER Katalog-Uebung (kein DB-/DOM-
// Bezug, testbar). 1:1 aus V1 (app.js: exerciseHistory, exBestSet, exSixWeekPct),
// umgestellt auf das normalisierte Schema. Beruecksichtigt die Katalog-Uebungen
// (session_exercises mit passender exercise_id); Skill-Einheiten ohne Katalog-
// bezug (exercise_id null) sind hier bewusst nicht dabei – ihre Anbindung ueber
// die Skill-Definition kommt als eigener Schritt.

import type { HistorySessionInput } from "./history";
import { best1RMFromSets, record1RMFromSets } from "@/engine/oneRM";
import { misstGewicht } from "./exercises";
import type { EngineSet, RmFormula } from "@/engine/types";

export interface ExHistorySet {
  weight: number | null;
  reps: number | null;
  durationSec: number | null;
  score: number | null;
}

export interface ExHistoryEntry {
  date: string;
  topW: number; // hoechstes Arbeitssatz-Gewicht
  reps: number; // Summe der Arbeitssatz-Wiederholungen
  vol: number; // Summe reps*weight
  sec: number; // beste Haltezeit (Sek.), 0 wenn keine Dauer
  score: number | null; // Mittel der Arbeitssatz-Scores
  est1RM: number | null; // je Einheit aus den Arbeitssaetzen geschaetztes 1RM (Trend)
  // Rekord-Kandidat der Einheit: bestes geschaetztes 1RM aus sauberen Saetzen
  // mit hoechstens RECORD_MAX_REPS (5) Wiederholungen. null, wenn kein solcher
  // Satz vorliegt. Traegt die 1RM-Rekord-Treppe (nur ein <=5-Satz hebt den
  // Rekord, exakt wie die Automatik beim Beenden/Bearbeiten).
  record1RM: number | null;
  dev: boolean; // Abweichung (mind. ein angepasster Satz)
  sets: ExHistorySet[];
  // Journey-Stempel der Einheit (sessions.journey_id) und ihre eingefrorene
  // globale Journey-Woche (sessions.week). Durchgereicht, damit Ansichten den
  // Verlauf auf eine Journey eingrenzen koennen, ohne ihn ueber das Datum zu
  // raten. null = frei trainiert bzw. nicht mitgeliefert.
  journeyId: string | null;
  journeyWeek: number | null;
  // Phase, in der die Einheit lag (sessions.phase_id). Traegt die Phasengrenzen
  // im Journey-Chart: beim Phaseneintritt setzt der Coach den Anker neu, ohne
  // Markierung saehe dieser gewollte Sprung nach Fehler aus.
  phaseId: string | null;
  // Skill-Einheiten (ueber die Skill-Definition zugeordnet): kein Gewicht/1RM/
  // Score. metric + target steuern die Anzeige im Verlauf (Chips + "Ziel X").
  skill?: boolean;
  metric?: "reps" | "duration";
  target?: number | null;
}

function dateMs(d: string): number {
  const t = Date.parse(d);
  return Number.isNaN(t) ? 0 : t;
}

// Loest eine Skill-Uebung (per Skill-UUID + Phase + Position in der Phase) auf
// die hinterlegte Katalog-Uebung auf. Liefert null, wenn keine Zuordnung
// besteht. exerciseId ist die UUID der Katalog-Uebung (skill_phase_exercises.
// exercise_id); target/metric stammen aus der Skill-Definition.
export type SkillExResolve = (
  skillId: string,
  phase: number,
  position: number,
) => { exerciseId: string; metric: "reps" | "duration"; target: number | null } | null;

// Verlauf der Uebung aus allen absolvierten Einheiten, aelteste zuerst.
// Das 1RM je Einheit wird – wie in V1 zur Anzeigezeit – aus den sauberen
// Arbeitssaetzen geschaetzt (engine.best1RMFromSets mit der eingestellten
// Formel), nicht aus einem gespeicherten Feld. Das gespeicherte tested1RM
// blieb beim V1-Import leer (V1 fuellte es nie), daher diese Berechnung.
//
// skillResolve bindet zusaetzlich die Skill-Saetze an: Skill-Einheiten legen
// ihre Uebungen ohne Katalogbezug ab (session_exercises.exercise_id null),
// werden aber ueber die Skill-Definition (skillId + Phase + Position ->
// exerciseId) dieser Katalog-Uebung zugeordnet (1:1 wie V1 exerciseHistory).
// Ohne das Argument bleiben Skill-Einheiten aussen vor.
export function buildExerciseHistory(
  exerciseId: string,
  sessions: readonly HistorySessionInput[],
  formula: RmFormula = "mean",
  skillResolve?: SkillExResolve,
): ExHistoryEntry[] {
  const out: ExHistoryEntry[] = [];

  for (const s of sessions) {
    for (const ex of s.exercises) {
      if (ex.exerciseId !== exerciseId) continue;
      const work = ex.sets.filter((x) => x.kind !== "warmup");
      if (work.length === 0) continue;

      const topW = Math.max(...work.map((x) => x.weight ?? 0));
      const reps = work.reduce((a, x) => a + (x.reps ?? 0), 0);
      const vol = work.reduce(
        (a, x) => a + (x.reps ?? 0) * (x.weight ?? 0),
        0,
      );
      const sec = Math.max(0, ...work.map((x) => x.durationSec ?? 0));
      const scores = work
        .map((x) => x.score)
        .filter((v): v is number => typeof v === "number");
      const score =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : null;

      // 1RM aus allen Saetzen der Uebung (best1RMFromSets ueberspringt
      // Aufwaermen, nicht abgehakte und gescheiterte Saetze selbst).
      const engineSets: EngineSet[] = ex.sets.map((x) => ({
        type: x.kind === "warmup" ? "warmup" : "work",
        done: x.done ?? true,
        failed: x.failed ?? false,
        weight: x.weight ?? 0,
        reps: x.reps ?? 0,
      }));
      const est1RM = best1RMFromSets(engineSets, formula).value;
      const record1RM = record1RMFromSets(engineSets, formula);

      out.push({
        date: s.date,
        journeyId: s.journeyId ?? null,
        journeyWeek: s.journeyWeek ?? null,
        phaseId: s.phaseId ?? null,
        topW,
        reps,
        vol,
        sec,
        score,
        est1RM,
        record1RM,
        dev: work.some((x) => x.adjusted),
        sets: work.map((x) => ({
          weight: x.weight,
          reps: x.reps,
          durationSec: x.durationSec,
          score: x.score ?? null,
        })),
      });
    }
  }

  // Skill-Einheiten: Leistung liegt in Uebungen ohne Katalogbezug. Ueber die
  // Skill-Definition (skillId + Phase + Position) wird jede Skill-Uebung ihrer
  // Katalog-Uebung (exerciseId) zugeordnet. Nur abgehakte Saetze zaehlen; kein
  // Gewicht/1RM/Score. Abweichung = mind. ein Satz hat das Ziel verfehlt.
  if (skillResolve) {
    for (const s of sessions) {
      if (s.type !== "skill" || s.skillId == null || s.skillPhase == null) {
        continue;
      }
      for (const ex of s.exercises) {
        const def = skillResolve(s.skillId, s.skillPhase, ex.position);
        if (def == null || def.exerciseId !== exerciseId) continue;
        const done = ex.sets.filter((x) => x.done === true);
        if (done.length === 0) continue;
        const isDur = def.metric === "duration";
        const vals = done.map((x) =>
          isDur ? (x.durationSec ?? 0) : (x.reps ?? 0),
        );
        const sumReps = isDur ? 0 : vals.reduce((a, b) => a + b, 0);
        const topSec = isDur ? Math.max(0, ...vals) : 0;
        const anyMiss = done.some((x) => x.met === false);
        out.push({
          date: s.date,
          journeyId: s.journeyId ?? null,
          journeyWeek: s.journeyWeek ?? null,
          phaseId: s.phaseId ?? null,
          topW: 0,
          reps: sumReps,
          vol: isDur ? topSec : sumReps,
          sec: topSec,
          score: null,
          est1RM: null,
          record1RM: null,
          dev: anyMiss,
          sets: done.map((x) => ({
            weight: null,
            reps: isDur ? null : (x.reps ?? 0),
            durationSec: isDur ? (x.durationSec ?? 0) : null,
            score: null,
          })),
          skill: true,
          metric: isDur ? "duration" : "reps",
          target: def.target,
        });
      }
    }
  }

  out.sort((a, b) => dateMs(a.date) - dateMs(b.date));
  return out;
}

// Die Einheiten EINER Journey. Massgeblich ist der Journey-Stempel der Einheit
// (sessions.journey_id), nicht ihr Datum: nur so zaehlt eine Einheit genau zu
// der Journey, in der sie tatsaechlich gelaufen ist – auch wenn Journeys
// spaeter umbenannt, verschoben oder abgeschlossen werden. Skill-Einheiten
// tragen keinen Stempel und bleiben damit bewusst aussen vor.
// Der Journey-Bezug kommt als Parameter herein (nicht "die aktive Journey"),
// damit die Rueckschau abgeschlossener Journeys denselben Baustein nutzen kann.
export function filterJourneySessions(
  sessions: readonly HistorySessionInput[],
  journeyId: string,
): HistorySessionInput[] {
  return sessions.filter((s) => s.journeyId === journeyId);
}

// Die Wiederholungszahl JE ARBEITSSATZ einer Einheit – die Zahl, die bei
// Doppelprogression wandert. Bewusst nicht die Summe der Einheit (das ist die
// Metrik "Wdh" auf der Uebungsseite): bei drei Saetzen a 8 Wiederholungen ist
// die gesuchte Zahl 8, nicht 24.
//
// Gerade Saetze sind der Normalfall, dann ist die Antwort eindeutig. Weichen
// einzelne Saetze ab (ein abgebrochener letzter Satz, eine Pyramide), zaehlt
// die haeufigste Wiederholungszahl, bei Gleichstand die hoehere – so bleibt es
// immer eine tatsaechlich geleistete Zahl. null, wenn kein Satz Wiederholungen
// traegt (reine Haltezeit-Uebung).
export function repsPerSet(e: ExHistoryEntry): number | null {
  const reps = e.sets
    .map((s) => s.reps)
    .filter((r): r is number => typeof r === "number" && r > 0);
  if (reps.length === 0) return null;
  const count = new Map<number, number>();
  for (const r of reps) count.set(r, (count.get(r) ?? 0) + 1);
  let best = reps[0];
  let bestN = 0;
  for (const [r, n] of count) {
    if (n > bestN || (n === bestN && r > best)) {
      best = r;
      bestN = n;
    }
  }
  return best;
}

// Bester einzelner Arbeitssatz ueber den ganzen Verlauf (hoechstes Gewicht,
// dann meiste Wiederholungen) – fuer die Detail-Statistik "bestes Set".
export function exBestSet(
  h: readonly ExHistoryEntry[],
): { weight: number; reps: number } | null {
  let best: { weight: number; reps: number } | null = null;
  for (const e of h) {
    for (const s of e.sets) {
      if (s.weight == null) continue;
      const reps = s.reps ?? 0;
      if (
        !best ||
        s.weight > best.weight ||
        (s.weight === best.weight && reps > best.reps)
      ) {
        best = { weight: s.weight, reps };
      }
    }
  }
  return best;
}

// 1RM-Veraenderung ueber die GANZE uebergebene Liste als Prozent-String – vom
// ersten bis zum letzten Wert. Gegenstueck zu exSixWeekPct, das ein festes
// Zeitfenster nimmt: hier bestimmt der Aufrufer den Zeitraum ueber die Liste,
// die er hereingibt (z. B. nur die Einheiten einer Journey). null bei zu wenig
// Daten.
export function exChangePct(h: readonly ExHistoryEntry[]): string | null {
  const s = h.filter((x) => x.est1RM != null);
  if (s.length < 2) return null;
  const first = s[0].est1RM as number;
  const last = s[s.length - 1].est1RM as number;
  if (!first || !last) return null;
  const pct = (last / first - 1) * 100;
  return (pct >= 0 ? "+" : "") + Math.round(pct) + "%";
}

// 1RM-Veraenderung ueber ~6 Wochen als Prozent-String; null bei zu wenig Daten.
export function exSixWeekPct(h: readonly ExHistoryEntry[]): string | null {
  const s = h.filter((x) => x.est1RM != null);
  if (s.length < 2) return null;
  const last = s[s.length - 1];
  const cutMs = dateMs(last.date) - 42 * 86400000;
  let base = s[0];
  for (const e of s) {
    if (dateMs(e.date) <= cutMs) base = e;
  }
  if (!base.est1RM || !last.est1RM) return null;
  const pct = (last.est1RM / base.est1RM - 1) * 100;
  return (pct >= 0 ? "+" : "") + Math.round(pct) + "%";
}

// ---------------------------------------------------------------------------
// Chart-Metriken (1:1 aus V1 app.js: exMetricOptions, METRIC_LABELS,
// exerciseChartData). Reine Aufbereitung; das Zeichnen liegt in der Komponente.

import { isoWeekKey } from "@/engine/journey";

// Linien-Metriken (eine Kurve je Einheit). "volume" ist gesondert (Balken).
// "rm" = beweisgebundener Rekord (Treppe, siehe recordSeries). "trend" = die
// weiche Kurve aus dem geschaetzten 1RM je Einheit (est1RM), ohne Rep-Tor -
// Verlauf der Leistung, kein Rekord.
export type ExLineMetric = "rm" | "trend" | "weight" | "reps" | "duration";
export type ExMetric = ExLineMetric | "volume";

export interface ExMetricOption {
  key: ExMetric;
  label: string; // kurzes Chip-Label
}

// Kartentitel je Metrik (V1 METRIC_LABELS).
export const EX_METRIC_TITLE: Record<ExMetric, string> = {
  rm: "1RM (Rekord)",
  trend: "Leistungstrend",
  weight: "Arbeitsgewicht (Top-Satz)",
  reps: "Wiederholungen (Summe Arbeitssätze)",
  duration: "Haltezeit (Sek., bester Satz)",
  volume: "Wochenvolumen",
};

// Kurzbezeichnung je Metrik fuer den Pin-Titel "Übung · Metrik" (V1 EX_METRIC_SHORT).
export const EX_METRIC_SHORT: Record<ExMetric, string> = {
  rm: "1RM",
  trend: "Trend",
  weight: "Arbeitsgewicht",
  reps: "Wiederholungen",
  duration: "Haltezeit",
  volume: "Volumen",
};

// Waehlbare Metriken je Uebung (V1 exMetricOptions).
//
// Entscheidend ist die Metrik der Uebung, nicht ihr Profil (siehe
// lib/exercises.ts misstGewicht): eine Uebung ohne Gewicht kann kein 1RM, kein
// Top-Gewicht und keinen Trend tragen, und diese Metriken anzubieten hiesse,
// leere Charts zur Auswahl zu stellen. Bei Haltezeit bleibt genau eine sinnvolle
// Kurve uebrig, bei Wiederholungen sind es Wdh und Volumen.
export function exMetricOptions(
  metric: "reps" | "duration" | null,
): ExMetricOption[] {
  if (!misstGewicht(metric)) {
    if (metric === "duration") return [{ key: "duration", label: "Haltezeit" }];
    return [
      { key: "reps", label: "Wdh" },
      { key: "volume", label: "Volumen" },
    ];
  }
  return [
    { key: "rm", label: "1RM" },
    { key: "trend", label: "Trend" },
    { key: "weight", label: "Top-Gewicht" },
    { key: "reps", label: "Wdh" },
    { key: "volume", label: "Volumen" },
  ];
}

// Standard-Metrik je Uebung (V1 exDetailParts.metric). Immer die erste aus
// exMetricOptions – beide muessen dieselbe Weiche nehmen, sonst startet die
// Karte auf einer Metrik, die gar nicht zur Auswahl steht.
export function exDefaultMetric(
  metric: "reps" | "duration" | null,
): ExMetric {
  if (!misstGewicht(metric)) return metric === "duration" ? "duration" : "reps";
  return "rm";
}

export interface ExLinePoint {
  y: number;
  flag: boolean; // Abweichung in dieser Einheit
  /** Punkt stammt aus einem bewussten 1RM-Test, nicht aus einer Einheit. */
  test?: boolean;
  /**
   * Datum des Punktes (ISO, YYYY-MM-DD). Traegt die zeitliche Platzierung im
   * Chart: die x-Achse laeuft nach Datum, damit Trainingspausen als Luecke
   * sichtbar bleiben. Leer, wenn kein Datum bestimmbar ist (dann faellt der
   * Chart auf gleichmaessige Verteilung zurueck).
   */
  date: string;
}

/** Ein 1RM-Test fuer die Chart-Reihe (aus rm_tests). */
export interface ExRmTestPoint {
  date: string;
  estRm: number;
}

export interface ExBar {
  label: string;
  value: number;
}

// Linienpunkte je Einheit (aelteste zuerst). "trend" zeichnet das geschaetzte
// 1RM je Einheit als weiche Kurve (nur Einheiten mit Wert), ohne Tests - der
// Rekord laeuft ueber recordSeries. "rm" wird hier nicht bedient (die Aufrufer
// nutzen dafuer recordSeries); als sichere Rueckfalllinie liefert es dieselbe
// Trend-Kurve.
export function exLineSeries(
  h: readonly ExHistoryEntry[],
  metric: ExLineMetric,
): ExLinePoint[] {
  if (metric === "rm" || metric === "trend") {
    return h
      .filter((x) => x.est1RM != null)
      .map((x) => ({ y: x.est1RM as number, flag: x.dev, date: x.date }));
  }
  const pick =
    metric === "weight"
      ? (x: ExHistoryEntry) => x.topW
      : metric === "reps"
        ? (x: ExHistoryEntry) => x.reps
        : (x: ExHistoryEntry) => x.sec || 0;
  return h.map((x) => ({ y: pick(x), flag: x.dev, date: x.date }));
}

// Die 1RM-Rekord-Treppe: der beweisgebundene Rekord ueber die Zeit. Sie steigt
// nur an Tagen mit einem sauberen <=5-Wdh-Satz, der den bisherigen Rekord
// schlaegt (record1RM der Einheit), und wird von einem bewussten Test hoch ODER
// runter gesetzt. Zwischen den Aenderungen bleibt sie flach (die Komponente
// zeichnet sie als Stufen). Jeder Punkt traegt test=true, wenn er aus einem Test
// stammt, sonst false (Trainings-PR) - so lassen sich beide optisch trennen.
//
// Ende an den Block gebunden: steht ein gespeicherter Rekord (storedRm) und
// weicht der nachgerechnete Endwert davon ab (z. B. Altdaten, deren Rekord aus
// einem Satz mit vielen Wiederholungen stammt), wird zuletzt ein Punkt auf
// storedRm ergaenzt. So endet die Treppe garantiert auf der Zahl im 1RM-Block.
export function recordSeries(
  h: readonly ExHistoryEntry[],
  rmTests: readonly ExRmTestPoint[] = [],
  storedRm: number | null = null,
): ExLinePoint[] {
  const EPS = 1e-6;
  type Ev = { date: string; y: number; test: boolean };
  const evs: Ev[] = [
    ...h
      .filter((x) => x.record1RM != null)
      .map((x) => ({ date: x.date, y: x.record1RM as number, test: false })),
    ...rmTests.map((t) => ({ date: t.date, y: t.estRm, test: true })),
  ];
  // Chronologisch; bei gleichem Datum steht der Test hinter der Einheit (er wird
  // in aller Regel danach gemacht und darf den Rekord dann setzen).
  evs.sort((a, b) => {
    const d = dateMs(a.date) - dateMs(b.date);
    if (d !== 0) return d;
    return (a.test ? 1 : 0) - (b.test ? 1 : 0);
  });

  const pts: ExLinePoint[] = [];
  let rec: number | null = null;
  for (const ev of evs) {
    if (ev.test) {
      // Bewusster Test: setzt den Rekord hoch oder runter, immer eine Stufe.
      rec = ev.y;
      pts.push({ y: rec, flag: false, test: true, date: ev.date });
    } else if (rec == null || ev.y > rec + EPS) {
      // Trainings-PR: hebt den Rekord an (nie senken).
      rec = ev.y;
      pts.push({ y: rec, flag: false, test: false, date: ev.date });
    }
  }

  if (storedRm != null) {
    if (pts.length === 0 || Math.abs(pts[pts.length - 1].y - storedRm) > EPS) {
      // Der Blockwert traegt kein eigenes Datum; er gilt seit dem letzten
      // bekannten Ereignis und sitzt daher auf dessen Tag (leer, wenn es gar
      // keins gibt - dann ist er ohnehin der einzige Punkt).
      const lastDate =
        evs.length > 0
          ? evs[evs.length - 1].date
          : h.length > 0
            ? h[h.length - 1].date
            : "";
      pts.push({ y: storedRm, flag: false, test: false, date: lastDate });
    }
  }
  return pts;
}

// Wochenvolumen als Balken (Summe reps*weight je ISO-Woche, chronologisch).
// Label = letzte drei Zeichen des Wochenschluessels (z. B. "W12"), wie V1.
export function exVolumeSeries(h: readonly ExHistoryEntry[]): ExBar[] {
  const byWeek = new Map<string, number>();
  for (const x of h) {
    const wk = isoWeekKey(x.date);
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + x.vol);
  }
  return [...byWeek.keys()]
    .sort()
    .map((wk) => ({ label: wk.slice(-3), value: byWeek.get(wk) as number }));
}
