import {
  loadPlanForWeek,
  volumeForWeek,
  weekDemandsSession,
  weekPlanForWeek,
} from "@/engine";
import { loadPlanSpan, type LoadPlan, type WeekPlanWeek } from "@/engine";
import type { JourneyPhaseInput } from "@/lib/journey";
import { isNeutralLoad, loadSpanLabel } from "@/lib/loadFactor";

// Reine Aufbereitung der Daten fuer die Periodisierungskurve, 1:1 aus V1
// (charts.js drawJourneyChart, Datenteil). Kein DOM-/D3-Bezug: hier entstehen nur
// die Zahlenreihen, die der Chart-Baustein spaeter zeichnet. Dadurch testbar.
//
// Pro Journey-Woche zwei Werte: Volumen (Satzzahl aus der Engine, mit Satz-Rampe
// und Deload-Einbruch) und Intensitaet (aus der Wiederholungsspanne der Phase
// abgeleitet: wenige Wiederholungen = hohe Intensitaet). Dazu die Phasen als
// Baender ueber ihre Wochenspanne und die aktuelle Gesamtwoche als "jetzt"-Index.
//
// Traegt die Phase einen Wochenplan (Kraft, Schnellkraft, Test), kommen beide
// Werte wochengenau aus dem Plan statt aus den Eckwerten der Phase (Issue #225,
// Schritt 6): die Kraftphase steigt mit ihrer Wiederholungsleiter sichtbar an,
// die Entlastungswoche bricht ein und die Testwoche steht ohne Volumen auf
// hoechster Intensitaet. Phasen ohne Plan rechnen unveraendert weiter.
//
// Ebenso wochengenau kommt die vorgegebene Last aus der Lastliste der Phase
// (Konzept Bausteine, Abschnitt 10): ein Block, der von 65 auf 95 Prozent
// wandert, steigt in der Kurve an, statt drei gleich hohe Wochen zu zeigen.

// Eine Woche auf der Zeitachse. g = 0-basierte Gesamtwoche der Journey.
export interface PeriodWeek {
  g: number;
  vol: number;
  intens: number;
  deload: boolean;
  /** Reine Testwoche: Planzeile ohne Arbeitssaetze (nur der 1RM-Versuch). */
  test: boolean;
}

// Eine Phase als Band ueber ihre Wochenspanne (start/end 0-basiert, inklusive).
export interface PeriodBand {
  name: string;
  start: number;
  end: number;
  /** "65 → 95 %" bzw. "80 %" bei vorgegebener Last, sonst null (Beschriftung
   *  unter der Achse). Das Band steht fuer die ganze Phase, darum die Spanne. */
  loadLabel: string | null;
}

// Vollstaendiges Anzeige-Modell der Kurve. Wertebereiche (min/max) sind fuer die
// vertikale Skalierung der beiden Linien gedacht.
export interface PeriodizationData {
  weeks: PeriodWeek[];
  bands: PeriodBand[];
  curG: number; // 0-basierte aktuelle Gesamtwoche, auf [0, N-1] geklemmt
  vMin: number;
  vMax: number;
  iMin: number;
  iMax: number;
}

// Intensitaets-Score einer Woche ohne Plan, aus der Wiederholungsspanne der
// Phase. Fehlt die Spanne, gilt ein Mittel von 8 Wiederholungen (wie V1). Gibt
// die Lastliste fuer diese Woche weniger als volle Last vor, zaehlt die Woche
// entsprechend weniger intensiv – sonst zeigte die Kurve eines
// Wiederaufbau-Blocks drei gleich intensive Wochen, obwohl in Woche 1 nur 65 %
// des alten Gewichts auf der Stange liegen.
function intensityScore(
  min: number | null,
  max: number | null,
  weekLoad: number,
): number {
  const mid = min != null && max != null ? (min + max) / 2 : 8;
  const load = weekLoad > 0 ? weekLoad : 1;
  return load / Math.max(1, mid);
}

// Intensitaets-Score einer Planwoche: die Wiederholungen genau dieser Woche
// statt der Spanne der ganzen Phase, dazu der Anteil des Arbeitsgewichts aus dem
// Plan (Entlastung: 60 %) und die Lastvorgabe dieser Woche. Dadurch steigt die
// Linie innerhalb der Kraftphase mit der Wiederholungsleiter und faellt in der
// Entlastungswoche deutlich ab.
function planIntensityScore(week: WeekPlanWeek, phaseLoad: number): number {
  const mid =
    week.repsMax != null && week.repsMax !== week.reps
      ? (week.reps + week.repsMax) / 2
      : week.reps;
  const vorgabe = phaseLoad > 0 ? phaseLoad : 1;
  const planLoad = week.loadPct > 0 ? week.loadPct : 1;
  return (vorgabe * planLoad) / Math.max(1, mid);
}

// Beschriftung des Phasen-Bandes unter der Achse. Das Band steht fuer die ganze
// Phase, darum die Spanne. Eine durchgehend volle Last bleibt unbeschriftet: sie
// unterscheidet die Phase von nichts, und unter der Achse ist wenig Platz.
function bandLoadLabel(plan: LoadPlan | null): string | null {
  const span = loadPlanSpan(plan);
  if (span === null) return null;
  if (isNeutralLoad(span[0]) && isNeutralLoad(span[1])) return null;
  return loadSpanLabel(plan);
}

// Baut aus den Phasen einer aktiven Journey und der aktuellen Gesamtwoche
// (1-basiert, aus engine.journeyPlacement) das Kurven-Modell.
export function buildPeriodization(
  phases: JourneyPhaseInput[],
  globalWeek: number,
): PeriodizationData {
  const weeks: PeriodWeek[] = [];
  const bands: PeriodBand[] = [];
  let gw = 0;
  let vMin = Infinity;
  let vMax = -Infinity;
  let iMin = Infinity;
  let iMax = -Infinity;

  phases.forEach((p, pi) => {
    const pw = Math.max(1, p.weeks || 1);
    bands.push({
      name: p.name || `Phase ${pi + 1}`,
      start: gw,
      end: gw + pw - 1,
      loadLabel: bandLoadLabel(p.loadPlan),
    });
    for (let wi = 0; wi < pw; wi++) {
      // Wochenzeile des Plans (1-basiert); null = die Phase laeuft ohne Plan.
      const row = p.weekPlan ? weekPlanForWeek(p.weekPlan, wi + 1) : null;
      // Lastanteil genau dieser Woche; ohne Liste volles Niveau.
      const wochenLast = loadPlanForWeek(p.loadPlan, wi + 1) ?? 1;
      const vol = row
        ? row.sets
        : volumeForWeek(
            {
              setsStart: p.setsStart,
              setsEnd: p.setsEnd,
              weeks: p.weeks,
              deloadWeek: p.deloadWeek,
            },
            wi,
            true,
          );
      const intens = row
        ? planIntensityScore(row, wochenLast)
        : intensityScore(p.repTargetMin, p.repTargetMax, wochenLast);
      weeks.push({
        g: gw,
        vol,
        intens,
        // Im Plan macht der Anteil am Arbeitsgewicht die Entlastungswoche aus
        // (Testphase), sonst die gesetzte Deload-Woche der Phase.
        deload: row
          ? row.loadPct < 1
          : !!(p.deloadWeek && wi === p.deloadWeek - 1),
        // Reine Testwoche: der Plan verlangt keine Einheit. Nur so entsteht die
        // blaue Hinterlegung in der Kurve.
        test: row != null && !weekDemandsSession(row),
      });
      vMin = Math.min(vMin, vol);
      vMax = Math.max(vMax, vol);
      iMin = Math.min(iMin, intens);
      iMax = Math.max(iMax, intens);
      gw++;
    }
  });

  const N = weeks.length;
  const curG = N > 0 ? Math.max(0, Math.min(globalWeek - 1, N - 1)) : 0;

  // Bei leerer Journey neutrale Bereiche, damit nachgelagerte Rechnungen nicht
  // mit Infinity arbeiten. Die Kurve wird in diesem Fall ohnehin nicht gezeichnet.
  if (N === 0) {
    return { weeks, bands, curG, vMin: 0, vMax: 1, iMin: 0, iMax: 1 };
  }

  return { weeks, bands, curG, vMin, vMax, iMin, iMax };
}
