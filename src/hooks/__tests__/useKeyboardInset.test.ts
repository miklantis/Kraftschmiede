import { describe, expect, it } from "vitest";
import { verdeckteHoehe } from "../useKeyboardInset";

describe("verdeckteHoehe", () => {
  it("meldet 0, wenn das sichtbare Fenster so hoch ist wie das Layout-Fenster", () => {
    expect(verdeckteHoehe(844, 844, 0)).toBe(0);
  });

  it("meldet die Tastaturhoehe, wenn das sichtbare Fenster schrumpft", () => {
    expect(verdeckteHoehe(844, 508, 0)).toBe(336);
  });

  it("zaehlt den Versatz nach oben mit (iOS schiebt das Fenster beim Fokussieren)", () => {
    expect(verdeckteHoehe(844, 508, 60)).toBe(276);
  });

  it("wertet die ein- und ausfahrenden Browserleisten nicht als Tastatur", () => {
    expect(verdeckteHoehe(844, 780, 0)).toBe(0);
  });

  it("rundet auf ganze Pixel", () => {
    expect(verdeckteHoehe(844, 507.6, 0)).toBe(336);
  });

  it("meldet 0 statt negativer Werte", () => {
    expect(verdeckteHoehe(844, 900, 0)).toBe(0);
  });
});
