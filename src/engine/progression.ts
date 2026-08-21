// Gewichtsvorschlag fuer die naechste Einheit (Doppelprogression).
// Erst Wiederholungen im Repband steigern, dann das Gewicht; bei Versagen oder
// zu hoher Anstrengung halten oder senken. Reentry = vorsichtiger Wiedereinstieg.
// Wird das Wiederholungsziel zweimal in Folge am selben Gewicht verfehlt, geht
// es einen Schritt zurueck (Rueckwaertsregel, ADR-0015).

import type { CoachReason, CoachReasonCode } from "./coachReason";
import { avg } from "./math";
import { nearestLoadable, nearestDumbbell } from "./plates";
import { DEFAULT_TARGET_SCORE } from "./score";
import { metTarget, workSets } from "./target";
import type { Bar, EngineSet, SetEntry } from "./types";

export interface SuggestExercise {
  workWeight?: number;
  repRange?: [number, number];
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
  /** Kennung samt Zahlen; den Satz baut lib/coachText.ts (Issue #268). */
  reason: CoachReason;
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
  // Ziel-Anstrengung ist systemweit fest (Issue #298); wo ein Wochenplan gilt,
  // rechnet der Coach ohnehin ueber planSuggestion und kommt hier nicht an.
  const tScore = DEFAULT_TARGET_SCORE;
  const W = ex.workWeight || bar.weight;
  const reentry = !!o.reentry;
  // Schrittweite aus den Einstellungen; unplausible Werte fallen auf 2,5 zurueck.
  const step = o.step != null && o.step > 0 ? o.step : 2.5;

  const ld = (x: number, down?: boolean): number =>
    o.dumbbells && o.dumbbells.length
      ? nearestDumbbell(x, o.dumbbells, !!down)
      : nearestLoadable(x, bar.weight, plates, !!down);

  // Ergebnis samt Kennung. Die Differenz zum heutigen Gewicht W entsteht immer
  // hier - so traegt jeder Vorschlag die tatsaechliche Differenz und nicht die
  // eingestellte Schrittweite: bei Kurzhanteln und krummen Scheiben weicht sie
  // ab. Den Satz dazu baut lib/coachText.ts (Issue #268).
  const result = (
    weight: number,
    targetReps: number,
    decision: SuggestDecision,
    code: CoachReasonCode,
    band?: number,
  ): SuggestResult => ({
    weight,
    targetReps,
    decision,
    reason: {
      code,
      diff: Math.round((weight - W) * 100) / 100,
      bandTop: band,
    },
  });

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
      return result(ramp.weight, res.targetReps, "increase", "ramp-restore");
    }
    if (res.weight > ramp.weight + 1e-9) {
      // Reagiert der Vorschlag gerade nach unten, deckelt die Rampe nur: die
      // Begruendung bleibt seine, nur die Differenz wird auf das gedeckelte
      // Gewicht neu gerechnet.
      return reacting
        ? result(
            ramp.weight,
            capReps ?? res.targetReps,
            res.decision,
            res.reason.code,
            res.reason.bandTop,
          )
        : result(ramp.weight, capReps ?? res.targetReps, "hold", "ramp-cap");
    }
    if (!reacting && res.weight < ramp.weight - 1e-9) {
      return result(ramp.weight, res.targetReps, "increase", "ramp-raise");
    }
    return res;
  };

  if (reentry) {
    // Wiedereinstieg: nur erhoehen bei Score <= 3 und Technik ok; abrunden.
    const wsR = workSets(lastEntry);
    const okScore = wsR.length ? avg(wsR.map((s) => s.score || 3)) <= 3 : true;
    const techOk = !wsR.some((s) => s.painFlag);
    if (wsR.length && okScore && techOk) {
      return withRamp(
        result(ld(W + step, true), range[0], "increase", "reentry-up"),
      );
    }
    // Gehalten wird hier wegen zu hoher Anstrengung oder Schmerz (ohne Vordaten
    // dagegen nur mangels Grundlage): im ersten Fall darf eine Rampe nicht
    // hochziehen, sondern nur deckeln.
    return withRamp(
      result(ld(W, true), range[0], "hold", "reentry-hold"),
      wsR.length > 0,
    );
  }

  const ws = workSets(lastEntry);
  if (!ws.length) {
    return withRamp(result(ld(W, false), range[1], "hold", "no-data"));
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
    withRamp(result(ld(W - step, true), range[1], "decrease", "back-off"), true);

  // ueber Ziel-Score / Versagen / Last-Reduktion -> halten oder senken
  if (anyFailed || anyReduced || avgScore > tScore + 0.5) {
    if (avgScore >= 4.5 || anyReduced) {
      return withRamp(
        result(ld(W - step, true), range[1], "decrease", "too-hard"),
        true,
      );
    }
    // Gehalten wird hier, weil es zu hart war. War das Ziel dabei erfuellt,
    // bleiben auch die Wiederholungen stehen (gleiche Regel wie unten im
    // Auffangzweig); verfehlt heisst: das Bandende nochmal versuchen – ausser
    // es war schon der zweite Fehlversuch am selben Gewicht.
    if (repeatedMiss) return backOff();
    return withRamp(
      result(
        ld(W, false),
        allMet ? clampReps(minReps) : range[1],
        "hold",
        allMet ? "hold-hard" : "hold-missed",
      ),
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
        result(
          ld(W + step, false),
          range[0],
          "increase",
          minReps >= range[1] ? "band-top" : "band-top-partial",
          range[1],
        ),
        false,
        range[1],
      );
    }
    // sonst zuerst Wiederholungen steigern, ausgehend vom schwaechsten Satz:
    // ein starker erster Satz soll das Ziel nicht hochziehen, wenn die
    // spaeteren Saetze schon abgefallen sind.
    return withRamp(
      result(
        ld(W, false),
        clampReps(minReps + 1),
        "increase-reps",
        "reps-up",
        range[1],
      ),
    );
  }

  // Rest: zu hart trotz erfuelltem Ziel, oder Ziel nicht erfuellt.
  // Streng erfuellt (aber hart) -> Wiederholungen bleiben stehen, bis es
  // leichter wird. Nur mit Ermuedungstoleranz erfuellt -> das obere Bandende
  // bleibt das Ziel, das Gewicht wartet darauf. Verfehlt -> dasselbe Gewicht
  // nochmal; beim zweiten Fehlversuch am selben Gewicht greift stattdessen die
  // Rueckwaertsregel.
  if (repeatedMiss) return backOff();
  const holdCode: CoachReasonCode = allMet
    ? "hold-hard"
    : allMetTol
      ? "hold-target"
      : "hold-missed";
  return withRamp(
    result(
      ld(W, false),
      allMet ? clampReps(minReps) : range[1],
      "hold",
      holdCode,
      holdCode === "hold-target" ? range[1] : undefined,
    ),
  );
}
