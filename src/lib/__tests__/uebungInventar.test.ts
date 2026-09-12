import { describe, it, expect } from "vitest";
import { uebungInventar, type InventarBestand } from "@/lib/uebungInventar";

// Bestand wie nach dem Seed: zwei lange gerade Stangen und die kurze,
// gekruemmte SZ-Stange, dazu Scheiben, Kettlebells, Kurzhanteln und Geraete.
const BESTAND: InventarBestand = {
  bars: [
    { id: "b1", name: "Standard", weight: 20, bar_length: "long", bar_shape: "straight" },
    { id: "b2", name: "Leicht", weight: 10, bar_length: "long", bar_shape: "straight" },
    { id: "b3", name: "SZ", weight: 6.5, bar_length: "short", bar_shape: "curved" },
  ],
  plates: [{ weight: 5 }, { weight: 1.25 }, { weight: 20 }],
  dumbbells: [{ weight: 12.5 }, { weight: 5 }],
  kettlebells: [{ weight: 16 }, { weight: 8 }],
  equipment: [
    { key: "band-medium", label: "Band mittel", active: true },
    { key: "band-light", label: "Band leicht", active: false },
    { key: "pullup-bar", label: "Klimmzugstange", active: true },
    { key: "rings", label: "Ringe", active: false },
  ],
};

const LEER: InventarBestand = {
  bars: [],
  plates: [],
  dumbbells: [],
  kettlebells: [],
  equipment: [],
};

const namen = (
  ansicht: ReturnType<typeof uebungInventar>,
): { name: string; bevorzugt: boolean }[] => {
  const inhalt = ansicht?.inhalt;
  if (inhalt?.art !== "stangen") throw new Error("kein Stangen-Abschnitt");
  return inhalt.stangen.map((s) => ({ name: s.name, bevorzugt: s.bevorzugt }));
};

describe("Inventar-Abschnitt der Uebungsseite", () => {
  it("zeigt bei der Langhantel nur die zugelassenen Stangen", () => {
    const backSquat = {
      equipment: "barbell",
      allowed_bar_lengths: ["long"],
      allowed_bar_shapes: ["straight"],
    } as const;
    expect(namen(uebungInventar(backSquat, BESTAND)).map((s) => s.name)).toEqual([
      "Standard",
      "Leicht",
    ]);
  });

  it("stellt die bevorzugte Stange nach vorn und markiert sie", () => {
    const curl = {
      equipment: "barbell",
      allowed_bar_lengths: [],
      allowed_bar_shapes: [],
      preferred_bar_length: "short",
      preferred_bar_shape: "curved",
    } as const;
    expect(namen(uebungInventar(curl, BESTAND))).toEqual([
      { name: "SZ", bevorzugt: true },
      { name: "Standard", bevorzugt: false },
      { name: "Leicht", bevorzugt: false },
    ]);
  });

  it("markiert ohne hinterlegte Bevorzugung keine Stange und behaelt die Reihenfolge des Bestands", () => {
    const ohne = {
      equipment: "barbell",
      allowed_bar_lengths: [],
      allowed_bar_shapes: [],
      preferred_bar_length: null,
      preferred_bar_shape: null,
    } as const;
    expect(namen(uebungInventar(ohne, BESTAND))).toEqual([
      { name: "Standard", bevorzugt: false },
      { name: "Leicht", bevorzugt: false },
      { name: "SZ", bevorzugt: false },
    ]);
  });

  it("sagt bei der Langhantel wortgleich mit der Einheit, wenn keine Stange passt", () => {
    const nurKurz = {
      equipment: "barbell",
      allowed_bar_lengths: ["short"],
      allowed_bar_shapes: ["straight"],
    } as const;
    const ansicht = uebungInventar(nurKurz, BESTAND);
    expect(ansicht?.leer).toBe(true);
    expect(ansicht?.leerText).toBe("Keine passende Stange im Bestand");
  });

  it("nennt die Scheiben zur Langhantel aufsteigend", () => {
    const ansicht = uebungInventar({ equipment: "barbell" }, BESTAND);
    const inhalt = ansicht?.inhalt;
    expect(inhalt?.art === "stangen" && inhalt.scheiben).toEqual([1.25, 5, 20]);
  });

  it("zeigt bei der Kurzhantel die vorhandenen Stufen aufsteigend", () => {
    const ansicht = uebungInventar({ equipment: "dumbbell" }, BESTAND);
    const inhalt = ansicht?.inhalt;
    expect(inhalt?.art === "kurzhanteln" && inhalt.gewichte).toEqual([5, 12.5]);
    expect(ansicht?.leer).toBe(false);
  });

  it("zeigt bei einer Scheiben-Uebung Scheiben und Kettlebells als Zusatzlast", () => {
    const ansicht = uebungInventar({ equipment: "plate" }, BESTAND);
    const inhalt = ansicht?.inhalt;
    if (inhalt?.art !== "zusatzlast") throw new Error("kein Zusatzlast-Abschnitt");
    expect(inhalt.scheiben).toEqual([1.25, 5, 20]);
    expect(inhalt.kettlebells).toEqual([8, 16]);
  });

  it("gilt bei einer Scheiben-Uebung erst als leer, wenn beides fehlt", () => {
    const nurKettlebell = { ...LEER, kettlebells: [{ weight: 16 }] };
    expect(uebungInventar({ equipment: "plate" }, nurKettlebell)?.leer).toBe(false);
    expect(uebungInventar({ equipment: "plate" }, LEER)?.leer).toBe(true);
  });

  it("zeigt bei einer Klimmzug-Uebung nur vorhandene Ausstattung", () => {
    const ansicht = uebungInventar({ equipment: "bar" }, BESTAND);
    const inhalt = ansicht?.inhalt;
    expect(inhalt?.art === "ausstattung" && inhalt.geraete).toEqual([
      "Klimmzugstange",
    ]);
  });

  it("zeigt bei einer Band-Uebung nur die aktiven Baender, nicht die Klimmzugstange", () => {
    const ansicht = uebungInventar({ equipment: "band" }, BESTAND);
    const inhalt = ansicht?.inhalt;
    expect(inhalt?.art === "ausstattung" && inhalt.geraete).toEqual(["Band mittel"]);
  });

  it("sagt bei fehlender Ausstattung, was fehlt", () => {
    expect(uebungInventar({ equipment: "bar" }, LEER)?.leerText).toBe(
      "Keine Klimmzugstange im Bestand",
    );
    expect(uebungInventar({ equipment: "band" }, LEER)?.leerText).toBe(
      "Kein Band im Bestand",
    );
  });

  it("laesst den Abschnitt bei Koerpergewicht-Uebungen ganz weg", () => {
    expect(uebungInventar({ equipment: "bodyweight" }, BESTAND)).toBeNull();
  });
});
