import { describe, it, expect } from "vitest";
import { createMemoryJourneyStore } from "../journeyStore";
import type { BausteinBauregelRow } from "../journeyStore";
import {
  readJourneyZuordnungen,
  writeJourneyAbschluss,
  writeJourneyRename,
  writeJourneyStart,
  writeJourneyZuordnungUebernahme,
  writeVorlageAction,
  writeZuordnungAction,
} from "../journeyWrite";
import type { JourneyStartVorlage } from "../journeyWrite";

// Der Speicher protokolliert nur – geprueft wird, welcher Handgriff mit welchen
// Feldern ausgeloest wird. Beim Journey-Start und beim Speichern einer Vorlage
// zaehlt zusaetzlich die Reihenfolge (erst abloesen, dann anlegen; erst
// Uebungsliste weg, dann neu), deshalb wird dort `folge` mitgeprueft.

// Eine Vorlagenphase traegt nur noch die eingestellten Werte: Wochenliste,
// Lastliste und Bauart entstehen erst beim Start aus dem Baustein
// (Migrationen 0049 und 0050).
const phase = (name: string, focus: "hypertrophy" | "rebuild" | "strength") => ({
  name,
  focus,
  weeks: 4,
  sets_start: 3,
  sets_end: 4,
  deload_week: null,
  rep_target_min: 8,
  rep_target_max: 12,
});

const vorlage = (
  focus: "hypertrophy" | "rebuild" | "strength" = "hypertrophy",
): JourneyStartVorlage => ({
  id: "vorlage-1",
  name: "Aufbau",
  phases: [phase("Grundlage", focus), phase("Steigerung", focus)],
});

// Die Bausteine, aus denen der Start Bauart und Listen baut. Drei Faelle, die
// sich unterscheiden: `hypertrophy` gibt gar nichts vor (der Coach steuert),
// `rebuild` baut eine Lastrampe und steigert vorsichtig, `strength` baut eine
// Wochenliste ohne Lastvorgabe.
const BAUSTEINE: BausteinBauregelRow[] = [
  {
    key: "hypertrophy",
    plan_builder: null,
    load_builder: null,
    careful: false,
    load_start_default: null,
    load_end_default: null,
  },
  {
    key: "rebuild",
    plan_builder: null,
    load_builder: "rebuild_ramp",
    careful: true,
    load_start_default: 0.65,
    load_end_default: 0.95,
  },
  {
    key: "strength",
    plan_builder: "strength_ladder",
    load_builder: null,
    careful: false,
    load_start_default: null,
    load_end_default: null,
  },
];

describe("writeJourneyStart", () => {
  it("loest die bisherige Journey ab, bevor die neue angelegt wird", async () => {
    const { store, log } = createMemoryJourneyStore({
      bausteine: BAUSTEINE,
      aktiveJourneyId: "j-alt",
      neueJourneyId: "j-neu",
    });
    const ergebnis = await writeJourneyStart(
      store,
      "u1",
      vorlage(),
      "2026-08-10",
    );

    expect(ergebnis).toEqual({
      newJourneyId: "j-neu",
      previousJourneyId: "j-alt",
    });
    expect(log.journeysArchived).toEqual([
      { id: "j-alt", endDatum: "2026-08-10" },
    ]);
    expect(log.folge.slice(0, 6)).toEqual([
      "findActiveJourneyId",
      // Der Workout-Name der abgeloesten Journey wird eingebrannt, bevor sie
      // ins Archiv geht (ADR-0022).
      "listJourneyEinheitenWorkouts",
      "archiveJourney",
      "insertJourney",
      "listBausteine",
      "insertPhasen",
    ]);
  });

  it("legt die Journey mit Vorlagen-Bezug und Startdatum an", async () => {
    const { store, log } = createMemoryJourneyStore({
      bausteine: BAUSTEINE,
      neueJourneyId: "j-neu",
    });
    const ergebnis = await writeJourneyStart(
      store,
      "u1",
      vorlage(),
      "2026-08-10",
    );

    expect(ergebnis.previousJourneyId).toBeNull();
    expect(log.journeysArchived).toHaveLength(0);
    expect(log.journeysInserted).toEqual([
      {
        user_id: "u1",
        name: "Aufbau",
        active: true,
        status: "active",
        source_template_id: "vorlage-1",
        start_date: "2026-08-10",
      },
    ]);
  });

  it("kopiert die Vorlagenphasen in der Reihenfolge der Vorlage", async () => {
    const { store, log } = createMemoryJourneyStore({
      bausteine: BAUSTEINE,
      neueJourneyId: "j-neu",
    });
    await writeJourneyStart(store, "u1", vorlage(), "2026-08-10");

    const phasen = log.phasenInserted[0];
    expect(phasen).toHaveLength(2);
    expect(phasen.map((p) => [p.name, p.position])).toEqual([
      ["Grundlage", 0],
      ["Steigerung", 1],
    ]);
    expect(phasen[0].journey_id).toBe("j-neu");
    expect(phasen[0].user_id).toBe("u1");
  });

  it("friert bei einem Baustein mit Lastregel die Arbeitsgewichte ein", async () => {
    const { store, log } = createMemoryJourneyStore({
      bausteine: BAUSTEINE,
      arbeitsgewichte: [
        { id: "ex1", work_weight: 60 },
        { id: "ex2", work_weight: 80 },
      ],
    });
    await writeJourneyStart(store, "u1", vorlage("rebuild"), "2026-08-10");

    expect(log.referenzgewichte).toEqual([
      { exerciseId: "ex1", gewicht: 60 },
      { exerciseId: "ex2", gewicht: 80 },
    ]);
    expect(log.referenzgewichteCleared).toHaveLength(0);
    // Erst die Journey samt Phasen, dann die Referenzgewichte.
    expect(log.folge.indexOf("insertPhasen")).toBeLessThan(
      log.folge.indexOf("listArbeitsgewichte"),
    );
  });

  it("raeumt ohne gebaute Lastliste die alten Referenzgewichte weg", async () => {
    const { store, log } = createMemoryJourneyStore({
      bausteine: BAUSTEINE,
      arbeitsgewichte: [{ id: "ex1", work_weight: 60 }],
    });
    await writeJourneyStart(store, "u1", vorlage(), "2026-08-10");

    expect(log.referenzgewichteCleared).toEqual(["u1"]);
    expect(log.referenzgewichte).toHaveLength(0);
  });

  it("baut die Lastliste aus Baustein und Wochenzahl", async () => {
    // Seit Migration 0050 steht keine Liste mehr an der Vorlage. Die Rampe
    // entsteht hier - ueber genau die vier Wochen der Phase, von 65 % auf 95 %.
    const { store, log } = createMemoryJourneyStore({ bausteine: BAUSTEINE });
    await writeJourneyStart(store, "u1", vorlage("rebuild"), "2026-08-10");

    const phasen = log.phasenInserted[0];
    expect(phasen[0].load_plan?.map((w) => w.week)).toEqual([1, 2, 3, 4]);
    expect(phasen[0].load_plan?.at(0)?.loadPct).toBe(0.65);
    expect(phasen[0].load_plan?.at(-1)?.loadPct).toBe(0.95);
    expect(phasen[0].week_plan).toBeNull();
  });

  it("baut die Wochenliste aus Baustein und Wochenzahl", async () => {
    const { store, log } = createMemoryJourneyStore({ bausteine: BAUSTEINE });
    await writeJourneyStart(store, "u1", vorlage("strength"), "2026-08-10");

    const phasen = log.phasenInserted[0];
    expect(phasen[0].week_plan).toHaveLength(4);
    expect(phasen[0].week_plan?.map((w) => w.week)).toEqual([1, 2, 3, 4]);
    expect(phasen[0].load_plan).toBeNull();
  });

  it("holt den Bauart-Vermerk aus dem Baustein der Phase", async () => {
    // Seit Migration 0049 traegt die Vorlagenphase die Bauart nicht mehr - sie
    // nennt nur ihren Baustein, alles Weitere folgt daraus.
    const { store, log } = createMemoryJourneyStore({
      bausteine: BAUSTEINE,
    });
    await writeJourneyStart(store, "u1", vorlage("rebuild"), "2026-08-10");

    const phasen = log.phasenInserted[0];
    expect(phasen.map((p) => p.load_builder)).toEqual([
      "rebuild_ramp",
      "rebuild_ramp",
    ]);
    expect(phasen.map((p) => p.careful)).toEqual([true, true]);
  });

  it("vermerkt keine Bauregel, wo keine Liste entstanden ist", async () => {
    // Der Hypertrophie-Baustein baut weder Wochen- noch Lastliste. Dann darf
    // auch kein Vermerk stehen - sonst laese der Coach eine Rampe, die es nicht
    // gibt.
    const { store, log } = createMemoryJourneyStore({
      bausteine: BAUSTEINE,
    });
    await writeJourneyStart(store, "u1", vorlage(), "2026-08-10");

    const phasen = log.phasenInserted[0];
    expect(phasen.map((p) => p.load_builder)).toEqual([null, null]);
    expect(phasen.map((p) => p.plan_builder)).toEqual([null, null]);
    expect(phasen.map((p) => p.load_plan)).toEqual([null, null]);
    expect(phasen.map((p) => p.week_plan)).toEqual([null, null]);
  });

  it("bricht ab, wenn es zur Phase keinen Baustein gibt", async () => {
    const { store, log } = createMemoryJourneyStore({ bausteine: [] });
    await expect(
      writeJourneyStart(store, "u1", vorlage(), "2026-08-10"),
    ).rejects.toThrow("Kein Baustein");
    expect(log.phasenInserted).toHaveLength(0);
  });

  it("schreibt ohne angemeldeten Nutzer nichts", async () => {
    const { store, log } = createMemoryJourneyStore();
    await expect(
      writeJourneyStart(store, null, vorlage(), "2026-08-10"),
    ).rejects.toThrow("Nicht angemeldet.");
    expect(log.folge).toHaveLength(0);
  });
});

describe("writeJourneyAbschluss", () => {
  it("legt die Journey mit Enddatum ins Archiv und raeumt die Anker weg", async () => {
    const { store, log } = createMemoryJourneyStore();
    await writeJourneyAbschluss(store, "u1", {
      journeyId: "j1",
      endDate: "2026-06-21",
    });

    expect(log.journeysArchived).toEqual([
      { id: "j1", endDatum: "2026-06-21" },
    ]);
    expect(log.referenzgewichteCleared).toEqual(["u1"]);
    // Erst ins Archiv, dann raeumen: die Journey ist beendet, bevor ihr
    // Bezugspunkt faellt.
    // Erst einbrennen, dann archivieren: bricht das Einbrennen ab, bleibt die
    // Journey aktiv und der Abschluss holt sich beim naechsten Oeffnen nach.
    expect(log.folge).toEqual([
      "listJourneyEinheitenWorkouts",
      "archiveJourney",
      "clearReferenzgewichte",
    ]);
  });

  it("bleibt bei mehrfachem Ausfuehren folgenlos - es sind dieselben Werte", async () => {
    const { store, log } = createMemoryJourneyStore();
    const payload = { journeyId: "j1", endDate: "2026-06-21" };
    await writeJourneyAbschluss(store, "u1", payload);
    await writeJourneyAbschluss(store, "u1", payload);

    expect(
      new Set(log.journeysArchived.map((a) => a.id + a.endDatum)).size,
    ).toBe(1);
  });

  it("raeumt die Anker genauso wie der Journey-Wechsel (Issue #379)", async () => {
    // Der eine Test, der beide Wege erreicht: frueher lief der
    // Kalender-Abschluss ueber eine zweite Fassung im Verlauf-Speicher, die den
    // Phasenbezug stehen liess. Jetzt landen beide auf demselben Handgriff.
    const wechsel = createMemoryJourneyStore({ bausteine: BAUSTEINE });
    await writeJourneyStart(wechsel.store, "u1", vorlage(), "2026-08-10");

    const abschluss = createMemoryJourneyStore();
    await writeJourneyAbschluss(abschluss.store, "u1", {
      journeyId: "j1",
      endDate: "2026-08-10",
    });

    expect(abschluss.log.referenzgewichteCleared).toEqual(
      wechsel.log.referenzgewichteCleared,
    );
    expect(
      abschluss.log.folge.filter((h) => h === "clearReferenzgewichte"),
    ).toEqual(wechsel.log.folge.filter((h) => h === "clearReferenzgewichte"));
  });

  it("brennt den Workout-Namen je Workout einmal in die Einheiten ein", async () => {
    const { store, log } = createMemoryJourneyStore({
      einheitenWorkouts: {
        j1: [
          { templateId: "t1", name: "Ganzkoerper A" },
          { templateId: "t2", name: "Ganzkoerper B" },
          { templateId: "t1", name: "Ganzkoerper A" },
        ],
      },
    });
    await writeJourneyAbschluss(store, "u1", {
      journeyId: "j1",
      endDate: "2026-06-21",
    });

    expect(log.einheitenWorkoutNamen).toEqual([
      { journeyId: "j1", templateId: "t1", name: "Ganzkoerper A" },
      { journeyId: "j1", templateId: "t2", name: "Ganzkoerper B" },
    ]);
  });

  it("laesst Einheiten ohne heutigen Workout-Namen leer", async () => {
    // Die Vorlage gibt es nicht mehr: einen Namen zu erfinden waere schlimmer
    // als keiner.
    const { store, log } = createMemoryJourneyStore({
      einheitenWorkouts: {
        j1: [
          { templateId: "t1", name: null },
          { templateId: "t2", name: "Ganzkoerper B" },
        ],
      },
    });
    await writeJourneyAbschluss(store, "u1", {
      journeyId: "j1",
      endDate: "2026-06-21",
    });

    expect(log.einheitenWorkoutNamen).toEqual([
      { journeyId: "j1", templateId: "t2", name: "Ganzkoerper B" },
    ]);
  });

  it("brennt beim Journey-Wechsel genauso ein wie beim Kalender-Abschluss", async () => {
    // Beide Wege, auf denen eine Journey endet, muessen dasselbe hinterlassen.
    const einheitenWorkouts = {
      "j-alt": [{ templateId: "t1", name: "Ganzkoerper A" }],
    };
    const wechsel = createMemoryJourneyStore({
      bausteine: BAUSTEINE,
      aktiveJourneyId: "j-alt",
      einheitenWorkouts,
    });
    await writeJourneyStart(wechsel.store, "u1", vorlage(), "2026-08-10");

    const abschluss = createMemoryJourneyStore({ einheitenWorkouts });
    await writeJourneyAbschluss(abschluss.store, "u1", {
      journeyId: "j-alt",
      endDate: "2026-08-10",
    });

    expect(wechsel.log.einheitenWorkoutNamen).toEqual([
      { journeyId: "j-alt", templateId: "t1", name: "Ganzkoerper A" },
    ]);
    expect(abschluss.log.einheitenWorkoutNamen).toEqual(
      wechsel.log.einheitenWorkoutNamen,
    );
  });

  it("schreibt ohne angemeldeten Nutzer nichts", async () => {
    const { store, log } = createMemoryJourneyStore();
    await expect(
      writeJourneyAbschluss(store, null, {
        journeyId: "j1",
        endDate: "2026-06-21",
      }),
    ).rejects.toThrow("Nicht angemeldet.");
    expect(log.folge).toHaveLength(0);
  });
});

describe("writeJourneyRename", () => {
  it("aendert nur den Namen", async () => {
    const { store, log } = createMemoryJourneyStore();
    await writeJourneyRename(store, "j1", "Neuer Name");

    expect(log.journeysRenamed).toEqual([{ id: "j1", name: "Neuer Name" }]);
    expect(log.journeysInserted).toHaveLength(0);
  });
});

describe("Uebernahme der Zuordnungen beim Wechsel", () => {
  it("liest die zugewiesenen Workouts der abgeloesten Journey", async () => {
    const { store } = createMemoryJourneyStore({
      zuordnungen: { "j-alt": ["t1", "t2"] },
    });
    await expect(readJourneyZuordnungen(store, "j-alt")).resolves.toEqual([
      "t1",
      "t2",
    ]);
  });

  it("kopiert die uebergebenen Workouts mit eigener Id in die neue Journey", async () => {
    const { store, log } = createMemoryJourneyStore();
    let n = 0;
    await writeJourneyZuordnungUebernahme(
      store,
      "u1",
      "j-neu",
      ["t1", "t2"],
      () => `id-${++n}`,
    );

    expect(log.zuordnungenInserted).toEqual([
      [
        { id: "id-1", user_id: "u1", journey_id: "j-neu", template_id: "t1" },
        { id: "id-2", user_id: "u1", journey_id: "j-neu", template_id: "t2" },
      ],
    ]);
  });

  it("schreibt bei leerer Auswahl gar nichts", async () => {
    const { store, log } = createMemoryJourneyStore();
    await writeJourneyZuordnungUebernahme(store, "u1", "j-neu", [], () => "x");

    expect(log.folge).toHaveLength(0);
  });
});

describe("writeZuordnungAction", () => {
  it("weist ein Workout mit mitgebrachter Id zu", async () => {
    const { store, log } = createMemoryJourneyStore();
    await writeZuordnungAction(store, {
      type: "assign",
      id: "z1",
      userId: "u1",
      journeyId: "j1",
      templateId: "t1",
    });

    expect(log.zuordnungenInserted).toEqual([
      [{ id: "z1", user_id: "u1", journey_id: "j1", template_id: "t1" }],
    ]);
  });

  it("nimmt ein Workout ueber Journey und Vorlage heraus", async () => {
    const { store, log } = createMemoryJourneyStore();
    await writeZuordnungAction(store, {
      type: "unassign",
      journeyId: "j1",
      templateId: "t1",
    });

    expect(log.zuordnungenDeleted).toEqual([
      { journeyId: "j1", templateId: "t1" },
    ]);
    expect(log.zuordnungenInserted).toHaveLength(0);
  });
});

describe("writeVorlageAction", () => {
  const uebungen = [
    { id: "te1", exercise_id: "ex1", position: 0 },
    { id: "te2", exercise_id: "ex2", position: 1 },
  ];

  it("legt eine neue Vorlage samt Uebungsliste an", async () => {
    const { store, log } = createMemoryJourneyStore();
    await writeVorlageAction(store, {
      type: "save",
      userId: "u1",
      templateId: "t1",
      name: "Push",
      isNew: true,
      position: 3,
      exercises: uebungen,
    });

    expect(log.vorlagenInserted).toEqual([
      {
        id: "t1",
        user_id: "u1",
        key: null,
        name: "Push",
        image: null,
        active: true,
        position: 3,
      },
    ]);
    expect(log.vorlagenUebungenInserted[0]).toEqual([
      {
        id: "te1",
        user_id: "u1",
        template_id: "t1",
        exercise_id: "ex1",
        position: 0,
      },
      {
        id: "te2",
        user_id: "u1",
        template_id: "t1",
        exercise_id: "ex2",
        position: 1,
      },
    ]);
    expect(log.folge).toEqual([
      "insertVorlage",
      "deleteVorlageUebungen",
      "insertVorlageUebungen",
    ]);
  });

  it("ersetzt beim Bearbeiten die Uebungsliste und benennt nur um", async () => {
    const { store, log } = createMemoryJourneyStore();
    await writeVorlageAction(store, {
      type: "save",
      userId: "u1",
      templateId: "t1",
      name: "Pull",
      isNew: false,
      position: 3,
      exercises: uebungen,
    });

    expect(log.vorlagenInserted).toHaveLength(0);
    expect(log.vorlagenRenamed).toEqual([{ id: "t1", name: "Pull" }]);
    expect(log.vorlagenUebungenDeleted).toEqual(["t1"]);
    expect(log.folge).toEqual([
      "renameVorlage",
      "deleteVorlageUebungen",
      "insertVorlageUebungen",
    ]);
  });

  it("raeumt eine leer gespeicherte Vorlage ab, ohne neu einzufuegen", async () => {
    const { store, log } = createMemoryJourneyStore();
    await writeVorlageAction(store, {
      type: "save",
      userId: "u1",
      templateId: "t1",
      name: "Leer",
      isNew: false,
      position: 0,
      exercises: [],
    });

    expect(log.vorlagenUebungenDeleted).toEqual(["t1"]);
    expect(log.vorlagenUebungenInserted).toHaveLength(0);
  });

  it("setzt beim Archivieren nur den Schalter", async () => {
    const { store, log } = createMemoryJourneyStore();
    await writeVorlageAction(store, {
      type: "setActive",
      templateId: "t1",
      aktiv: false,
    });

    expect(log.vorlagenAktiv).toEqual([{ id: "t1", aktiv: false }]);
    expect(log.folge).toEqual(["setVorlageAktiv"]);
  });
});
