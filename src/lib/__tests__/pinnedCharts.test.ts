import { describe, expect, it } from "vitest";
import {
  hasPin,
  pinIndex,
  togglePin,
  parsePins,
  serializePins,
  type PinnedChart,
} from "@/lib/pinnedCharts";

const A: PinnedChart = { exerciseId: "ex1", metric: "rm" };
const B: PinnedChart = { exerciseId: "ex1", metric: "volume" };
const C: PinnedChart = { exerciseId: "ex2", metric: "rm" };

describe("pinnedCharts", () => {
  it("findet vorhandene Pins genau nach Uebung+Metrik", () => {
    const pins = [A, B];
    expect(hasPin(pins, "ex1", "rm")).toBe(true);
    expect(hasPin(pins, "ex1", "volume")).toBe(true);
    expect(hasPin(pins, "ex1", "weight")).toBe(false);
    expect(hasPin(pins, "ex2", "rm")).toBe(false);
    expect(pinIndex(pins, "ex1", "volume")).toBe(1);
    expect(pinIndex(pins, "nope", "rm")).toBe(-1);
  });

  it("dieselbe Uebung kann mit verschiedenen Metriken angeheftet sein", () => {
    let pins: PinnedChart[] = [];
    pins = togglePin(pins, "ex1", "rm");
    pins = togglePin(pins, "ex1", "volume");
    expect(pins).toHaveLength(2);
    expect(hasPin(pins, "ex1", "rm")).toBe(true);
    expect(hasPin(pins, "ex1", "volume")).toBe(true);
  });

  it("Umschalten fuegt am Ende an und entfernt wieder; Eingang bleibt unberuehrt", () => {
    const start = [A];
    const added = togglePin(start, "ex2", "rm");
    expect(added).toEqual([A, C]);
    expect(start).toEqual([A]); // rein, kein Mutieren
    const removed = togglePin(added, "ex1", "rm");
    expect(removed).toEqual([C]);
  });

  it("haelt die Reihenfolge der Anheftung", () => {
    let pins: PinnedChart[] = [];
    pins = togglePin(pins, "ex2", "rm");
    pins = togglePin(pins, "ex1", "rm");
    expect(pins.map((p) => p.exerciseId)).toEqual(["ex2", "ex1"]);
  });

  it("parst gespeicherten Text und verwirft defekte Eintraege", () => {
    expect(parsePins(null)).toEqual([]);
    expect(parsePins("kein json")).toEqual([]);
    expect(parsePins("{}")).toEqual([]);
    const raw = JSON.stringify([
      A,
      { exerciseId: "ex3", metric: "bogus" }, // unbekannte Metrik -> raus
      { metric: "rm" }, // ohne exerciseId -> raus
      C,
    ]);
    expect(parsePins(raw)).toEqual([A, C]);
  });

  it("serialisieren und wieder einlesen ist verlustfrei", () => {
    const pins = [A, B, C];
    expect(parsePins(serializePins(pins))).toEqual(pins);
  });
});
