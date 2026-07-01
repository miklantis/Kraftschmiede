// Suitability: bewertet, wie passend ein Workout-Template jetzt ist. Hoeherer
// Score = empfehlenswerter. Kater=3 in einer betroffenen Region schliesst aus.

import { round2 } from "./math";
import type { Exercise, SuitabilityCtx, SuitabilityTemplate } from "./types";

type Region = "legs" | "upper_body";

export interface SuitabilityResult {
  score: number;
  excluded: boolean;
  reasons: string[];
}

export interface SuitabilityOpts {
  exMap?: Record<string, Exercise>;
}

// Muskelgruppen auf grobe Regionen abbilden (Beine vs. Oberkoerper).
export function mapMusclesToRegions(mg: string[]): Region[] {
  const set: Partial<Record<Region, 1>> = {};
  mg.forEach((m) => {
    if (["legs", "quads", "hamstrings", "glutes", "calves"].indexOf(m) >= 0) {
      set.legs = 1;
    } else {
      set.upper_body = 1;
    }
  });
  return Object.keys(set) as Region[];
}

export function suitability(
  template: SuitabilityTemplate,
  ctx: SuitabilityCtx,
  opts?: SuitabilityOpts,
): SuitabilityResult {
  const o = opts ?? {};
  const exMap = o.exMap ?? {};
  const now = ctx.now || Date.now();
  const H = 3600 * 1000;
  let score = 0;
  let excluded = false;
  const reasons: string[] = [];

  const ids = (
    Array.isArray(template.items)
      ? template.items.map((it) => (typeof it === "string" ? it : it && it.exerciseId))
      : [template.lift1, template.lift2, template.core]
  ).filter(Boolean) as string[];

  // Recency: laengster Abstand seit letztem Einsatz der enthaltenen Lifts
  let recencyDays = 999;
  ids.forEach((id) => {
    const last = ctx.lastByExercise ? ctx.lastByExercise[id] : null;
    if (last != null) recencyDays = Math.min(recencyDays, (now - last) / (24 * H));
  });
  if (recencyDays === 999) {
    score += 3;
    reasons.push("nie trainiert (+3)");
  } else {
    const rc = Math.min(3, recencyDays);
    score += rc;
    reasons.push("Recency +" + round2(rc));
  }

  // Erholung: zu kurz her seit dem letzten Einsatz -> Abzug
  ids.forEach((id) => {
    const ex = exMap[id];
    if (!ex) return;
    const last = ctx.lastByExercise ? ctx.lastByExercise[id] : null;
    if (last == null) return;
    const hrs = (now - last) / H;
    let win = ex.recoveryHours || 48;
    if (/deadlift/i.test(ex.id) || /deadlift/i.test(ex.name ?? "")) win = 72;
    if (hrs < win) {
      score -= 2;
      reasons.push((ex.name || id) + " unausgeruht (-2)");
    }
  });

  // Muskelkater nach Region: >=2 Abzug, =3 Ausschluss
  const sore = ctx.soreness ?? {};
  ids.forEach((id) => {
    const ex = exMap[id];
    if (!ex) return;
    const regions = mapMusclesToRegions(ex.muscleGroups ?? []);
    regions.forEach((reg) => {
      const v = sore[reg] ?? 0;
      if (v >= 3) {
        excluded = true;
        reasons.push(reg + " Kater=3 (Ausschluss)");
      } else if (v >= 2) {
        score -= 2;
        reasons.push(reg + " Kater=2 (-2)");
      }
    });
  });

  // Wochenbalance: selten trainierte Lifts bevorzugen
  const wc = ctx.weekCounts ?? {};
  ids.forEach((id) => {
    const n = wc[id] ?? 0;
    const b = Math.max(0, 1.5 - n); // 0x -> +1.5, 1x -> +0.5, 2x -> 0
    score += b;
  });
  reasons.push("Wochenbalance berücksichtigt");

  // Phasen-Fit: in Kraftphasen (strength/power/test) zaehlt jeder schwere
  // Hauptlift extra; uebrige Phasen bleiben mit +0.5 neutral.
  if (ctx.phase && ctx.phase.focus) {
    const pf = ctx.phase.focus;
    if (pf === "strength" || pf === "power" || pf === "test") {
      let mains = 0;
      ids.forEach((id) => {
        const exo = exMap[id];
        if (exo && exo.tier === "main" && exo.profile === "strength") mains++;
      });
      const pb = round2(mains * 0.6);
      score += pb;
      reasons.push("Kraftphase: " + mains + " Hauptlift(s) +" + pb);
    } else {
      score += 0.5;
      reasons.push("Phasen-Fit +0.5");
    }
  }

  return { score: round2(score), excluded, reasons };
}
