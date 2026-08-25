// Der Uebungskatalog im Seed (Issue #393).
//
// Bis hierher entstanden Uebungen nur ueber Migrationen, und die leiteten die
// user_id aus bereits vorhandenen Uebungszeilen ab. Ein neues Konto erwischten
// sie darum nie: es startete mit leerem Katalog, und alle Skill-Phasen-Uebungen
// blieben ohne Verknuepfung. Diese Tests halten die Naht zu, an der das
// aufgefallen ist - die Reihenfolge Stange -> Uebung -> Skill und die
// Schluessel, ueber die sie zusammenfinden.

import { describe, it, expect } from "vitest";
import {
  barSeeds,
  exerciseSeeds,
  kettlebellSeeds,
  plateSeeds,
  skillSeeds,
} from "@/seed/definitions";
import { exerciseInsert, exerciseMuscleInsert } from "@/schemas";
import { MUSCLES } from "@/lib/muscles";

const NUTZER = "00000000-0000-4000-8000-000000000000";
const UEBUNG = "00000000-0000-4000-8000-000000000001";

describe("Uebungskatalog im Seed", () => {
  it("fuehrt 22 Uebungen mit eindeutigen Schluesseln", () => {
    expect(exerciseSeeds).toHaveLength(22);
    const keys = exerciseSeeds.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("ergibt je Uebung eine gueltige Schreib-Form", () => {
    exerciseSeeds.forEach((e, i) => {
      const geprueft = exerciseInsert.safeParse({
        user_id: NUTZER,
        key: e.key,
        name: e.name,
        profile: e.profile,
        tier: e.tier,
        equipment: e.equipment,
        bar_id: null,
        description: e.description,
        metric: e.metric,
        muscle_groups: e.muscleGroups,
        rep_range_min: e.repRangeMin,
        rep_range_max: e.repRangeMax,
        work_weight: e.workWeight,
        reference_weight: null,
        reference_phase_id: null,
        plan_start_weight: null,
        recovery_hours: e.recoveryHours,
        rm: null,
        rm_as_of: null,
        rm_stale: false,
        position: i,
      });
      expect(geprueft.success, `${e.key}: ${geprueft.error?.message ?? ""}`).toBe(
        true,
      );
    });
  });

  it("nennt nur Stangen, die es im Seed auch gibt", () => {
    const stangen = new Set(barSeeds.map((b) => b.key));
    for (const e of exerciseSeeds) {
      if (e.barKey === null) continue;
      expect(stangen, `${e.key} zeigt auf ${e.barKey}`).toContain(e.barKey);
    }
  });

  it("gibt jeder Langhantel-Uebung eine Stange - und nur ihr", () => {
    for (const e of exerciseSeeds) {
      if (e.equipment === "barbell") {
        expect(e.barKey, `${e.key} ohne Stange`).not.toBeNull();
      } else {
        expect(e.barKey, `${e.key} mit Stange`).toBeNull();
      }
    }
  });

  it("laesst das Wiederholungsband entweder ganz weg oder vollstaendig", () => {
    for (const e of exerciseSeeds) {
      const beide = e.repRangeMin !== null && e.repRangeMax !== null;
      const keins = e.repRangeMin === null && e.repRangeMax === null;
      expect(beide || keins, `${e.key} nur halb belegt`).toBe(true);
      if (beide) expect(e.repRangeMin).toBeLessThanOrEqual(e.repRangeMax!);
    }
  });

  it("faengt ohne Arbeitsgewicht an, wo Stange oder Koerpergewicht die Last traegt", () => {
    // Ein neues Konto hat keinen Trainingsstand. Wo etwas anderes die Last
    // traegt - die leere Stange oder das eigene Koerpergewicht - startet die
    // Uebung darum bei 0 (so schon in Migration 0040 entschieden). Nur wo es
    // weder Stange noch Koerpergewicht gibt, steht ein kleiner Startwert.
    for (const e of exerciseSeeds) {
      const traegtSelbst =
        e.barKey !== null ||
        e.equipment === "bodyweight" ||
        e.equipment === "bar" ||
        e.equipment === "band";
      if (traegtSelbst) {
        expect(e.workWeight, `${e.key}`).toBe(0);
      } else {
        expect(e.workWeight, `${e.key}`).toBeGreaterThan(0);
      }
    }
  });

  it("schreibt jeden Schluessel in snake_case", () => {
    // Bis Vorhaben #396 war 'dumbbell-curl' der einzige mit Bindestrich.
    for (const e of exerciseSeeds) {
      expect(e.key, `${e.key} faellt aus der Schreibweise`).toMatch(
        /^[a-z][a-z0-9_]*$/,
      );
    }
  });
});

describe("Muskel-Zuordnung im Seed", () => {
  it("gibt jeder Uebung mindestens eine Region", () => {
    for (const e of exerciseSeeds) {
      expect(e.muscles.length, `${e.key} ohne Muskel-Zuordnung`).toBeGreaterThan(
        0,
      );
    }
  });

  it("nennt nur Regionen der Master-SVG", () => {
    const regionen = new Set(MUSCLES.map((m) => m.id));
    for (const e of exerciseSeeds) {
      for (const m of e.muscles) {
        expect(regionen, `${e.key}: ${m.regionId}`).toContain(m.regionId);
      }
    }
  });

  it("nennt keine Region zweimal je Uebung", () => {
    for (const e of exerciseSeeds) {
      const ids = e.muscles.map((m) => m.regionId);
      expect(new Set(ids).size, `${e.key}`).toBe(ids.length);
    }
  });

  it("ergibt je Zeile eine gueltige Schreib-Form", () => {
    for (const e of exerciseSeeds) {
      for (const m of e.muscles) {
        const geprueft = exerciseMuscleInsert.safeParse({
          user_id: NUTZER,
          exercise_id: UEBUNG,
          region_id: m.regionId,
          kategorie: m.kategorie,
        });
        expect(geprueft.success, `${e.key}/${m.regionId}`).toBe(true);
      }
    }
  });
});

describe("Naht zwischen Skills und Uebungskatalog", () => {
  it("findet zu jeder Skill-Phasen-Uebung ihre Katalog-Uebung", () => {
    // Der eigentliche Befund aus Issue #393: seedSkills loest exercise_id ueber
    // diesen Schluessel auf. Fehlt die Uebung im Katalog, bleibt die Zeile still
    // unverknuepft - weder der Uebungsverlauf noch das Start-Popup finden sie
    // dann wieder.
    const katalog = new Set(exerciseSeeds.map((e) => e.key));
    const referenziert = skillSeeds.flatMap((s) =>
      s.phases.flatMap((p) =>
        p.exercises
          .map((e) => e.exerciseKey)
          .filter((k): k is string => k !== null),
      ),
    );

    expect(referenziert.length).toBeGreaterThan(0);
    for (const key of referenziert) {
      expect(katalog, `Skill-Uebung ohne Katalog-Eintrag: ${key}`).toContain(
        key,
      );
    }
  });

  it("laesst keine Skill-Phasen-Uebung ohne Schluessel zurueck", () => {
    for (const s of skillSeeds) {
      for (const p of s.phases) {
        for (const e of p.exercises) {
          expect(e.exerciseKey, `${s.key}/${p.label}/${e.name}`).not.toBeNull();
        }
      }
    }
  });
});

describe("Inventar im Seed", () => {
  it("fuehrt Stangen mit eindeutigen Schluesseln", () => {
    const keys = barSeeds.map((b) => b.key);
    expect(keys.length).toBeGreaterThan(0);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("bestimmt genau eine Standardstange", () => {
    expect(barSeeds.filter((b) => b.isDefault)).toHaveLength(1);
  });

  it("gibt jeder Stange ein positives Gewicht", () => {
    for (const b of barSeeds) {
      expect(b.weight, b.key).toBeGreaterThan(0);
    }
  });

  it("fuehrt Scheiben und Kettlebells aufsteigend und ohne Dopplung", () => {
    for (const liste of [plateSeeds, kettlebellSeeds]) {
      expect(liste.length).toBeGreaterThan(0);
      expect(new Set(liste).size).toBe(liste.length);
      expect([...liste].sort((a, b) => a - b)).toEqual(liste);
      for (const w of liste) expect(w).toBeGreaterThan(0);
    }
  });
});
