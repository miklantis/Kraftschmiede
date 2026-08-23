import { describe, expect, it } from "vitest";
import {
  anlassAusUrl,
  EINLADUNG_MARKER,
  ruecksprungAdresse,
  WIEDERHERSTELLUNG_MARKER,
} from "@/lib/authRedirect";

// Ein Fehler in der Ruecksprung-Adresse entwertet Anmelde-Links still: Supabase
// verbraucht den Token beim Klick, auch wenn die Weiterleitung ins Leere laeuft
// (Issue #349/#350). Darum wird sie hier zusammengebaut statt eingetippt.
describe("ruecksprungAdresse", () => {
  it("setzt Herkunft, Basispfad und Marker zusammen", () => {
    expect(
      ruecksprungAdresse(
        WIEDERHERSTELLUNG_MARKER,
        "https://miklantis.github.io",
        "/Kraftschmiede/",
      ),
    ).toBe("https://miklantis.github.io/Kraftschmiede/?wiederherstellung");
  });

  it("kommt mit fehlenden und doppelten Schraegstrichen zurecht", () => {
    expect(
      ruecksprungAdresse(EINLADUNG_MARKER, "https://beispiel.de/", "Unterordner"),
    ).toBe("https://beispiel.de/Unterordner/?einladung");
  });

  it("faellt bei leerem Basispfad auf die Wurzel zurueck", () => {
    expect(ruecksprungAdresse(EINLADUNG_MARKER, "http://localhost:5173", "/")).toBe(
      "http://localhost:5173/?einladung",
    );
  });
});

describe("anlassAusUrl", () => {
  it("erkennt den Einladungs-Marker in der Query", () => {
    expect(anlassAusUrl("?einladung", "")).toBe("einladung");
  });

  it("erkennt type=invite im Hash", () => {
    expect(anlassAusUrl("", "#access_token=abc&type=invite")).toBe("einladung");
  });

  it("erkennt den Wiederherstellungs-Marker in der Query", () => {
    expect(anlassAusUrl("?wiederherstellung", "")).toBe("wiederherstellung");
  });

  it("erkennt type=recovery im Hash", () => {
    expect(anlassAusUrl("", "#access_token=abc&type=recovery")).toBe(
      "wiederherstellung",
    );
  });

  it("laesst Wiederherstellung gewinnen, wenn beides in der Adresse steht", () => {
    // Fehlt der Wiederherstellungs-Eintrag in den Redirect URLs, faellt
    // Supabase auf die Site URL zurueck - und die traegt den Einladungs-Marker.
    expect(anlassAusUrl("?einladung", "#access_token=abc&type=recovery")).toBe(
      "wiederherstellung",
    );
  });

  it("meldet null bei einer gewoehnlichen Adresse", () => {
    expect(anlassAusUrl("?tab=uebungen", "#oben")).toBeNull();
  });
});
