import { describe, expect, it } from "vitest";
import { typedConfirmMatches } from "@/lib/typedConfirm";

// Der Vergleich ist die ganze Huerde des Bausteins "Bestaetigung durch
// Abtippen" - er muss zeichengenau bleiben (Issue #257).
describe("typedConfirmMatches", () => {
  it("passt nur bei exakt gleichem Text", () => {
    expect(typedConfirmMatches("Grundlagen", "Grundlagen")).toBe(true);
    expect(typedConfirmMatches("Grundlage", "Grundlagen")).toBe(false);
    expect(typedConfirmMatches("Grundlagenn", "Grundlagen")).toBe(false);
  });

  it("unterscheidet Gross- und Kleinschreibung", () => {
    expect(typedConfirmMatches("grundlagen", "Grundlagen")).toBe(false);
    expect(typedConfirmMatches("GRUNDLAGEN", "Grundlagen")).toBe(false);
  });

  it("trimmt nicht - fuehrende und angehaengte Leerzeichen zaehlen", () => {
    expect(typedConfirmMatches(" Grundlagen", "Grundlagen")).toBe(false);
    expect(typedConfirmMatches("Grundlagen ", "Grundlagen")).toBe(false);
    expect(typedConfirmMatches("Grund lagen", "Grundlagen")).toBe(false);
  });

  it("verlangt echte Umlaute und Sonderzeichen", () => {
    expect(typedConfirmMatches("Kraftaufbau Süd", "Kraftaufbau Süd")).toBe(true);
    expect(typedConfirmMatches("Kraftaufbau Sued", "Kraftaufbau Süd")).toBe(false);
    expect(typedConfirmMatches("Kraftaufbau Sud", "Kraftaufbau Süd")).toBe(false);
    expect(typedConfirmMatches("Grosse Basis", "Große Basis")).toBe(false);
  });

  it("passt nie auf ein leeres Wort", () => {
    expect(typedConfirmMatches("", "")).toBe(false);
    expect(typedConfirmMatches("irgendwas", "")).toBe(false);
  });

  it("leere Eingabe passt nie auf ein gesetztes Wort", () => {
    expect(typedConfirmMatches("", "Grundlagen")).toBe(false);
  });
});
