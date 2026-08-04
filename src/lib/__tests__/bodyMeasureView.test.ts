import { describe, it, expect } from "vitest";
import {
  parseBodyView,
  serializeBodyView,
  withGoals,
  withMetric,
  DEFAULT_BODY_VIEW,
} from "@/lib/bodyMeasureView";

describe("bodyMeasureView", () => {
  it("liefert den Standard bei null oder kaputtem JSON", () => {
    expect(parseBodyView(null)).toEqual(DEFAULT_BODY_VIEW);
    expect(parseBodyView("{ kaputt")).toEqual(DEFAULT_BODY_VIEW);
    expect(parseBodyView("42")).toEqual(DEFAULT_BODY_VIEW);
  });

  it("liest eine gueltige Ansicht", () => {
    const v = parseBodyView(JSON.stringify({ metric: "fat", goals: true }));
    expect(v).toEqual({ metric: "fat", goals: true });
  });

  it("faellt bei unbekannter Metrik oder falschem Typ auf den Standard zurueck", () => {
    expect(parseBodyView(JSON.stringify({ metric: "unsinn", goals: true }))).toEqual({
      metric: DEFAULT_BODY_VIEW.metric,
      goals: true,
    });
    expect(parseBodyView(JSON.stringify({ metric: "muscle", goals: "ja" }))).toEqual({
      metric: "muscle",
      goals: false,
    });
  });

  it("serialisiert und liest verlustfrei zurueck (Round-Trip)", () => {
    const v = { metric: "phase", goals: true } as const;
    expect(parseBodyView(serializeBodyView(v))).toEqual(v);
  });

  it("setzt Metrik und Ziele rein (ohne den Eingang zu mutieren)", () => {
    const base = { metric: "weight", goals: false } as const;
    const a = withMetric(base, "water");
    const b = withGoals(a, true);
    expect(a).toEqual({ metric: "water", goals: false });
    expect(b).toEqual({ metric: "water", goals: true });
    expect(base).toEqual({ metric: "weight", goals: false });
  });
});
