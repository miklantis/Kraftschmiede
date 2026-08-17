// Gewichtsvorschlag fuer die naechste Einheit (Doppelprogression).
// Erst Wiederholungen im Repband steigern, dann das Gewicht; bei Versagen oder
// zu hoher Anstrengung halten oder senken. Reentry = vorsichtiger Wiedereinstieg.
// Wird das Wiederholungsziel zweimal in Folge am selben Gewicht verfehlt, geht
// es einen Schritt zurueck (Rueckwaertsregel, ADR-0015).

import { avg } from "./math";
import { nearestLoadable, nearestDumbbell } from "./plates";
import { metTarget, workSets } from "./target";
import type { Bar, EngineSet, SetEntry } from "./types";

export interface SuggestExercise {
  workWeight?: number;
  repRange?: [number, number];
  targetScore?: number;
  barId?: string;
}

// Von der Journey vorgegebene Last: Referenzgewicht x Lastfaktor der Phase.
// `cap` = true, solange der Lastfaktor unter 1 liegt – dann ist `weight`
// zugleich Zielwert und Obergrenze: die Rampe der Journey steuert das Gewicht,
// nicht die Tagesform. Bei Lastfaktor 1 (Abschlussphase) wirkt `weight` nur als
// Untergrenze, damit die Journey wieder exakt am alten Niveau ankommt und der
// Coach von dort normal weiterarbeitet.
export interface RampLoad {
  weight: number;
  cap: boolean;
}

export interface SuggestOpts {
  bar?: Bar;
  plates?: number[];
  // Vorhandene Kurzhantel-Stufen. Ist die Liste gesetzt und nicht leer, wird das
  // Gewicht auf die naechste feste Stufe gerundet statt mit Scheiben geladen.
  dumbbells?: number[];
  reentry?: boolean;
  // Vorgabe einer Lastfaktor-Journey; ohne sie rechnet der Coach wie gewohnt.
  ramp?: RampLoad | null;
  // Schrittweite eines Gewichtssprungs aus den Einstellungen (kg). Ohne Angabe
  // der bisherige Standard 2,5. Gerundet wird danach weiterhin auf eine ladbare
  // Stufe (Scheiben bzw. Kurzhantel-Inventar).
  step?: number | null;
  // Einheit vor `lastEntry` derselben Uebung, fuer die Rueckwaertsregel bei
  // mehrfach verfehltem Ziel. Ohne sie verhaelt sich der Coach wie bisher.
  prevEntry?: SetEntry | null;
}

export type SuggestDecision = "increase" | "hold" | "decrease" | "increase-reps";

export interface SuggestResult {
  weight: number;
  targetReps: number;
  decision: SuggestDecision;
  note: string;
}

const DEFAULT_PLATES = [1.25, 2.5, 5, 10, 15, 20, 25];

// Toleranz fuer den normalen Wiederholungsabfall ueber die Arbeitssaetze:
// wie viele Wiederholungen ein spaeter Satz unter dem Ziel bzw. dem Bandende
// liegen darf, ohne dass die Steigerung blockiert wird. Der Abfall ist
// Ermuedung und kein Zeichen zu hoher Last (siehe ADR-0015 und #174) – bei
// kurzer Pause faellt schon der zweite Satz ab, bei langer der dritte. Ohne
// Toleranz erreicht in einer Hypertrophie-Phase mit fuenf bis sechs Saetzen
// der letzte Satz das Bandende praktisch nie und das Gewicht friert ein.
// Der Deckel auf die halbe Bandbreite haelt enge Kraftbaender streng:
// Band 8-12 erlaubt hoechstens 2, Band 4-6 hoechstens 1.
function repTolerance(setCount: number, range: [number, number]): number {
  const byCount = setCount >= 5 ? 2 : setCount >= 3 ? 1 : 0;
  const byBand = Math.floor((range[1] - range[0]) / 2);
  return Math.max(0, Math.min(byCount, byBand));
}

// Ziel-Bewertung einer Einheit mit der Toleranz: mindestens ein Arbeitssatz muss
// sein Ziel voll erfuellt haben, die uebrigen duerfen bis zu `tol`
// Wiederholungen darunter liegen. Gewicht und Versagen bleiben strikt -
// toleriert wird ausschliesslich der Wiederholungsabfall. Ohne Arbeitssaetze
// gilt das Ziel als nicht erfuellt.
function metAllWithTolerance(
  ws: EngineSet[],
  range: [number, number],
): boolean {
  if (!ws.length) return false;
  const tol = repTolerance(ws.length, range);
  const ok = (s: EngineSet): boolean => {
    if (s.targetReps == null || s.targetWeight == null) return false;
    const reps = s.reps || 0;
    return (
      reps >= s.targetReps - tol &&
      s.weight >= s.targetWeight - 1e-9 &&
      !(s.failed && reps < s.targetReps)
    );
  };
  return ws.some((s) => metTarget(s) === true) && ws.every(ok);
}

// Schwerster Arbeitssatz einer Einheit; null ohne verwertbaren Satz. Bezug fuer
// die Frage, ob zwei Einheiten am selben Gewicht gearbeitet haben.
function topWorkWeight(ws: EngineSet[]): number | null {
  let top: number | null = null;
  for (const s of ws) {
    const w = typeof s.weight === "number" ? s.weight : null;
    if (w != null && (top == null || w > top)) top = w;
  }
  return top;
}

// Rueckwaertsregel: Hat die Einheit VOR der letzten dasselbe Gewicht bewegt und
// dort das Ziel ebenfalls verfehlt, ist die Last zu schwer - der Coach senkt,
// statt das Bandende ein weiteres Mal vorzugeben. Weicht das Gewicht ab (bereits
// gesenkt, Phase hat die Last verschoben, Kurzhantel-Stufe gewechselt), beginnt
// die Zaehlung neu: so kann die Regel nicht zweimal hintereinander greifen.
function missedBefore(
  prevEntry: SetEntry | null | undefined,
  range: [number, number],
  weight: number | null,
): boolean {
  if (weight == null) return false;
  const ws = workSets(prevEntry);
  if (!ws.length) return false;
  const top = topWorkWeight(ws);
  if (top == null || Math.abs(top - weight) > 1e-9) return false;
  return !metAllWithTolerance(ws, range);
}

export function suggestWeight(
  ex: SuggestExercise,
  lastEntry: SetEntry | null | undefined,
  opts?: SuggestOpts,
): SuggestResult {
  const o = opts ?? {};
  const bar = o.bar ?? { weight: 20 };
  const plates = o.plates ?? DEFAULT_PLATES;
  const range = ex.repRange ?? [8, 12];
  const tScore = ex.targetScore || 3;
  const W = ex.workWeight || bar.weight;
  const reentry = !!o.reentry;
  // Schrittweite aus den Einstellungen; unplausible Werte fallen auf 2,5 zurueck.
  const step = o.step != null && o.step > 0 ? o.step : 2.5;

  const ld = (x: number, down?: boolean): number =>
    o.dumbbells && o.dumbbells.length
      ? nearestDumbbell(x, o.dumbbells, !!down)
      : nearestLoadable(x, bar.weight, plates, !!down);

  // Rampenlast der Journey, auf eine ladbare Stufe abgerundet.
  const ramp =
    o.ramp && o.ramp.weight > 0
      ? { weight: ld(o.ramp.weight, true), cap: o.ramp.cap }
      : null;

  // Die Vorgabe der Journey auf einen fertigen Vorschlag anwenden.
  // `reacting` = der Vorschlag geht wegen Versagen/zu hoher Anstrengung nach
  // unten; dann deckelt die Rampe nur, sie hebt nichts an. `capReps` sind die
  // Wiederholungen, die stehen bleiben, wenn der Deckel eine Gewichtssteigerung
  // schluckt (sonst faellt die doppelte Progression auf das Bandende zurueck).
  const withRamp = (
    res: SuggestResult,
    reacting?: boolean,
    capReps?: number,
  ): SuggestResult => {
    if (!ramp) return res;
    if (!ramp.cap) {
      // Abschlussphase: nur Untergrenze, und nur wenn nicht gerade gesenkt wird.
      if (reacting || res.weight >= ramp.weight - 1e-9) return res;
      return {
        weight: ramp.weight,
        targetReps: res.targetReps,
        decision: "increase",
        note: "Abschlussphase – zurueck auf das Referenzgewicht",
      };
    }
    if (res.weight > ramp.weight + 1e-9) {
      return {
        weight: ramp.weight,
        targetReps: capReps ?? res.targetReps,
        decision: reacting ? res.decision : "hold",
        note: reacting
          ? res.note
          : "Lastfaktor der Phase – Gewicht bleibt gedeckelt",
      };
    }
    if (!reacting && res.weight < ramp.weight - 1e-9) {
      return {
        weight: ramp.weight,
        targetReps: res.targetReps,
        decision: "increase",
        note: "Lastfaktor der Phase – Gewicht auf die Phasenlast angehoben",
      };
    }
    return res;
  };

  if (reentry) {
    // Wiedereinstieg: nur erhoehen bei Score <= 3 und Technik ok; abrunden.
    const wsR = workSets(lastEntry);
    const okScore = wsR.length ? avg(wsR.map((s) => s.score || 3)) <= 3 : true;
    const techOk = !wsR.some((s) => s.painFlag);
    if (wsR.length && okScore && techOk) {
      return withRamp({
        weight: ld(W + step, true),
        targetReps: range[0],
        decision: "increase",
        note: "Wiedereinstieg: vorsichtig +Schritt, abgerundet",
      });
    }
    // Gehalten wird hier wegen zu hoher Anstrengung oder Schmerz (ohne Vordaten
    // dagegen nur mangels Grundlage): im ersten Fall darf eine Rampe nicht
    // hochziehen, sondern nur deckeln.
    return withRamp(
      {
        weight: ld(W, true),
        targetReps: range[0],
        decision: "hold",
        note: "Wiedereinstieg: Gewicht halten",
      },
      wsR.length > 0,
    );
  }

  const ws = workSets(lastEntry);
  if (!ws.length) {
    return withRamp({
      weight: ld(W, false),
      targetReps: range[1],
      decision: "hold",
      note: "keine Vordaten – Startgewicht halten",
    });
  }

  const allMet = ws.every((s) => metTarget(s) === true);
  const anyFailed = ws.some((s) => s.failed);
  // Ziel-Bewertung mit Toleranz (metAllWithTolerance): mindestens ein
  // Arbeitssatz muss sein Ziel voll erfuellt haben, die uebrigen duerfen bis zu
  // `tol` Wiederholungen darunter liegen. Gewicht und Versagen bleiben strikt –
  // toleriert wird ausschliesslich der Wiederholungsabfall.
  const tol = repTolerance(ws.length, range);
  const allMetTol = metAllWithTolerance(ws, range);
  const anyReduced = ws.some(
    (s) => s.targetWeight != null && s.weight < s.targetWeight - 1e-9,
  );
  const avgScore = avg(ws.map((s) => s.score || tScore));
  const minReps = Math.min(...ws.map((s) => s.reps || 0));
  // Wiederholungsziele bleiben immer innerhalb des gueltigen Bandes.
  const clampReps = (n: number): number =>
    Math.min(range[1], Math.max(range[0], n));

  // Rueckwaertsregel (ADR-0015): das Ziel wurde jetzt UND in der Einheit davor
  // am selben Gewicht verfehlt -> ein Schritt zurueck, statt das Bandende
  // nochmal vorzugeben. Der Rueckschritt ist Teil des Plans, kein Rueckfall:
  // vom leichteren Gewicht aus arbeitet die Doppelprogression sauber wieder
  // hoch. `reacting` = true, damit eine Lastfaktor-Rampe nur deckelt und den
  // Vorschlag nicht wieder hochzieht.
  const repeatedMiss =
    !allMetTol && missedBefore(o.prevEntry, range, topWorkWeight(ws));
  const backOff = (): SuggestResult =>
    withRamp(
      {
        weight: ld(W - step, true),
        targetReps: range[1],
        decision: "decrease",
        note: "zweimal am Ziel vorbei – ein Schritt zurueck",
      },
      true,
    );

  // ueber Ziel-Score / Versagen / Last-Reduktion -> halten oder senken
  if (anyFailed || anyReduced || avgScore > tScore + 0.5) {
    if (avgScore >= 4.5 || anyReduced) {
      return withRamp(
        {
          weight: ld(W - step, true),
          targetReps: range[1],
          decision: "decrease",
          note: "Versagen/Reduktion oder zu hart – Gewicht senken",
        },
        true,
      );
    }
    // Gehalten wird hier, weil es zu hart war. War das Ziel dabei erfuellt,
    // bleiben auch die Wiederholungen stehen (gleiche Regel wie unten im
    // Auffangzweig); verfehlt heisst: das Bandende nochmal versuchen – ausser
    // es war schon der zweite Fehlversuch am selben Gewicht.
    if (repeatedMiss) return backOff();
    return withRamp(
      {
        weight: ld(W, false),
        targetReps: allMet ? clampReps(minReps) : range[1],
        decision: "hold",
        note: allMet
          ? "hart – Gewicht und Wiederholungen halten"
          : "hart/verfehlt – Gewicht halten",
      },
      true,
    );
  }

  // Ziel erfuellt und hoechstens so anstrengend wie vorgesehen -> doppelte
  // Progression. Die Zielanstrengung selbst (Score = Zielscore) zaehlt als
  // erfuellt, nicht als Grenzfall: genau so soll trainiert werden, also folgt
  // der naechste Schritt. Frueher fiel dieser Fall in den Auffangzweig unten
  // und bekam dessen Wiederholungsziel (oberes Bandende) - der saubere Satz
  // sprang damit weiter als der zu leichte.
  if (allMetTol && avgScore <= tScore) {
    // Bandende gilt als erreicht, wenn mindestens ein Arbeitssatz oben war und
    // kein Satz mehr als `tol` darunter liegt. Die Bedingung "mindestens einer
    // oben" verhindert, dass eine Serie, die das Bandende nie beruehrt hat,
    // ueber die Toleranz zur Gewichtssteigerung wird.
    const topReached = ws.some((s) => (s.reps || 0) >= range[1]);
    if (topReached && minReps >= range[1] - tol) {
      // oberes Repband erreicht -> Gewicht hoch, Reps zurueck auf Minimum.
      // Die Zielanstrengung reicht dafuer aus; die Trainingslehre verlangt an
      // dieser Stelle keine Zusatzbedingung "war leichter als vorgesehen"
      // (siehe docs/adr/0015-coach-progressionsregeln.md).
      return withRamp(
        {
          weight: ld(W + step, false),
          targetReps: range[0],
          decision: "increase",
          note:
            minReps >= range[1]
              ? "Repband oben erreicht – Gewicht +Schritt, Reps zuruecksetzen"
              : "Repband oben erreicht, spaete Saetze abgefallen – Gewicht +Schritt",
        },
        false,
        range[1],
      );
    }
    // sonst zuerst Wiederholungen steigern, ausgehend vom schwaechsten Satz:
    // ein starker erster Satz soll das Ziel nicht hochziehen, wenn die
    // spaeteren Saetze schon abgefallen sind.
    return withRamp({
      weight: ld(W, false),
      targetReps: clampReps(minReps + 1),
      decision: "increase-reps",
      note: "leichter als Ziel – Wiederholungen steigern (Gewicht gleich)",
    });
  }

  // Rest: zu hart trotz erfuelltem Ziel, oder Ziel nicht erfuellt.
  // Erfuellt (aber hart) -> Wiederholungen bleiben stehen, bis es leichter
  // wird. Verfehlt -> das obere Bandende bleibt das Ziel, also nochmal
  // versuchen; beim zweiten Fehlversuch am selben Gewicht greift stattdessen
  // die Rueckwaertsregel.
  if (repeatedMiss) return backOff();
  return withRamp({
    weight: ld(W, false),
    targetReps: allMet ? clampReps(minReps) : range[1],
    decision: "hold",
    note: allMet
      ? "im Ziel, aber hart – Gewicht und Wiederholungen halten"
      : "im Ziel – Gewicht halten, Repband ausreizen",
  });
}
