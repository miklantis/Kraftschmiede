import { describe, it, expect } from "vitest";
import {
  AVATAR_MAX_ZEICHEN,
  istBilddatei,
  kleinGenug,
  mittigerAusschnitt,
} from "../profilbild";

// Geprueft werden die reinen Rechenteile des Profilbilds: der mittige
// Ausschnitt, die Dateipruefung und die Groessengrenze. Das eigentliche
// Zuschneiden braucht Canvas und laeuft nur im Browser - dafuer fehlt hier die
// Umgebung, darum ist der Ausschnitt bewusst als eigene Funktion herausgezogen.

describe("mittigerAusschnitt", () => {
  it("nimmt bei einem Querformat die Mitte und schneidet links/rechts ab", () => {
    expect(mittigerAusschnitt(1000, 400)).toEqual({ x: 300, y: 0, kante: 400 });
  });

  it("nimmt bei einem Hochformat die Mitte und schneidet oben/unten ab", () => {
    expect(mittigerAusschnitt(400, 1000)).toEqual({ x: 0, y: 300, kante: 400 });
  });

  it("laesst ein Quadrat unangetastet", () => {
    expect(mittigerAusschnitt(512, 512)).toEqual({ x: 0, y: 0, kante: 512 });
  });

  it("rundet einen ungeraden Rest, statt halbe Pixel zu liefern", () => {
    const { x, y, kante } = mittigerAusschnitt(101, 100);
    expect(kante).toBe(100);
    expect(Number.isInteger(x)).toBe(true);
    expect(y).toBe(0);
  });
});

describe("istBilddatei", () => {
  it("nimmt gaengige Bildtypen an", () => {
    for (const typ of ["image/jpeg", "image/png", "image/webp", "image/heic"]) {
      expect(istBilddatei(new File([], "foto", { type: typ }))).toBe(true);
    }
  });

  it("weist alles ab, was kein Bild ist", () => {
    expect(istBilddatei(new File([], "sicherung.json", { type: "application/json" }))).toBe(false);
    expect(istBilddatei(new File([], "ohne-typ"))).toBe(false);
  });
});

describe("kleinGenug", () => {
  it("laesst eine Data-URL bis zur Grenze durch", () => {
    expect(kleinGenug("x".repeat(AVATAR_MAX_ZEICHEN))).toBe(true);
  });

  it("weist alles ueber der Grenze ab", () => {
    expect(kleinGenug("x".repeat(AVATAR_MAX_ZEICHEN + 1))).toBe(false);
  });
});
