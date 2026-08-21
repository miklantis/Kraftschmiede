// Score-Skala 1..5 und ihre Zuordnung zu RIR (Reps in Reserve) und RPE.
// Score 1 ~ RIR 4+ ~ RPE <=6 ... Score 5 ~ RIR 0 ~ RPE 10 (Versagen).

export interface ScoreInfo {
  rir: string;
  rpe: string;
  label: string;
}

export const SCORE_MAP: Record<number, ScoreInfo> = {
  1: { rir: "4+", rpe: "≤6", label: "sehr leicht" },
  2: { rir: "3", rpe: "7", label: "leicht" },
  3: { rir: "2", rpe: "8", label: "im Ziel" },
  4: { rir: "1", rpe: "9", label: "im Ziel (hart)" },
  5: { rir: "0", rpe: "10", label: "Versagen" },
};

export function scoreInfo(s: number): ScoreInfo | null {
  return SCORE_MAP[s] ?? null;
}

/** Ziel-Anstrengung ueberall dort, wo kein Wochenplan sie vorgibt: Score 3
 *  (RIR 2). Fruehere Stellschraube war exercises.target_score - ein Einzelwert
 *  pro Uebung ohne Wochenbezug, der in genau den Phasen wirkungslos war, in
 *  denen am meisten hingeschaut wird. Die Ziel-Anstrengung gehoert ins System:
 *  pro Woche an der Phase (phases.week_plan), sonst hier (Issue #298). */
export const DEFAULT_TARGET_SCORE = 3;

/** Score der Skala zu einer Ziel-Anstrengung in RIR: RIR 2 -> Score 3,
 *  RIR 1 -> Score 4. Der Wochenplan denkt in RIR, Saetze tragen den Score -
 *  hier steht die Umrechnung, damit sie nicht an mehreren Stellen liegt. */
export function scoreForRir(rir: number): number {
  return Math.min(5, Math.max(1, 5 - Math.round(rir)));
}
