import { describe, it, expect } from "vitest";
import { messgeraetNameVergeben } from "../messgeraete";
import type { MeasurementDeviceRow } from "@/schemas";

function geraet(id: string, name: string): MeasurementDeviceRow {
  return {
    id,
    user_id: "u1",
    name,
    created_at: "2026-09-01T10:00:00+00:00",
  };
}

const GERAETE = [geraet("d1", "InBody 570"), geraet("d2", "Tanita BC-601")];

describe("messgeraetNameVergeben", () => {
  it("erkennt einen vergebenen Namen ohne Gross-/Kleinschreibung und Rand", () => {
    expect(messgeraetNameVergeben(" inbody 570 ", GERAETE, null)).toBe(true);
  });

  it("laesst einen neuen Namen durch", () => {
    expect(messgeraetNameVergeben("InBody 770", GERAETE, null)).toBe(false);
  });

  it("nimmt das eigene Geraet beim Umbenennen aus", () => {
    expect(messgeraetNameVergeben("INBODY 570", GERAETE, "d1")).toBe(false);
    expect(messgeraetNameVergeben("Tanita BC-601", GERAETE, "d1")).toBe(true);
  });

  it("gilt ein leerer Name nicht als vergeben", () => {
    expect(messgeraetNameVergeben("  ", GERAETE, null)).toBe(false);
  });
});
