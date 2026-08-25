import { describe, it, expect } from "vitest";
import { createMemorySeedStore } from "../seedStore";
import { writeSeed } from "../seedWrite";

// Die Erstbefuellung laeuft je Konto genau einmal, beim allerersten Oeffnen.
// Ein Fehler darin trifft den Nutzer im schlechtesten Moment und faellt danach
// kaum noch auf - darum steht hier fest, was ein neues Konto bekommt und in
// welcher Reihenfolge.
//
// Der Speicher im Arbeitsspeicher merkt sich das Geschriebene und beantwortet
// damit die Lesefragen: ein zweiter Lauf sieht genau das, was der erste
// hinterlassen hat.

/** Nur die schreibenden Handgriffe - die Lesefragen dazwischen bleiben aussen
 *  vor, sie sagen ueber die Reihenfolge nichts. */
function schreibschritte(handgriffe: string[]): string[] {
  return handgriffe.filter((h) => h.startsWith("insert"));
}

/** Stelle eines Handgriffs in der Abfolge. */
function stelle(handgriffe: string[], handgriff: string): number {
  const i = handgriffe.indexOf(handgriff);
  expect(i, `Handgriff nicht gelaufen: ${handgriff}`).toBeGreaterThanOrEqual(0);
  return i;
}

describe("writeSeed – Reihenfolge", () => {
  it("schreibt die Tabellen eines neuen Kontos in genau dieser Reihenfolge", async () => {
    const { store, log } = createMemorySeedStore();
    await writeSeed(store, "u1");

    expect(schreibschritte(log.handgriffe)).toEqual([
      "insertBausteine",
      "insertStangen",
      "insertScheiben",
      "insertKettlebells",
      "insertUebungen",
      "insertUebungsMuskeln",
      "insertVorlagen",
      "insertVorlagenPhasen",
      "insertSkills",
      "insertSkillPhasen",
      "insertSkillUebungen",
      "insertSkillEquipment",
      "insertEquipment",
    ]);
  });

  // Seit Migration 0048 zeigt der Fokus jeder Vorlagenphase per Fremdschluessel
  // auf den Baustein desselben Nutzers. Fehlt er, scheitert das Anlegen.
  it("legt die Bausteine vor den Journey-Vorlagen an", async () => {
    const { store, log } = createMemorySeedStore();
    await writeSeed(store, "u1");

    expect(stelle(log.handgriffe, "insertBausteine")).toBeLessThan(
      stelle(log.handgriffe, "insertVorlagen"),
    );
  });

  // Die Phase braucht die Kennung ihrer Vorlage.
  it("legt die Vorlage vor ihren Phasen an", async () => {
    const { store, log } = createMemorySeedStore();
    await writeSeed(store, "u1");

    expect(stelle(log.handgriffe, "insertVorlagen")).toBeLessThan(
      stelle(log.handgriffe, "insertVorlagenPhasen"),
    );
  });

  // Jede Stufe braucht die Kennung der vorigen.
  it("legt Skill vor Skill-Phasen vor Skill-Phasen-Uebungen an", async () => {
    const { store, log } = createMemorySeedStore();
    await writeSeed(store, "u1");

    expect(stelle(log.handgriffe, "insertSkills")).toBeLessThan(
      stelle(log.handgriffe, "insertSkillPhasen"),
    );
    expect(stelle(log.handgriffe, "insertSkillPhasen")).toBeLessThan(
      stelle(log.handgriffe, "insertSkillUebungen"),
    );
  });

  // Jede Langhantel-Uebung zeigt per bar_id auf eine Stange desselben Nutzers.
  it("legt die Stangen vor dem Uebungskatalog an", async () => {
    const { store, log } = createMemorySeedStore();
    await writeSeed(store, "u1");

    expect(stelle(log.handgriffe, "insertStangen")).toBeLessThan(
      stelle(log.handgriffe, "insertUebungen"),
    );
  });

  // Die Skill-Phasen-Uebung loest ihre exercise_id ueber den Katalog auf.
  it("legt den Uebungskatalog vor den Skills an", async () => {
    const { store, log } = createMemorySeedStore();
    await writeSeed(store, "u1");

    expect(stelle(log.handgriffe, "insertUebungen")).toBeLessThan(
      stelle(log.handgriffe, "insertSkills"),
    );
  });
});

describe("writeSeed – Umfang eines neuen Kontos", () => {
  it("legt je Tabelle genau diese Zahl an Zeilen an", async () => {
    const { store, log } = createMemorySeedStore();
    const ergebnis = await writeSeed(store, "u1");

    expect(ergebnis.seeded).toBe(true);
    expect({
      bausteine: log.bausteine.length,
      stangen: log.stangen.length,
      scheiben: log.scheiben.length,
      kettlebells: log.kettlebells.length,
      uebungen: log.uebungen.length,
      uebungsMuskeln: log.uebungsMuskeln.length,
      vorlagen: log.vorlagen.length,
      vorlagenPhasen: log.vorlagenPhasen.length,
      skills: log.skills.length,
      skillPhasen: log.skillPhasen.length,
      skillUebungen: log.skillUebungen.length,
      skillEquipment: log.skillEquipment.length,
      equipment: log.equipment.length,
    }).toEqual({
      bausteine: 8,
      stangen: 5,
      scheiben: 5,
      kettlebells: 8,
      uebungen: 22,
      uebungsMuskeln: 76,
      vorlagen: 2,
      vorlagenPhasen: 6,
      skills: 3,
      skillPhasen: 21,
      skillUebungen: 22,
      skillEquipment: 13,
      equipment: 6,
    });
  });

  it("schreibt jede Zeile auf die Kennung des angemeldeten Nutzers", async () => {
    const { store, log } = createMemorySeedStore();
    await writeSeed(store, "u1");

    const fremde = [
      ...log.bausteine,
      ...log.stangen,
      ...log.scheiben,
      ...log.kettlebells,
      ...log.uebungen,
      ...log.uebungsMuskeln,
      ...log.vorlagen,
      ...log.vorlagenPhasen,
      ...log.skills,
      ...log.skillPhasen,
      ...log.skillUebungen,
      ...log.skillEquipment,
      ...log.equipment,
    ].filter((row) => row.user_id !== "u1");
    expect(fremde).toHaveLength(0);
  });

  // Ohne diese Verknuepfung findet weder der Uebungsverlauf die Skill-Saetze
  // noch das Start-Popup die Detailseite (Issue #393).
  it("verknuepft jede Skill-Phasen-Uebung mit einer Uebung des Katalogs", async () => {
    const { store, log } = createMemorySeedStore();
    await writeSeed(store, "u1");

    const katalogIds = new Set(log.uebungen.map((e) => e.id));
    const ohneVerknuepfung = log.skillUebungen.filter(
      (e) =>
        e.exercise_id === null ||
        e.exercise_id === undefined ||
        !katalogIds.has(e.exercise_id),
    );
    expect(ohneVerknuepfung).toHaveLength(0);
  });

  it("haengt jede Langhantel-Uebung an eine angelegte Stange", async () => {
    const { store, log } = createMemorySeedStore();
    await writeSeed(store, "u1");

    const stangenIds = new Set(log.stangen.map((s) => s.id));
    const langhantel = log.uebungen.filter((e) => e.equipment === "barbell");
    expect(langhantel.length).toBeGreaterThan(0);
    expect(
      langhantel.filter(
        (e) =>
          e.bar_id === null ||
          e.bar_id === undefined ||
          !stangenIds.has(e.bar_id),
      ),
    ).toHaveLength(0);

    // Und zwar an die im Seed genannte: die Kniebeuge an die Standardstange.
    const standard = log.stangen.find((s) => s.key === "standard");
    const kniebeuge = log.uebungen.find((e) => e.key === "back_squat");
    expect(kniebeuge?.bar_id).toBe(standard?.id);
  });

  it("haengt jede Muskel-Zeile an eine gerade angelegte Uebung", async () => {
    const { store, log } = createMemorySeedStore();
    await writeSeed(store, "u1");

    const katalogIds = new Set(log.uebungen.map((e) => e.id));
    expect(
      log.uebungsMuskeln.filter((m) => !katalogIds.has(m.exercise_id)),
    ).toHaveLength(0);
  });

  it("haengt jede Skill-Phasen-Uebung an eine gerade angelegte Skill-Phase", async () => {
    const { store, log } = createMemorySeedStore();
    await writeSeed(store, "u1");

    const phasenIds = new Set(log.skillPhasen.map((p) => p.id));
    expect(
      log.skillUebungen.filter((e) => !phasenIds.has(e.skill_phase_id)),
    ).toHaveLength(0);
    expect(
      log.skillEquipment.filter((e) => !phasenIds.has(e.skill_phase_id)),
    ).toHaveLength(0);
  });
});

describe("writeSeed – zweiter Lauf", () => {
  it("aendert beim zweiten Lauf nichts mehr", async () => {
    const { store, log } = createMemorySeedStore();
    await writeSeed(store, "u1");
    const nachErstemLauf = log.handgriffe.length;
    const bestand = JSON.stringify({
      bausteine: log.bausteine,
      stangen: log.stangen,
      scheiben: log.scheiben,
      kettlebells: log.kettlebells,
      uebungen: log.uebungen,
      uebungsMuskeln: log.uebungsMuskeln,
      vorlagen: log.vorlagen,
      vorlagenPhasen: log.vorlagenPhasen,
      skills: log.skills,
      skillPhasen: log.skillPhasen,
      skillUebungen: log.skillUebungen,
      skillEquipment: log.skillEquipment,
      equipment: log.equipment,
    });

    const ergebnis = await writeSeed(store, "u1");

    expect(ergebnis.seeded).toBe(false);
    expect(schreibschritte(log.handgriffe.slice(nachErstemLauf))).toEqual([]);
    expect(
      JSON.stringify({
        bausteine: log.bausteine,
        stangen: log.stangen,
        scheiben: log.scheiben,
        kettlebells: log.kettlebells,
        uebungen: log.uebungen,
        uebungsMuskeln: log.uebungsMuskeln,
        vorlagen: log.vorlagen,
        vorlagenPhasen: log.vorlagenPhasen,
        skills: log.skills,
        skillPhasen: log.skillPhasen,
        skillUebungen: log.skillUebungen,
        skillEquipment: log.skillEquipment,
        equipment: log.equipment,
      }),
    ).toBe(bestand);
  });

  it("zieht einen spaeter dazugekommenen Baustein nach, ohne Vorlagen und Skills anzufassen", async () => {
    const { store, log } = createMemorySeedStore();
    await writeSeed(store, "u1");
    // Stellt ein Konto nach, dem genau ein Baustein fehlt - so wie bei einem
    // Bestandskonto, wenn ein neuer Baustein dazukommt.
    const [entfernt] = log.bausteine.splice(3, 1);
    const nachErstemLauf = log.handgriffe.length;

    const ergebnis = await writeSeed(store, "u1");

    expect(ergebnis.seeded).toBe(true);
    expect(schreibschritte(log.handgriffe.slice(nachErstemLauf))).toEqual([
      "insertBausteine",
    ]);
    expect(log.bausteine).toHaveLength(8);
    expect(log.bausteine.at(-1)?.key).toBe(entfernt.key);
    expect(log.vorlagen).toHaveLength(2);
    expect(log.skills).toHaveLength(3);
  });

  it("legt Vorlagen und Skills nicht an, wenn schon ein Skill vorhanden ist", async () => {
    const { store, log } = createMemorySeedStore();
    // Bestandskonto: ein eigener Skill genuegt, damit der einmalige Teil des
    // Seeds nicht laeuft. Geloeschte oder umbenannte Zeilen sollen nicht
    // zurueckkommen.
    log.skills.push({ id: "eigen-1", user_id: "u1", name: "Eigener Skill" });

    const ergebnis = await writeSeed(store, "u1");

    expect(ergebnis.seeded).toBe(true);
    expect(schreibschritte(log.handgriffe)).toEqual([
      "insertBausteine",
      "insertStangen",
      "insertScheiben",
      "insertKettlebells",
      "insertUebungen",
      "insertUebungsMuskeln",
      "insertEquipment",
    ]);
    expect(log.skills).toHaveLength(1);
    expect(log.vorlagen).toHaveLength(0);
    expect(log.skillPhasen).toHaveLength(0);
  });
});

describe("writeSeed – Bestandskonto mit eigenem Inventar", () => {
  it("laesst eine eigene Stangenliste stehen und legt den Katalog trotzdem an", async () => {
    const { store, log } = createMemorySeedStore();
    // Wer seine Stangen einmal zurechtgelegt hat, soll die Standardstangen
    // nicht zurueckbekommen. Der Katalog haengt dann ohne Stangenbezug an -
    // der Coach faellt auf die Standardstange zurueck, statt dass das Anlegen
    // am Fremdschluessel scheitert.
    log.stangen.push({
      id: "eigen-1",
      user_id: "u1",
      key: "eigenbau",
      name: "Eigenbau",
      weight: 17.5,
    });

    await writeSeed(store, "u1");

    expect(log.stangen).toHaveLength(1);
    expect(schreibschritte(log.handgriffe)).not.toContain("insertStangen");
    expect(log.uebungen).toHaveLength(22);
    expect(log.uebungen.every((e) => e.bar_id === null)).toBe(true);
  });

  it("legt Scheiben und Kettlebells nicht nach, wenn schon welche da sind", async () => {
    const { store, log } = createMemorySeedStore();
    log.scheiben.push({ user_id: "u1", weight: 1.25, position: 0 });
    log.kettlebells.push({ user_id: "u1", weight: 12, position: 0 });

    await writeSeed(store, "u1");

    expect(log.scheiben).toHaveLength(1);
    expect(log.kettlebells).toHaveLength(1);
    expect(schreibschritte(log.handgriffe)).not.toContain("insertScheiben");
    expect(schreibschritte(log.handgriffe)).not.toContain("insertKettlebells");
  });
});
