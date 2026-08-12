import { describe, it, expect } from "vitest";
import { katalogPatch } from "@/lib/katalogPatch";

// Die Regel gilt fuer beide Wege (Einheit beenden und nachtraeglich
// bearbeiten), darum wird sie hier einmal geprueft statt zweimal.

describe("katalogPatch", () => {
  it("setzt das Arbeitsgewicht, laesst das 1RM ohne Tracking unberuehrt", () => {
    const p = katalogPatch({
      exerciseId: "ex1",
      workWeight: 60,
      tracksRm: false,
      currentRm: null,
      record1RM: 120,
      est1RM: 118,
      date: "2026-08-12",
    });

    expect(p).toEqual({ id: "ex1", work_weight: 60 });
  });

  it("hebt das 1RM an, wenn der Rekord geschlagen ist", () => {
    const p = katalogPatch({
      exerciseId: "ex1",
      workWeight: 100,
      tracksRm: true,
      currentRm: 120,
      record1RM: 130,
      est1RM: 125,
      date: "2026-08-12",
    });

    expect(p).toEqual({
      id: "ex1",
      work_weight: 100,
      rm: 130,
      rm_as_of: "2026-08-12",
      rm_stale: false,
    });
  });

  it("laesst das 1RM stehen, wenn der Rekord nicht geschlagen ist", () => {
    const p = katalogPatch({
      exerciseId: "ex1",
      workWeight: 100,
      tracksRm: true,
      currentRm: 140,
      record1RM: 130,
      est1RM: 135,
      date: "2026-08-12",
    });

    expect(p).toEqual({ id: "ex1", work_weight: 100 });
  });

  it("uebernimmt beim ersten Mal den Rekord, sonst die Schaetzung", () => {
    const mitRekord = katalogPatch({
      exerciseId: "ex1",
      workWeight: 80,
      tracksRm: true,
      currentRm: null,
      record1RM: 110,
      est1RM: 105,
      date: "2026-08-12",
    });
    expect(mitRekord.rm).toBe(110);

    const ohneRekord = katalogPatch({
      exerciseId: "ex1",
      workWeight: 80,
      tracksRm: true,
      currentRm: null,
      record1RM: null,
      est1RM: 105,
      date: "2026-08-12",
    });
    expect(ohneRekord.rm).toBe(105);
    expect(ohneRekord.rm_as_of).toBe("2026-08-12");
  });
});
