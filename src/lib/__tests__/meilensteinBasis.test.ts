import { describe, it, expect } from "vitest";
import { basisWerte, zielWert, anzeigeZiel } from "../meilensteinBasis";
import type { CompositionRow } from "@/schemas";

// Der Rechenkern der dynamischen Meilensteine: Basiswerte aus dem 30-Tage-
// Fenster und daraus der Zielwert. Geprueft wird vor allem, was passiert, wenn
// Messungen fehlen oder zu alt sind – dann darf kein Wert geraten werden.

function messung(
  date: string,
  weight: number | null,
  fettKg: number | null,
): CompositionRow {
  return {
    id: date,
    user_id: "u1",
    date,
    weight,
    body_fat_kg: fettKg,
    body_fat_pct: null,
    skeletal_muscle_kg: null,
    muscle_mass_kg: null,
    tbw_kg: null,
    phase_angle: null,
    visceral_fat: null,
    ecw_kg: null,
    icw_kg: null,
    bmr_kcal: null,
    device_id: null,
  };
}

const HEUTE = "2026-09-08";

describe("basisWerte", () => {
  it("mittelt Koerpergewicht und fettfreie Masse ueber das Fenster", () => {
    const werte = basisWerte(
      [
        messung("2026-09-06", 90, 18),
        messung("2026-08-25", 92, 20),
      ],
      HEUTE,
    );
    expect(werte.koerpergewicht).toBe(91);
    expect(werte.ffm).toBe(72); // (90-18 + 92-20) / 2
  });

  it("laesst Messungen ausserhalb der letzten 30 Tage weg", () => {
    const werte = basisWerte(
      [messung("2026-09-06", 90, 18), messung("2026-05-01", 100, 30)],
      HEUTE,
    );
    expect(werte.koerpergewicht).toBe(90);
    expect(werte.ffm).toBe(72);
  });

  it("zaehlt fuer die fettfreie Masse nur Zeilen mit beiden Werten", () => {
    const werte = basisWerte(
      [messung("2026-09-06", 90, 18), messung("2026-09-01", 94, null)],
      HEUTE,
    );
    expect(werte.koerpergewicht).toBe(92);
    expect(werte.ffm).toBe(72);
  });

  it("gibt null zurueck, wenn im Fenster nichts liegt", () => {
    expect(basisWerte([], HEUTE)).toEqual({ koerpergewicht: null, ffm: null });
    expect(basisWerte([messung("2026-01-01", 90, 18)], HEUTE)).toEqual({
      koerpergewicht: null,
      ffm: null,
    });
  });
});

describe("zielWert", () => {
  const werte = { koerpergewicht: 89.7, ffm: 72.4 };

  it("gibt bei festen Meilensteinen das gespeicherte Ziel zurueck", () => {
    expect(
      zielWert({ basis: "fix", target_rm: 100, faktor: null }, werte),
    ).toBe(100);
  });

  it("rechnet Faktor mal Koerpergewicht und rundet auf halbe Kilo", () => {
    expect(
      zielWert({ basis: "koerpergewicht", target_rm: null, faktor: 1 }, werte),
    ).toBe(89.5);
    expect(
      zielWert({ basis: "koerpergewicht", target_rm: null, faktor: 1.5 }, werte),
    ).toBe(134.5);
  });

  it("rechnet Faktor mal fettfreie Masse", () => {
    expect(
      zielWert({ basis: "ffm", target_rm: null, faktor: 1.25 }, werte),
    ).toBe(90.5);
  });

  it("hat ohne Basiswert kein Ziel", () => {
    expect(
      zielWert(
        { basis: "koerpergewicht", target_rm: null, faktor: 1 },
        { koerpergewicht: null, ffm: 72 },
      ),
    ).toBeNull();
  });
});

describe("anzeigeZiel", () => {
  const werte = { koerpergewicht: 95, ffm: 76 };

  it("haelt bei erreichten Meilensteinen den Wert von damals fest", () => {
    expect(
      anzeigeZiel(
        {
          basis: "koerpergewicht",
          target_rm: null,
          faktor: 1,
          achieved_at: "2026-07-01",
          achieved_target: 90,
        },
        werte,
      ),
    ).toBe(90);
  });

  it("rechnet weiter, solange nichts erreicht ist", () => {
    expect(
      anzeigeZiel(
        {
          basis: "koerpergewicht",
          target_rm: null,
          faktor: 1,
          achieved_at: null,
          achieved_target: null,
        },
        werte,
      ),
    ).toBe(95);
  });
});
