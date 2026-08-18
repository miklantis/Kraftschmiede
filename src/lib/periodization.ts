import { volumeForWeek } from "@/engine";
import { intensityForWeek, plansLoad } from "@/engine/intensity";
import type { JourneyPhaseInput } from "@/lib/journey";
import { intensityRange, isNeutralLoad, loadPercent } from "@/lib/loadFactor";

// Reine Aufbereitung der Daten fuer die Periodisierungskurve, 1:1 aus V1
// (charts.js drawJourneyChart, Datenteil). Kein DOM-/D3-Bezug: hier entstehen nur
// die Zahlenreihen, die der Chart-Baustein spaeter zeichnet. Dadurch testbar.
//
// Pro Journey-Woche zwei Werte: Volumen (Satzzahl aus der Engine, mit Satz-Rampe
// und Deload-Einbruch) und Intensitaet (aus der Wiederholungsspanne der Phase
// abgeleitet: wenige Wiederholungen = hohe Intensitaet). Dazu die Phasen als
// Baender ueber ihre Wochenspanne und die aktuelle Gesamtwoche als "jetzt"-Index.

// Eine Woche auf der Zeitachse. g = 0-basierte Gesamtwoche der Journey.
export interface PeriodWeek {
  g: number;
  vol: number;
  intens: number;
  deload: boolean;
}

// Eine Phase als Band ueber ihre Wochenspanne (start/end 0-basiert, inklusive).
export interface PeriodBand {
  name: string;
  start: number;
  end: number;
  /** "65 %" bei vorgegebener Last, sonst null (Beschriftung unter der Achse). */
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

// Intensitaets-Score einer Phase aus der Wiederholungsspanne. Fehlt die Spanne,
// gilt ein Mittel von 8 Wiederholungen (wie V1). Gibt die Phase die Last vor
// (Lastfaktor < 1), zaehlt sie entsprechend weniger intensiv – sonst zeigte die
// Kurve einer Wiederaufbau-Journey vier gleich intensive Wochen, obwohl in
// Woche 1 nur 65 % des alten Gewichts auf der Stange liegen.
//
// Plant die Phase ihre Last selbst (Lastrampe), zaehlt stattdessen die geplante
// Wochen-Intensitaet - siehe intensityWeekScore. Erst dadurch wird die
// Intensitaetslinie innerhalb einer Phase wellenfoermig statt flach.
function intensityScore(
  min: number | null,
  max: number | null,
  loadFactor: number,
): number {
  const mid = min != null && max != null ? (min + max) / 2 : 8;
  const load = loadFactor > 0 ? loadFactor : 1;
  return load / Math.max(1, mid);
}

// Intensitaets-Score einer einzelnen Woche einer lastgesteuerten Phase. Die
// geplante Last (Prozent des 1RM) wird auf denselben Massstab gebracht wie der
// Phasen-Score aus dem Wiederholungsband: der Startwert der Rampe entspricht dem
// Bandscore, alles darueber und darunter bewegt sich proportional. Sonst
// spraenge die Linie beim Wechsel zwischen geplanten und ungeplanten Phasen.
function intensityWeekScore(
  phase: {
    intensityStart?: number | null;
    intensityEnd?: number | null;
    weeks?: number | null;
    deloadWeek?: number | null;
  },
  weekIndex: number,
  bandScore: number,
): number {
  const start = phase.intensityStart;
  const woche = intensityForWeek(phase, weekIndex);
  if (woche == null || start == null || !(start > 0)) return bandScore;
  return bandScore * (woche / start);
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
    const iScore = intensityScore(p.repTargetMin, p.repTargetMax, p.loadFactor);
    const lastPhase = {
      intensityStart: p.intensityStart,
      intensityEnd: p.intensityEnd,
      weeks: p.weeks,
      deloadWeek: p.deloadWeek,
    };
    const plantLast = plansLoad(lastPhase);
    const rampe = intensityRange(p.intensityStart, p.intensityEnd);
    bands.push({
      name: p.name || `Phase ${pi + 1}`,
      start: gw,
      end: gw + pw - 1,
      loadLabel: !isNeutralLoad(p.loadFactor)
        ? loadPercent(p.loadFactor)
        : rampe,
    });
    for (let wi = 0; wi < pw; wi++) {
      const vol = volumeForWeek(
        {
          setsStart: p.setsStart,
          setsEnd: p.setsEnd,
          weeks: p.weeks,
          deloadWeek: p.deloadWeek,
        },
        wi,
        true,
      );
      // Plant die Phase die Last, zeichnet die geplante Wochen-Intensitaet die
      // Linie; sonst bleibt es beim Phasen-Score aus dem Wiederholungsband.
      const intens = plantLast
        ? intensityWeekScore(lastPhase, wi, iScore)
        : iScore;
      weeks.push({
        g: gw,
        vol,
        intens,
        deload: !!(p.deloadWeek && wi === p.deloadWeek - 1),
      });
      vMin = Math.min(vMin, vol);
      vMax = Math.max(vMax, vol);
      iMin = Math.min(iMin, iScore);
      iMax = Math.max(iMax, iScore);
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
