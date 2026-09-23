import { describe, it, expect } from "vitest";
import {
  messgeraetNameVergeben,
  messgeraetNamen,
  messungenJeGeraet,
  messungenText,
  vorauswahlMessgeraet,
} from "../messgeraete";
import type { CompositionRow, MeasurementDeviceRow } from "@/schemas";

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

function messung(
  date: string,
  device_id: string | null,
): CompositionRow {
  return {
    id: date,
    user_id: "u1",
    date,
    weight: 80,
    body_fat_kg: null,
    body_fat_pct: null,
    skeletal_muscle_kg: null,
    muscle_mass_kg: null,
    tbw_kg: null,
    phase_angle: null,
    visceral_fat: null,
    ecw_kg: null,
    icw_kg: null,
    bmr_kcal: null,
    device_id,
  };
}

describe("vorauswahlMessgeraet", () => {
  it("nimmt das Geraet der juengsten Messung, unabhaengig von der Reihenfolge", () => {
    const rows = [
      messung("2026-09-01", "d1"),
      messung("2026-09-20", "d2"),
      messung("2026-09-10", "d1"),
    ];
    expect(vorauswahlMessgeraet(rows, GERAETE)).toBe("d2");
  });

  it("bleibt leer, wenn die juengste Messung kein Geraet hat", () => {
    const rows = [messung("2026-09-01", "d1"), messung("2026-09-20", null)];
    expect(vorauswahlMessgeraet(rows, GERAETE)).toBeNull();
  });

  it("bleibt leer ohne Messungen oder bei unbekanntem Geraet", () => {
    expect(vorauswahlMessgeraet([], GERAETE)).toBeNull();
    expect(
      vorauswahlMessgeraet([messung("2026-09-20", "weg")], GERAETE),
    ).toBeNull();
  });
});

describe("messungenJeGeraet / messgeraetNamen / messungenText", () => {
  it("zaehlt Messungen je Geraet und ignoriert Messungen ohne Geraet", () => {
    const anzahl = messungenJeGeraet([
      messung("2026-09-01", "d1"),
      messung("2026-09-02", "d1"),
      messung("2026-09-03", null),
      messung("2026-09-04", "d2"),
    ]);
    expect(anzahl.get("d1")).toBe(2);
    expect(anzahl.get("d2")).toBe(1);
    expect(anzahl.size).toBe(2);
  });

  it("liefert den Namen je Kennung", () => {
    expect(messgeraetNamen(GERAETE).get("d2")).toBe("Tanita BC-601");
  });

  it("formuliert die Anzahl", () => {
    expect(messungenText(0)).toBe("Noch keine Messung");
    expect(messungenText(1)).toBe("1 Messung");
    expect(messungenText(4)).toBe("4 Messungen");
  });
});
