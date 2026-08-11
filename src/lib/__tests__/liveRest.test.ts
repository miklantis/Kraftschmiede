import { describe, expect, it } from "vitest";
import { adjustedRest, startedRest, type RestState } from "../liveRest";

const NOW = 1_700_000_000_000;

describe("startedRest", () => {
  it("gibt keine Pause bei 0 oder negativen Sekunden", () => {
    expect(startedRest("set", 0, NOW)).toBeNull();
    expect(startedRest("set", -30, NOW)).toBeNull();
  });

  it("merkt sich Endzeit, Typ und Ausgangswert", () => {
    const r = startedRest("exercise", 150, NOW);
    expect(r).toEqual({ type: "exercise", endsAt: NOW + 150_000, baseSec: 150 });
  });
});

describe("adjustedRest", () => {
  const rest: RestState = { type: "set", endsAt: NOW + 60_000, baseSec: 90 };

  it("verlaengert eine laufende Pause ab ihrer Endzeit", () => {
    expect(adjustedRest(rest, 30, NOW).endsAt).toBe(NOW + 90_000);
  });

  it("rechnet bei einer bereits abgelaufenen Pause ab jetzt", () => {
    const abgelaufen: RestState = { type: "set", endsAt: NOW - 20_000, baseSec: 90 };
    expect(adjustedRest(abgelaufen, 30, NOW).endsAt).toBe(NOW + 30_000);
  });

  it("klemmt beim Verkuerzen nicht unter jetzt", () => {
    expect(adjustedRest(rest, -300, NOW).endsAt).toBe(NOW);
  });

  it("laesst Typ und Ausgangswert unveraendert", () => {
    const r = adjustedRest(rest, 30, NOW);
    expect(r.type).toBe("set");
    expect(r.baseSec).toBe(90);
  });
});
