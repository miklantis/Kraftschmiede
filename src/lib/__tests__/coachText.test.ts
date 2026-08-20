// Der Textkatalog des Coaches (Issue #268, Schritt 1). Geprueft wird, dass es
// zu jeder Kennung genau einen Satz gibt und dass die vereinbarten Regeln
// eingehalten sind: echte Umlaute, kein Fachjargon, kein Quellen-Praefix, und
// die echte Differenz statt des Wortes "Schritt".

import { describe, it, expect } from "vitest";
import { COACH_REASON_CODES } from "@/engine";
import type { CoachReasonCode } from "@/engine";
import { coachNote } from "../coachText";

// Fachwoerter und Altlasten, die im sichtbaren Text nichts zu suchen haben.
const VERBOTEN = [
  "Repband",
  "Reps",
  "+Schritt",
  "Schritt",
  "Wochenplan –",
  "Wochenplan -",
  "Lastfaktor",
  "Phasenwechsel:",
  "Abschlussphase",
  "1RM",
];

// "ue"/"oe"/"ae" als Umlaut-Ersatz. Echte Vorkommen wie "neue" oder "Poebel"
// gibt es im Katalog nicht - geprueft wird gegen die bekannten Altlasten.
const ERSATZ_UMLAUTE = [
  "zuruecksetzen",
  "zurueck",
  "planmaessig",
  "Uebung",
  "Saetze",
  "naechste",
  "moeglich",
];

function alleTexte(): { code: CoachReasonCode; text: string }[] {
  return COACH_REASON_CODES.map((code) => ({
    code,
    text: coachNote({ code, diff: 2.5, bandTop: 12 }, "kg"),
  }));
}

describe("coachNote – Katalog", () => {
  it("hat zu jeder Kennung genau einen Satz", () => {
    for (const { code, text } of alleTexte()) {
      expect(typeof text, code).toBe("string");
      expect(text.length, code).toBeGreaterThan(10);
      expect(text.endsWith("."), code).toBe(true);
      // ein Satz: kein Punkt mitten im Text
      expect(text.slice(0, -1).includes("."), code).toBe(false);
    }
  });

  it("nutzt kein Fachwort und kein Quellen-Praefix", () => {
    for (const { code, text } of alleTexte()) {
      for (const wort of VERBOTEN) {
        expect(text.includes(wort), `${code}: ${wort}`).toBe(false);
      }
    }
  });

  it("schreibt echte Umlaute", () => {
    for (const { code, text } of alleTexte()) {
      for (const wort of ERSATZ_UMLAUTE) {
        expect(text.includes(wort), `${code}: ${wort}`).toBe(false);
      }
    }
  });

  it("ohne Kennung bleibt der Text leer", () => {
    expect(coachNote(null, "kg")).toBe("");
    expect(coachNote(undefined, "kg")).toBe("");
  });
});

describe("coachNote – Zahlen im Satz", () => {
  it("nennt die Differenz mit deutschem Komma und der eingestellten Einheit", () => {
    expect(coachNote({ code: "plan-raised", diff: 2.5 }, "kg")).toBe(
      "Vorwoche sauber durchgezogen – deshalb liegen jetzt 2,5 kg mehr drauf.",
    );
    expect(coachNote({ code: "plan-raised", diff: 5 }, "lb")).toContain("5 lb mehr");
  });

  it("nennt bei einer Senkung den Betrag, nicht das Vorzeichen", () => {
    expect(coachNote({ code: "too-hard", diff: -2.5 }, "kg")).toBe(
      "Zu schwer geworden – 2,5 kg runter, damit die Sätze wieder sauber laufen.",
    );
    expect(coachNote({ code: "back-off", diff: -5 }, "kg")).toContain("5 kg zurück");
  });

  it("laesst den Satz ohne Zahl, wenn es keine Differenz gibt", () => {
    const ohne = coachNote({ code: "plan-raised", diff: 0 }, "kg");
    expect(ohne).not.toMatch(/\d/);
    expect(ohne).toContain("Vorwoche sauber durchgezogen");
    expect(coachNote({ code: "too-hard" }, "kg")).not.toMatch(/\d/);
  });

  it("nennt das obere Ende des Wiederholungsbandes, wenn es vorliegt", () => {
    expect(coachNote({ code: "reps-up", bandTop: 12 }, "kg")).toBe(
      "Ziel sauber erreicht – eine Wiederholung mehr; bei 12 geht das Gewicht hoch.",
    );
    expect(coachNote({ code: "hold-target", bandTop: 6 }, "kg")).toContain(
      "bis 6 Wiederholungen stehen",
    );
    expect(coachNote({ code: "reps-up" }, "kg")).not.toMatch(/\d/);
  });

  it("setzt Bandende und Differenz gemeinsam", () => {
    expect(coachNote({ code: "band-top", diff: 2.5, bandTop: 12 }, "kg")).toBe(
      "12 Wiederholungen geschafft – 2,5 kg mehr, die Wiederholungen fangen wieder unten an.",
    );
  });
});
