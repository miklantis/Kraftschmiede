import { describe, it, expect, vi } from "vitest";
import type { QueryClient } from "@tanstack/react-query";
import {
  QUERY_ROOTS,
  queryKeys,
  INVALIDATE,
  invalidateGroup,
  type QueryRoot,
} from "../queryKeys";

// Der Wert dieses Moduls haengt an drei Zusagen: jeder Schluessel beginnt mit
// einer bekannten Wurzel, jeder nutzerbezogene Schluessel traegt die Kennung an
// zweiter Stelle, und jede Auffrisch-Gruppe zielt auf Wurzeln, die es wirklich
// gibt. Genau das pruefen die Tests – ohne React und ohne echten Cache.

const ROOTS = Object.values(QUERY_ROOTS) as QueryRoot[];
const KENNUNG = "nutzer-1";

/** Alle Schluessel-Bauer mit Platzhalter-Argumenten aufrufen. Die Stelligkeit
 *  entscheidet: 0 = ohne Nutzerbezug, sonst Kennung zuerst, danach Ids. */
function alleSchluessel(): Array<{
  name: string;
  arity: number;
  key: readonly unknown[];
}> {
  return Object.entries(queryKeys).map(([name, bauer]) => {
    const arity = bauer.length;
    const args = [KENNUNG, ...Array(Math.max(0, arity - 1)).fill("id-1")];
    const fn = bauer as (...a: unknown[]) => readonly unknown[];
    return { name, arity, key: fn(...args.slice(0, arity)) };
  });
}

describe("queryKeys", () => {
  it("beginnt jeder Schluessel mit einer bekannten Wurzel", () => {
    for (const { name, key } of alleSchluessel()) {
      expect(ROOTS, name).toContain(key[0]);
    }
  });

  it("traegt jeder nutzerbezogene Schluessel die Kennung an zweiter Stelle", () => {
    for (const { name, arity, key } of alleSchluessel()) {
      if (arity === 0) continue;
      expect(key[1], name).toBe(KENNUNG);
    }
  });

  it("haben nutzerfreie Schluessel genau ein Element", () => {
    for (const { name, arity, key } of alleSchluessel()) {
      if (arity > 0) continue;
      expect(key.length, name).toBe(1);
    }
  });

  it("bleiben die Wurzel-Namen stabil (Cache-Vertrag)", () => {
    // Wurzeln sind der Vertrag mit dem Offline-Cache: umbenennen wuerde alte
    // Eintraege verwaisen lassen. Stichproben aus allen Bereichen.
    expect(queryKeys.exercises(KENNUNG)).toEqual(["exercises", KENNUNG]);
    expect(queryKeys.sessionsDetailed(KENNUNG)).toEqual([
      "sessions-detailed",
      KENNUNG,
    ]);
    expect(queryKeys.bodyLog(KENNUNG)).toEqual(["body-log", KENNUNG]);
    expect(queryKeys.rmTestsAll(KENNUNG)).toEqual([
      "rmTests",
      KENNUNG,
      "alle",
    ]);
    expect(queryKeys.journeyWorkouts(KENNUNG, "j1")).toEqual([
      "journeyWorkouts",
      KENNUNG,
      "j1",
    ]);
    expect(queryKeys.appVersion()).toEqual(["app-version"]);
  });

  it("nimmt eine fehlende Kennung an (Abfrage ist dann inaktiv)", () => {
    expect(queryKeys.exercises(null)).toEqual(["exercises", null]);
  });
});

describe("INVALIDATE", () => {
  const gruppen = Object.entries(INVALIDATE) as Array<
    [string, readonly QueryRoot[]]
  >;

  it("nennt jede Gruppe mindestens eine Wurzel, ohne Doppelte", () => {
    for (const [name, gruppe] of gruppen) {
      expect(gruppe.length, name).toBeGreaterThan(0);
      expect(new Set(gruppe).size, name).toBe(gruppe.length);
    }
  });

  it("zielt jede Gruppe nur auf Wurzeln, die auch gelesen werden", () => {
    // Faengt den Fall, dass eine Gruppe auf einen Schluessel zeigt, den kein
    // Hook baut – die Auffrischung liefe dann still ins Leere.
    const gelesen = new Set(alleSchluessel().map((s) => s.key[0]));
    for (const [name, gruppe] of gruppen) {
      for (const wurzel of gruppe) {
        expect(gelesen, `${name} -> ${wurzel}`).toContain(wurzel);
      }
    }
  });

  it("deckt jede Gruppe die Tabellen ab, die ihr Schreib-Baustein anfasst", () => {
    // Der Fehler aus #114: `writeJourneyStart` schreibt Referenzgewichte nach
    // `exercises`, die Gruppe nannte den Katalog aber nicht – die Lastvorgabe
    // der frisch gestarteten Journey griff in der ersten Einheit nicht.
    //
    // Die Tabellen sind am Protokoll der Memory-Speicher abgelesen (siehe
    // journeyWrite.test.ts): welche Handgriffe ein Schreib-Baustein ausloest,
    // steht dort Zeile fuer Zeile. Kommt ein Schreibpfad dazu, wird er hier
    // eingetragen – dann faellt eine fehlende Wurzel sofort auf.
    const wurzelnJeTabelle: Record<string, readonly QueryRoot[]> = {
      sessions: [QUERY_ROOTS.sessions, QUERY_ROOTS.sessionsDetailed],
      session_exercises: [QUERY_ROOTS.sessionsDetailed],
      sets: [QUERY_ROOTS.sessionsDetailed],
      exercises: [QUERY_ROOTS.exercises],
      journeys: [QUERY_ROOTS.activeJourney, QUERY_ROOTS.archivedJourneys],
      journey_phases: [QUERY_ROOTS.activeJourney],
    };
    const tabellenJeEreignis: Record<string, readonly string[]> = {
      // writeJourneyStart / writeJourneyRename: Journey ab- und anlegen,
      // Phasen kopieren, Referenzgewichte einfrieren bzw. wegraeumen.
      journeyChange: ["journeys", "journey_phases", "exercises"],
      // writeFinishStrength: Einheit samt Uebungen und Saetzen anlegen, Katalog
      // fortschreiben, ggf. die Journey archivieren.
      finishStrength: [
        "sessions",
        "session_exercises",
        "sets",
        "exercises",
        "journeys",
      ],
      // writeEditSession: Einheit-Felder, Arbeitssaetze ersetzen, tested_1rm
      // setzen, Katalog nachziehen.
      editSession: ["sessions", "sets", "session_exercises", "exercises"],
    };

    for (const [ereignis, tabellen] of Object.entries(tabellenJeEreignis)) {
      const gruppe = INVALIDATE[ereignis as keyof typeof INVALIDATE];
      for (const tabelle of tabellen) {
        const moegliche = wurzelnJeTabelle[tabelle];
        expect(moegliche, `${ereignis} -> ${tabelle}`).toBeDefined();
        expect(
          moegliche.some((w) => (gruppe as readonly QueryRoot[]).includes(w)),
          `${ereignis} frischt ${tabelle} nicht auf`,
        ).toBe(true);
      }
    }
  });

  it("frischt jedes Schreib-Ereignis die erwarteten Wurzeln auf", () => {
    expect(INVALIDATE.finishStrength).toEqual([
      "sessions",
      "sessions-detailed",
      "exercises",
      "activeJourney",
      "archivedJourneys",
    ]);
    expect(INVALIDATE.journeyChange).toEqual([
      "activeJourney",
      "archivedJourneys",
      "exercises",
    ]);
    expect(INVALIDATE.finishSkill).toEqual([
      "sessions",
      "sessions-detailed",
      "skillProgress",
    ]);
    expect(INVALIDATE.editSession).toEqual([
      "sessions",
      "sessions-detailed",
      "exercises",
    ]);
    expect(INVALIDATE.rmTest).toEqual(["rmTests", "exercises"]);
    expect(INVALIDATE.equipment).toEqual(["equipment", "ownedEquipment"]);
  });
});

describe("invalidateGroup", () => {
  it("frischt je Wurzel genau einmal auf – als Praefix ohne Kennung", () => {
    const invalidateQueries = vi.fn();
    const qc = { invalidateQueries } as unknown as QueryClient;

    invalidateGroup(qc, INVALIDATE.bodyToday);

    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: ["latestBody"],
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: ["body-log"],
    });
  });

  it("trifft der Praefix den vollen Schluessel des Lese-Hooks", () => {
    // Verlaesst sich auf den Praefix-Vergleich von TanStack Query: die Gruppe
    // nennt nur die Wurzel, der gelesene Schluessel traegt die Kennung.
    const wurzel = INVALIDATE.exerciseUpdate[0];
    expect(queryKeys.exercises(KENNUNG)[0]).toBe(wurzel);
  });
});
