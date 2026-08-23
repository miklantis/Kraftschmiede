import { describe, it, expect } from "vitest";
import { createMemoryJourneyStore } from "../journeyStore";
import type { BausteinBauartRow } from "../journeyStore";
import {
  readJourneyZuordnungen,
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

// `last` = Anteil je Phasenwoche; null bedeutet "keine Lastvorgabe".
const phase = (name: string, last: number | null) => ({
  name,
  focus: "hypertrophy" as const,
  weeks: 4,
  sets_start: 3,
  sets_end: 4,
  deload_week: null,
  rep_target_min: 8,
  rep_target_max: 12,
  load_plan:
    last === null
      ? null
      : [1, 2, 3, 4].map((week) => ({ week, loadPct: last })),
});

const vorlage = (last: number | null): JourneyStartVorlage => ({
  id: "vorlage-1",
  name: "Aufbau",
  phases: [phase("Grundlage", last), phase("Steigerung", last)],
});

// Die Bausteine, aus denen der Start die Bauart holt (seit Migration 0049
// steht sie nicht mehr an der Vorlagenphase). Der Hypertrophie-Baustein
// steigert nicht vorsichtig und baut keine Wochenliste; `rebuild` traegt eine
// Lastregel und steigert vorsichtig.
const BAUSTEINE: BausteinBauartRow[] = [
  {
    key: "hypertrophy",
    plan_builder: null,
    load_builder: "rebuild_ramp",
    careful: false,
  },
  {
    key: "strength",
    plan_builder: "strength_ladder",
    load_builder: null,
    careful: false,
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
      vorlage(null),
      "2026-08-10",
    );

    expect(ergebnis).toEqual({
      newJourneyId: "j-neu",
      previousJourneyId: "j-alt",
    });
    expect(log.journeysArchived).toEqual([
      { id: "j-alt", endDatum: "2026-08-10" },
    ]);
    expect(log.folge.slice(0, 5)).toEqual([
      "findActiveJourneyId",
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
      vorlage(null),
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
    await writeJourneyStart(store, "u1", vorlage(null), "2026-08-10");

    const phasen = log.phasenInserted[0];
    expect(phasen).toHaveLength(2);
    expect(phasen.map((p) => [p.name, p.position])).toEqual([
      ["Grundlage", 0],
      ["Steigerung", 1],
    ]);
    expect(phasen[0].journey_id).toBe("j-neu");
    expect(phasen[0].user_id).toBe("u1");
  });

  it("friert bei einer Journey mit Lastliste die Arbeitsgewichte ein", async () => {
    const { store, log } = createMemoryJourneyStore({
      bausteine: BAUSTEINE,
      arbeitsgewichte: [
        { id: "ex1", work_weight: 60 },
        { id: "ex2", work_weight: 80 },
      ],
    });
    await writeJourneyStart(store, "u1", vorlage(0.8), "2026-08-10");

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

  it("raeumt ohne Lastliste die alten Referenzgewichte weg", async () => {
    const { store, log } = createMemoryJourneyStore({
      bausteine: BAUSTEINE,
      arbeitsgewichte: [{ id: "ex1", work_weight: 60 }],
    });
    await writeJourneyStart(store, "u1", vorlage(null), "2026-08-10");

    expect(log.referenzgewichteCleared).toEqual(["u1"]);
    expect(log.referenzgewichte).toHaveLength(0);
  });

  it("friert auch bei durchgehend voller Last ein - die Liste ist die Vorgabe", async () => {
    // Eine gleichbleibende Last ist eine Liste mit lauter gleichen Zeilen. Sie
    // braucht denselben Bezugspunkt wie eine wandernde.
    const { store, log } = createMemoryJourneyStore({
      bausteine: BAUSTEINE,
      arbeitsgewichte: [{ id: "ex1", work_weight: 60 }],
    });
    await writeJourneyStart(store, "u1", vorlage(1), "2026-08-10");

    expect(log.referenzgewichte).toEqual([{ exerciseId: "ex1", gewicht: 60 }]);
    expect(log.referenzgewichteCleared).toHaveLength(0);
  });

  it("holt den Bauart-Vermerk aus dem Baustein der Phase", async () => {
    // Seit Migration 0049 traegt die Vorlagenphase die Bauart nicht mehr - sie
    // nennt nur ihren Baustein, alles Weitere folgt daraus.
    const { store, log } = createMemoryJourneyStore({
      bausteine: BAUSTEINE,
    });
    await writeJourneyStart(store, "u1", vorlage(0.8), "2026-08-10");

    const phasen = log.phasenInserted[0];
    expect(phasen.map((p) => p.load_builder)).toEqual([
      "rebuild_ramp",
      "rebuild_ramp",
    ]);
    expect(phasen.map((p) => p.careful)).toEqual([false, false]);
  });

  it("vermerkt keine Bauregel, wo die Phase die Liste gar nicht traegt", async () => {
    // Der Hypertrophie-Baustein nennt eine Lastregel; die Vorlagenphase ohne
    // Lastliste darf sie trotzdem nicht mitbekommen - sonst laese der Coach
    // eine Rampe, die es nicht gibt.
    const { store, log } = createMemoryJourneyStore({
      bausteine: BAUSTEINE,
    });
    await writeJourneyStart(store, "u1", vorlage(null), "2026-08-10");

    const phasen = log.phasenInserted[0];
    expect(phasen.map((p) => p.load_builder)).toEqual([null, null]);
    expect(phasen.map((p) => p.plan_builder)).toEqual([null, null]);
  });

  it("bricht ab, wenn es zur Phase keinen Baustein gibt", async () => {
    const { store, log } = createMemoryJourneyStore({ bausteine: [] });
    await expect(
      writeJourneyStart(store, "u1", vorlage(null), "2026-08-10"),
    ).rejects.toThrow("Kein Baustein");
    expect(log.phasenInserted).toHaveLength(0);
  });

  it("schreibt ohne angemeldeten Nutzer nichts", async () => {
    const { store, log } = createMemoryJourneyStore();
    await expect(
      writeJourneyStart(store, null, vorlage(null), "2026-08-10"),
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
