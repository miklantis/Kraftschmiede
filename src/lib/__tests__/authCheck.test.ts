import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  anmeldeFehlerText,
  mitZeitlimit,
  SITZUNG_ZEITLIMIT_MS,
  ZEITLIMIT_MELDUNG,
} from "@/lib/authCheck";

// Der Sitzungs-Check beim Start darf nie stumm haengenbleiben (Issue #348):
// Er braucht ein Zeitlimit und einen anzeigbaren Fehlertext.
describe("mitZeitlimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reicht das Ergebnis durch, wenn die Aufgabe rechtzeitig antwortet", async () => {
    const lauf = mitZeitlimit(Promise.resolve("da"), 1000);
    await vi.advanceTimersByTimeAsync(0);
    await expect(lauf).resolves.toBe("da");
  });

  it("bricht ab, wenn die Aufgabe gar nicht antwortet", async () => {
    const lauf = mitZeitlimit(new Promise<string>(() => {}), 8000);
    const erwartung = expect(lauf).rejects.toThrow(ZEITLIMIT_MELDUNG);
    await vi.advanceTimersByTimeAsync(8000);
    await erwartung;
  });

  it("laesst die Aufgabe bis kurz vor dem Zeitlimit laufen", async () => {
    let erledigt = false;
    const lauf = mitZeitlimit(
      new Promise<string>((resolve) => {
        setTimeout(() => resolve("knapp"), 7999);
      }),
      8000,
    ).then((wert) => {
      erledigt = true;
      return wert;
    });
    await vi.advanceTimersByTimeAsync(7999);
    await expect(lauf).resolves.toBe("knapp");
    expect(erledigt).toBe(true);
  });

  it("reicht den eigenen Fehler der Aufgabe weiter, nicht die Zeitlimit-Meldung", async () => {
    const lauf = mitZeitlimit(Promise.reject(new Error("Netz weg")), 8000);
    const erwartung = expect(lauf).rejects.toThrow("Netz weg");
    await vi.advanceTimersByTimeAsync(0);
    await erwartung;
  });

  it("raeumt den Timer auf, sobald die Aufgabe fertig ist", async () => {
    await mitZeitlimit(Promise.resolve(1), 8000);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("haelt am Zeitlimit von 8 Sekunden fest", () => {
    expect(SITZUNG_ZEITLIMIT_MS).toBe(8000);
  });
});

describe("anmeldeFehlerText", () => {
  it("nimmt die Meldung eines Fehlerobjekts", () => {
    expect(anmeldeFehlerText(new Error("Failed to fetch"))).toBe(
      "Failed to fetch",
    );
  });

  it("nimmt eine reine Textmeldung", () => {
    expect(anmeldeFehlerText("Netzwerkfehler")).toBe("Netzwerkfehler");
  });

  it("faellt bei leeren oder unbrauchbaren Werten auf einen Ersatztext zurueck", () => {
    const ersatz = "Unbekannter Fehler beim Anmelde-Check.";
    expect(anmeldeFehlerText(new Error(""))).toBe(ersatz);
    expect(anmeldeFehlerText("   ")).toBe(ersatz);
    expect(anmeldeFehlerText(null)).toBe(ersatz);
    expect(anmeldeFehlerText(undefined)).toBe(ersatz);
    expect(anmeldeFehlerText({ code: 500 })).toBe(ersatz);
  });
});
