import { describe, it, expect } from "vitest";
import {
  stangeErfuelltVoraussetzung,
  zugelasseneStangen,
  type StangenBauart,
} from "@/lib/stangen";

// Der Bestand nach Vorhaben #433: zwei lange gerade Stangen und die kurze,
// gekruemmte SZ-Stange.
const STANDARD = { name: "Standard", barLength: "long", barShape: "straight" } as const;
const LEICHT = { name: "Leicht", barLength: "long", barShape: "straight" } as const;
const SZ = { name: "SZ", barLength: "short", barShape: "curved" } as const;
const BESTAND: (StangenBauart & { name: string })[] = [STANDARD, LEICHT, SZ];

const namen = (bars: { name: string }[]): string[] => bars.map((b) => b.name);

describe("Zulassung der Stangen je Uebung", () => {
  it("laesst bei einer Uebung nur lange gerade Stangen durch", () => {
    const backSquat = {
      allowedBarLengths: ["long"],
      allowedBarShapes: ["straight"],
    } as const;
    expect(namen(zugelasseneStangen(BESTAND, backSquat))).toEqual([
      "Standard",
      "Leicht",
    ]);
  });

  it("laesst bei beiden Werten je Eigenschaft den ganzen Bestand durch", () => {
    const curl = {
      allowedBarLengths: ["long", "short"],
      allowedBarShapes: ["straight", "curved"],
    } as const;
    expect(namen(zugelasseneStangen(BESTAND, curl))).toEqual([
      "Standard",
      "Leicht",
      "SZ",
    ]);
  });

  // "Die Laenge ist egal, aber es muss eine gerade Stange sein": die
  // Eigenschaften stehen unabhaengig nebeneinander.
  it("schraenkt nur die Eigenschaft ein, bei der ein Wert fehlt", () => {
    const nurGerade = {
      allowedBarLengths: ["long", "short"],
      allowedBarShapes: ["straight"],
    } as const;
    expect(namen(zugelasseneStangen(BESTAND, nurGerade))).toEqual([
      "Standard",
      "Leicht",
    ]);
  });

  it("verlangt, dass Laenge UND Form zutreffen", () => {
    // Kurz und gerade gibt es im Bestand nicht - obwohl beide Werte einzeln
    // bei je einer Stange vorkommen.
    const kurzUndGerade = {
      allowedBarLengths: ["short"],
      allowedBarShapes: ["straight"],
    } as const;
    expect(zugelasseneStangen(BESTAND, kurzUndGerade)).toEqual([]);
  });

  // Leere Liste heisst "keine Angabe", nicht "nichts ist erlaubt" - sonst
  // verloere eine Uebung ohne gepflegte Angabe still jede Stange.
  it("schraenkt bei leeren oder fehlenden Listen nicht ein", () => {
    expect(
      namen(zugelasseneStangen(BESTAND, { allowedBarLengths: [], allowedBarShapes: [] })),
    ).toEqual(["Standard", "Leicht", "SZ"]);
    expect(namen(zugelasseneStangen(BESTAND, {}))).toEqual([
      "Standard",
      "Leicht",
      "SZ",
    ]);
  });

  it("faellt nicht auf den Gesamtbestand zurueck, wenn nichts passt", () => {
    const nichts = {
      allowedBarLengths: ["short"],
      allowedBarShapes: ["straight"],
    } as const;
    expect(zugelasseneStangen(BESTAND, nichts)).toHaveLength(0);
    expect(stangeErfuelltVoraussetzung(STANDARD, nichts)).toBe(false);
    expect(stangeErfuelltVoraussetzung(SZ, nichts)).toBe(false);
  });

  it("behaelt die Reihenfolge des Bestands bei", () => {
    const alle = {
      allowedBarLengths: ["short", "long"],
      allowedBarShapes: ["curved", "straight"],
    } as const;
    expect(namen(zugelasseneStangen(BESTAND, alle))).toEqual(namen(BESTAND));
  });
});
