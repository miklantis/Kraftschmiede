import { describe, it, expect } from "vitest";
import { mehrLadenAnsicht, MEHR_LADEN_SEITE } from "@/hooks/useMehrLaden";

const liste = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

describe("mehrLadenAnsicht", () => {
  it("zeigt nur die erste Seite und meldet den Rest", () => {
    const { sichtbar, hatMehr } = mehrLadenAnsicht(liste(12), MEHR_LADEN_SEITE);
    expect(sichtbar).toEqual([0, 1, 2, 3, 4]);
    expect(hatMehr).toBe(true);
  });

  it("meldet keinen Rest, wenn alles sichtbar ist", () => {
    expect(mehrLadenAnsicht(liste(5), 5).hatMehr).toBe(false);
    expect(mehrLadenAnsicht(liste(3), 5).sichtbar).toEqual([0, 1, 2]);
    expect(mehrLadenAnsicht(liste(3), 5).hatMehr).toBe(false);
  });

  it("kommt mit leerer Liste klar", () => {
    expect(mehrLadenAnsicht([], 5)).toEqual({ sichtbar: [], hatMehr: false });
  });

  it("faengt negative Anzahlen ab", () => {
    expect(mehrLadenAnsicht(liste(4), -3)).toEqual({ sichtbar: [], hatMehr: true });
  });

  it("gibt beim Nachladen die naechste Seite frei", () => {
    const zweite = mehrLadenAnsicht(liste(12), MEHR_LADEN_SEITE * 2);
    expect(zweite.sichtbar).toHaveLength(10);
    expect(zweite.hatMehr).toBe(true);
    const dritte = mehrLadenAnsicht(liste(12), MEHR_LADEN_SEITE * 3);
    expect(dritte.sichtbar).toHaveLength(12);
    expect(dritte.hatMehr).toBe(false);
  });
});
