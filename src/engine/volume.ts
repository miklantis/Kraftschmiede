// Volumensteuerung und Deload. Die Satzzahl rampt ueber die Phasenwochen hoch;
// in der Deload-Woche sinkt sie, bei roten Erholungsmarkern bleibt sie konservativ.

import type { DeloadMarkers, VolumePhase } from "./types";

// Lineare Satz-Rampe von setsStart bis setsEnd ueber die Phasenwochen.
export function rampSets(s0: number, s1: number, weekIndex: number, weeks: number): number {
  if (weeks <= 1) return s1;
  const frac = Math.min(1, weekIndex / (weeks - 1));
  return Math.round(s0 + (s1 - s0) * frac);
}

// Satzzahl fuer eine Woche. deloadWeek ist 1-basiert (Wochennummer der Phase),
// weekIndex ist 0-basiert (currentWeek - 1), daher Vergleich gegen deloadWeek - 1.
export function volumeForWeek(
  phase: VolumePhase,
  weekIndex: number,
  recoveryGreen: boolean,
): number {
  const s0 = phase.setsStart || 2;
  const s1 = phase.setsEnd || 4;
  const weeks = Math.max(1, phase.weeks || 4);
  if (phase.deloadWeek && weekIndex === phase.deloadWeek - 1) {
    const prev = rampSets(s0, s1, Math.max(0, weekIndex - 1), weeks);
    return Math.max(s0, Math.round(prev * 0.75)); // -25 %
  }
  let base = rampSets(s0, s1, weekIndex, weeks);
  if (!recoveryGreen) base = Math.max(s0, base - 1); // bei roten Markern nicht weiter rampen
  return base;
}

export interface DeloadResult {
  deload: boolean;
  tipping: number;
  why: string[];
}

// Deload empfohlen, sobald mindestens zwei Warnsignale zusammenkommen.
export function deloadCheck(markers: DeloadMarkers): DeloadResult {
  let tipping = 0;
  const why: string[] = [];
  if (markers.perfDropTwoSessions) {
    tipping++;
    why.push("Leistungsabfall/metTarget=false über 2 Einheiten");
  }
  if ((markers.soreness || 0) >= 2) {
    tipping++;
    why.push("Muskelkater ≥ 2");
  }
  if ((markers.readiness || 5) <= 2) {
    tipping++;
    why.push("niedrige Readiness");
  }
  return { deload: tipping >= 2, tipping, why };
}
