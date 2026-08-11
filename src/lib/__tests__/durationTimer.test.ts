import { describe, expect, it } from "vitest";
import { durTick, FLASH_MS, LEAD_SEC } from "../durationTimer";

const START = 1_700_000_000_000;
const LEAD_MS = LEAD_SEC * 1000;

/** Zeitpunkt `sec` Sekunden nach Ende der Vorbereitung. */
function at(sec: number): number {
  return START + LEAD_MS + sec * 1000;
}

describe("durTick – Vorbereitung", () => {
  it("startet bei LEAD_SEC und zaehlt herunter", () => {
    expect(durTick(START, START, 30).leadLeft).toBe(LEAD_SEC);
    expect(durTick(START, START + 2_000, 30).leadLeft).toBe(3);
    expect(durTick(START, START + 4_500, 30).leadLeft).toBe(1);
  });

  it("meldet die Phase und einen leerlaufenden Ring", () => {
    const t = durTick(START, START + 2_500, 30);
    expect(t.phase).toBe("lead");
    expect(t.frac).toBeCloseTo(0.5, 5);
    expect(t.elapsed).toBe(0);
    expect(t.reached).toBe(false);
  });

  it("geht mit Ablauf der Vorbereitung in die Zielzeit ueber", () => {
    const t = durTick(START, START + LEAD_MS, 30);
    expect(t.phase).toBe("run");
    expect(t.leadLeft).toBe(0);
    expect(t.elapsed).toBe(0);
    expect(t.frac).toBe(0);
  });

  it("behandelt eine Jetzt-Zeit vor dem Start wie den Start", () => {
    expect(durTick(START, START - 5_000, 30).leadLeft).toBe(LEAD_SEC);
  });
});

describe("durTick – Zielzeit", () => {
  it("fuellt den Ring synchron zur Zieldauer", () => {
    expect(durTick(START, at(7.5), 30).frac).toBeCloseTo(0.25, 5);
    expect(durTick(START, at(15), 30).frac).toBeCloseTo(0.5, 5);
    expect(durTick(START, at(29.9), 30).frac).toBeCloseTo(0.9966, 3);
  });

  it("zaehlt volle Sekunden als Ergebniswert", () => {
    expect(durTick(START, at(12.9), 30).elapsed).toBe(12);
    expect(durTick(START, at(13), 30).elapsed).toBe(13);
  });

  it("meldet vor dem Ziel weder Erreichen noch Runden", () => {
    const t = durTick(START, at(29.999), 30);
    expect(t.reached).toBe(false);
    expect(t.rounds).toBe(0);
    expect(t.mult).toBe(0);
    expect(t.flash).toBe(false);
  });
});

describe("durTick – Zielerreichung und Extra-Runden", () => {
  it("schaltet punktgenau auf erreicht um", () => {
    const t = durTick(START, at(30), 30);
    expect(t.phase).toBe("over");
    expect(t.reached).toBe(true);
    expect(t.rounds).toBe(1);
    expect(t.mult).toBe(0);
    expect(t.flash).toBe(true);
  });

  it("zeigt das Erfolgssignal nur im Flash-Fenster", () => {
    expect(durTick(START, at(30) + FLASH_MS - 1, 30).flash).toBe(true);
    expect(durTick(START, at(30) + FLASH_MS, 30).flash).toBe(false);
  });

  it("fuellt den Ring in der Extra-Phase erneut", () => {
    expect(durTick(START, at(45), 30).frac).toBeCloseTo(0.5, 5);
    expect(durTick(START, at(75), 30).frac).toBeCloseTo(0.5, 5);
  });

  it("erhoeht den Multiplikator je weiterer voller Zielzeit", () => {
    expect(durTick(START, at(59), 30).mult).toBe(0);
    expect(durTick(START, at(60), 30).mult).toBe(1);
    expect(durTick(START, at(90), 30).mult).toBe(2);
    expect(durTick(START, at(120), 30).mult).toBe(3);
  });

  it("zaehlt in der Extra-Phase die Gesamtsekunden weiter", () => {
    expect(durTick(START, at(95), 30).elapsed).toBe(95);
  });
});

describe("durTick – ohne Zielzeit", () => {
  it("laeuft als reine Stoppuhr ohne Ring, Runden und Signal", () => {
    const t = durTick(START, at(42), 0);
    expect(t.phase).toBe("run");
    expect(t.elapsed).toBe(42);
    expect(t.frac).toBe(0);
    expect(t.rounds).toBe(0);
    expect(t.mult).toBe(0);
    expect(t.reached).toBe(false);
    expect(t.flash).toBe(false);
  });
});
