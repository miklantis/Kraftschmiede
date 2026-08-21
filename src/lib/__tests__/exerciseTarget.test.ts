// Die geltende Vorgabe im Popup "Uebung anpassen" (Issue #297): Regiert der
// Wochenplan die Uebung, steht dort die Wochenzeile – sonst das Phasenband, und
// wo nichts vorgegeben ist, bleibt das Repband bedienbar.

import { describe, expect, it } from "vitest";
import { lockedTarget } from "../exerciseTarget";
import { buildStrengthWeekPlan } from "@/engine";

const PLAN = buildStrengthWeekPlan(5); // 5,5,4,3,2 – RIR 2, letzte zwei RIR 1
const WEEK4 = PLAN[3]!; // 4. Woche: 4 x 3, RIR 1

const HAUPT = { profile: "strength", tier: "main" };
const ZUSATZ = { profile: "strength", tier: "accessory" };
const CORE = { profile: "core", tier: "accessory" };

describe("lockedTarget", () => {
  it("zeigt bei einer Hauptuebung die Wochenzeile des Plans", () => {
    const t = lockedTarget(HAUPT, {
      planWeek: WEEK4,
      repBand: [4, 6],
      targetScore: 3,
    });
    expect(t).not.toBeNull();
    expect(t!.planGoverned).toBe(true);
    expect(t!.label).toBe("Vorgabe dieser Woche");
    expect(t!.value).toBe(`${WEEK4.sets} × ${WEEK4.reps} · RIR ${WEEK4.rir}`);
    // Und gerade nicht das Phasenband, das der Coach dort nicht benutzt.
    expect(t!.value).not.toContain("4–6");
  });

  it("zeigt bei einer Zusatzuebung das Band der Phase samt Ziel-Anstrengung", () => {
    const t = lockedTarget(ZUSATZ, {
      planWeek: WEEK4,
      repBand: [4, 6],
      targetScore: 3,
    });
    expect(t).not.toBeNull();
    expect(t!.planGoverned).toBe(false);
    expect(t!.label).toBe("Repband");
    expect(t!.value).toBe("4–6 Wdh · RIR 2");
  });

  it("zeigt ohne Wochenplan das Band der Phase", () => {
    const t = lockedTarget(HAUPT, {
      planWeek: null,
      repBand: [8, 12],
      targetScore: 3,
    });
    expect(t!.planGoverned).toBe(false);
    expect(t!.value).toBe("8–12 Wdh · RIR 2");
  });

  it("gibt null ohne Vorgabe der Phase", () => {
    expect(
      lockedTarget(HAUPT, { planWeek: null, repBand: null, targetScore: 3 }),
    ).toBeNull();
  });

  it("laesst Core-/Koerpergewichtsuebungen unberuehrt", () => {
    expect(
      lockedTarget(CORE, { planWeek: WEEK4, repBand: [4, 6], targetScore: 3 }),
    ).toBeNull();
    expect(
      lockedTarget({ profile: "bodyweight", tier: "accessory" }, {
        planWeek: WEEK4,
        repBand: [4, 6],
        targetScore: 3,
      }),
    ).toBeNull();
  });
});
