// Schreib-Baustein der Erstbefuellung: die reine Abfolge "Absicht ->
// Handgriffe" fuer ein Konto, das die App zum ersten Mal oeffnet. Hier liegen
// die Reihenfolge, die Feld-Abbildung aus den Seed-Definitionen und die
// Entscheidung, was ueberhaupt noch fehlt. Das eigentliche Schreiben und
// Fehlerwerfen macht der uebergebene Speicher (SeedStore).
//
// Haengt nur an der Naht (Typ SeedStore), an den Seed-Definitionen und an den
// Schema-Typen, kennt Supabase nicht. Dadurch mit einem Speicher im
// Arbeitsspeicher pruefbar - siehe `src/lib/__tests__/seedWrite.test.ts`, wo
// Reihenfolge, Umfang und Idempotenz festgehalten sind statt nur als Kommentar
// dazustehen.
//
// Zwei Arten von Erstbefuellung liegen hier nebeneinander:
//   - einmalig: Journey-Vorlagen und Skills entstehen nur, solange der Nutzer
//     noch gar keine Skills hat. Sie sind spaeter bearbeitbar; ein zweiter Lauf
//     duerfte geloeschte oder umbenannte Zeilen nicht wieder herstellen.
//   - nachziehend: Bausteine, Inventar, Uebungskatalog und Ausstattung
//     ergaenzen jeweils nur die fehlenden Schluessel und lassen vorhandene
//     Zeilen unangetastet. So bekommen auch frueher angelegte Konten, was
//     spaeter dazugekommen ist, ohne dass ein zweiter Lauf etwas veraendert.

import {
  barSeeds,
  buildSeedPhase,
  exerciseSeeds,
  journeyTemplateSeeds,
  kettlebellSeeds,
  phaseTypeSeeds,
  plateSeeds,
  skillSeeds,
  equipmentSeeds,
} from "@/seed/definitions";
import type { SeedStore } from "./seedStore";
import type {
  ExerciseInsert,
  ExerciseMuscleInsert,
  Focus,
  JourneyTemplateInsert,
  JourneyTemplatePhaseInsert,
  PhaseTypeInsert,
  SkillInsert,
  SkillPhaseInsert,
  SkillPhaseExerciseInsert,
  SkillPhaseEquipmentInsert,
  InventoryBarInsert,
  InventoryEquipmentInsert,
  InventoryKettlebellInsert,
  InventoryPlateInsert,
} from "@/schemas";

export interface SeedErgebnis {
  /** Wurde ueberhaupt etwas angelegt? Ein zweiter Lauf meldet `false`. */
  seeded: boolean;
}

/**
 * Spielt die Erstbefuellung eines Kontos ab.
 *
 * Die Reihenfolge ist nicht frei, jeder Schritt haengt am vorigen:
 *   1. Bausteine vor den Journey-Vorlagen - seit Migration 0048 zeigt der
 *      Fokus jeder Vorlagenphase per Fremdschluessel auf den Baustein
 *      desselben Nutzers. Fehlt er, scheitert das Anlegen der Vorlagen.
 *   2. Stangen vor dem Uebungskatalog - jede Langhantel-Uebung zeigt per
 *      `bar_id` auf eine Stange desselben Nutzers. Ohne Stangen bliebe der
 *      halbe Katalog ohne Last-Bezug.
 *   3. Uebungskatalog vor den Skills - die Skill-Phasen-Uebungen loesen ihre
 *      `exercise_id` ueber den Katalog-Schluessel auf. Fehlt der Katalog,
 *      bleiben alle 22 ohne Verknuepfung (Issue #393).
 *   4. Innerhalb der Skills: Skill vor Skill-Phasen vor Skill-Phasen-Uebungen -
 *      jede Stufe braucht die Kennung der vorigen.
 */
export async function writeSeed(
  store: SeedStore,
  userId: string,
): Promise<SeedErgebnis> {
  // Sind schon Skills fuer diesen Nutzer vorhanden, gilt als bereits geseedet.
  const definitionsSeeded = (await store.zaehleSkills()) === 0;

  const phaseTypesAdded = await ensureBausteine(store, userId);

  const barIdByKey = await ensureStangen(store, userId);
  const platesAdded = await ensureScheiben(store, userId);
  const kettlebellsAdded = await ensureKettlebells(store, userId);

  const exercisesAdded = await ensureUebungen(store, userId, barIdByKey);

  if (definitionsSeeded) {
    await seedJourneyVorlagen(store, userId);
    await seedSkills(store, userId);
  }

  // Equipment laeuft unabhaengig und idempotent: nur fehlende Standardgeraete
  // werden ergaenzt, bestehende (auch per V1-Import) bleiben unangetastet. So
  // bekommen auch frueher angelegte Nutzer das Skill-Tor-Inventar.
  const equipmentAdded = await ensureEquipment(store, userId);

  return {
    seeded:
      definitionsSeeded ||
      equipmentAdded > 0 ||
      phaseTypesAdded > 0 ||
      exercisesAdded > 0 ||
      platesAdded > 0 ||
      kettlebellsAdded > 0,
  };
}

// Fuegt fehlende Bausteine hinzu, ohne vorhandene zu ueberschreiben. Gibt die
// Zahl neu angelegter Bausteine zurueck.
async function ensureBausteine(
  store: SeedStore,
  userId: string,
): Promise<number> {
  const vorhanden = new Set(await store.listBausteinSchluessel());

  const fehlende: PhaseTypeInsert[] = phaseTypeSeeds
    .map((b, i) => ({
      user_id: userId,
      key: b.key,
      name: b.name,
      summary: b.summary,
      position: i,
      control: b.control,
      plan_builder: b.planBuilder,
      load_builder: b.loadBuilder,
      careful: b.careful,
      weeks_min: b.weeksMin,
      weeks_max: b.weeksMax,
      weeks_default: b.weeksDefault,
      sets_start_default: b.setsStartDefault,
      sets_end_default: b.setsEndDefault,
      sets_max: b.setsMax,
      sets_locked: b.setsLocked,
      rep_min_default: b.repMinDefault,
      rep_max_default: b.repMaxDefault,
      rep_bound_min: b.repBoundMin,
      rep_bound_max: b.repBoundMax,
      rep_band_locked: b.repBandLocked,
      deload_allowed: b.deloadAllowed,
      deload_default: b.deloadDefault,
      load_start_default: b.loadStartDefault,
      load_end_default: b.loadEndDefault,
      placement_hint: b.placementHint,
    }))
    .filter((b) => !vorhanden.has(b.key));

  if (fehlende.length === 0) return 0;

  await store.insertBausteine(fehlende);
  return fehlende.length;
}

// Fuegt fehlende Standardgeraete hinzu, ohne vorhandene zu ueberschreiben.
// Gibt die Zahl neu angelegter Geraete zurueck.
async function ensureEquipment(
  store: SeedStore,
  userId: string,
): Promise<number> {
  const vorhanden = new Set(await store.listEquipmentSchluessel());

  const fehlende: InventoryEquipmentInsert[] = equipmentSeeds
    .map((e, i) => ({
      user_id: userId,
      key: e.key,
      label: e.label,
      active: e.active,
      position: i,
    }))
    .filter((e) => !vorhanden.has(e.key));

  if (fehlende.length === 0) return 0;

  await store.insertEquipment(fehlende);
  return fehlende.length;
}

// Legt die Standard-Stangen an, falls der Nutzer noch gar keine hat, und gibt
// in jedem Fall die Zuordnung Schluessel -> ID zurueck. Der Uebungskatalog
// braucht diese IDs fuer bar_id.
//
// Anders als bei Bausteinen und Ausstattung wird hier nicht Schluessel fuer
// Schluessel nachgezogen, sondern nur der leere Fall bedient: Stangen sind
// persoenlicher Bestand. Wer seine Liste einmal zurechtgelegt hat, soll bei
// jedem App-Start nicht die Standardstangen zurueckbekommen, die er
// weggeraeumt hat.
async function ensureStangen(
  store: SeedStore,
  userId: string,
): Promise<Map<string, string>> {
  const vorhanden = await store.listStangen();
  if (vorhanden.length > 0) return idsNachSchluessel(vorhanden);

  const inserts: InventoryBarInsert[] = barSeeds.map((b, i) => ({
    user_id: userId,
    key: b.key,
    name: b.name,
    weight: b.weight,
    is_default: b.isDefault,
    position: i,
  }));

  return idsNachSchluessel(await store.insertStangen(inserts));
}

// Legt die Standard-Scheiben an, falls der Nutzer noch keine hat. Gleicher
// Gedanke wie bei den Stangen: Scheiben haben keinen Schluessel, sondern nur
// ein Gewicht, und sie sind in den Einstellungen loeschbar. Ein Nachziehen
// ueber das Gewicht wuerde eine geloeschte Scheibe beim naechsten Start wieder
// hinstellen. Gibt die Zahl neu angelegter Scheiben zurueck.
async function ensureScheiben(
  store: SeedStore,
  userId: string,
): Promise<number> {
  if ((await store.zaehleScheiben()) > 0) return 0;

  const inserts: InventoryPlateInsert[] = plateSeeds.map((weight, i) => ({
    user_id: userId,
    weight,
    position: i,
  }));

  await store.insertScheiben(inserts);
  return inserts.length;
}

// Legt die Standard-Kettlebells an, falls der Nutzer noch keine hat. Gleicher
// Gedanke wie bei den Scheiben. Gibt die Zahl neu angelegter Kettlebells
// zurueck.
async function ensureKettlebells(
  store: SeedStore,
  userId: string,
): Promise<number> {
  if ((await store.zaehleKettlebells()) > 0) return 0;

  const inserts: InventoryKettlebellInsert[] = kettlebellSeeds.map(
    (weight, i) => ({
      user_id: userId,
      weight,
      position: i,
    }),
  );

  await store.insertKettlebells(inserts);
  return inserts.length;
}

// Fuegt fehlende Katalog-Uebungen hinzu, ohne vorhandene zu ueberschreiben, und
// legt zu jeder neu angelegten Uebung ihre Muskel-Zuordnung an. Gibt die Zahl
// neu angelegter Uebungen zurueck.
//
// Nachziehend ueber den Schluessel wie bei Bausteinen und Ausstattung: ein
// Bestandskonto hat die Uebungen bereits, dort passiert nichts. Die
// Muskel-Zeilen entstehen nur zu den gerade angelegten Uebungen - was an einer
// bestehenden Uebung haengt, bleibt unberuehrt.
async function ensureUebungen(
  store: SeedStore,
  userId: string,
  barIdByKey: Map<string, string>,
): Promise<number> {
  const vorhanden = new Set(
    (await store.listUebungen())
      .map((e) => e.key)
      .filter((k): k is string => k !== null),
  );

  const fehlende = exerciseSeeds.filter((e) => !vorhanden.has(e.key));
  if (fehlende.length === 0) return 0;

  // Die Position ergibt sich aus der Reihenfolge in exerciseSeeds, nicht aus
  // dem Index der gefilterten Liste: wer nur einzelne Uebungen nachgereicht
  // bekommt, soll sie an ihrem angestammten Platz im Katalog vorfinden.
  const positionByKey = new Map(exerciseSeeds.map((e, i) => [e.key, i]));

  const inserts: ExerciseInsert[] = fehlende.map((e) => ({
    user_id: userId,
    key: e.key,
    name: e.name,
    profile: e.profile,
    tier: e.tier,
    equipment: e.equipment,
    // Fehlt die Stange (Bestandskonto mit eigener Stangenliste), bleibt der
    // Bezug leer. Der Coach faellt dann auf die Standardstange zurueck, statt
    // dass das Anlegen am Fremdschluessel scheitert.
    bar_id: e.barKey === null ? null : (barIdByKey.get(e.barKey) ?? null),
    description: e.description,
    metric: e.metric,
    muscle_groups: e.muscleGroups,
    rep_range_min: e.repRangeMin,
    rep_range_max: e.repRangeMax,
    work_weight: e.workWeight,
    recovery_hours: e.recoveryHours,
    position: positionByKey.get(e.key) ?? 0,
  }));

  const idByKey = idsNachSchluessel(await store.insertUebungen(inserts));

  const muskelInserts: ExerciseMuscleInsert[] = [];
  for (const e of fehlende) {
    const exerciseId = idByKey.get(e.key);
    if (exerciseId === undefined) {
      throw new Error(`Uebung ohne ID: ${e.key}`);
    }
    for (const m of e.muscles) {
      muskelInserts.push({
        user_id: userId,
        exercise_id: exerciseId,
        region_id: m.regionId,
        kategorie: m.kategorie,
      });
    }
  }

  if (muskelInserts.length > 0) {
    await store.insertUebungsMuskeln(muskelInserts);
  }

  return fehlende.length;
}

async function seedJourneyVorlagen(
  store: SeedStore,
  userId: string,
): Promise<void> {
  const tplInserts: JourneyTemplateInsert[] = journeyTemplateSeeds.map(
    (t, i) => ({
      user_id: userId,
      key: t.key,
      name: t.name,
      tagline: t.tagline,
      for_whom: t.forWhom,
      summary: t.summary,
      position: i,
    }),
  );

  const idByKey = idsNachSchluessel(await store.insertVorlagen(tplInserts));

  const phaseInserts: JourneyTemplatePhaseInsert[] = [];
  for (const t of journeyTemplateSeeds) {
    const tplId = idByKey.get(t.key);
    if (tplId === undefined) {
      throw new Error(`Journey-Vorlage ohne ID: ${t.key}`);
    }
    t.phases.forEach((p, i) => {
      // Die Phase entsteht aus ihrem Baustein: Wochen, Saetze, Band und
      // Entlastung kommen von dort. Was die gebaute Phase darueber hinaus
      // traegt, wird hier bewusst nicht mitgeschrieben - weder der
      // Bauart-Vermerk (Migration 0049) noch die beiden Listen (Migration
      // 0050). Die Vorlagenphase nennt nur ihren Baustein; beides entsteht
      // erst beim Journey-Start aus `phase_types` (lib/journeyWrite.ts).
      const gebaut = buildSeedPhase(p);
      phaseInserts.push({
        user_id: userId,
        journey_template_id: tplId,
        name: gebaut.name,
        focus: gebaut.focus as Focus,
        weeks: gebaut.weeks,
        sets_start: gebaut.setsStart,
        sets_end: gebaut.setsEnd,
        deload_week: gebaut.deloadWeek,
        rep_target_min: gebaut.repTargetMin,
        rep_target_max: gebaut.repTargetMax,
        position: i,
      });
    });
  }

  await store.insertVorlagenPhasen(phaseInserts);
}

async function seedSkills(store: SeedStore, userId: string): Promise<void> {
  const skillInserts: SkillInsert[] = skillSeeds.map((s, i) => ({
    user_id: userId,
    key: s.key,
    name: s.name,
    category: s.category,
    image: s.image,
    position: i,
  }));

  const skillIdByKey = idsNachSchluessel(await store.insertSkills(skillInserts));

  // Alle Phasen in einem Rutsch (Position je Skill als Reihenfolge).
  const phaseInserts: SkillPhaseInsert[] = [];
  for (const s of skillSeeds) {
    const skillId = skillIdByKey.get(s.key);
    if (skillId === undefined) throw new Error(`Skill ohne ID: ${s.key}`);
    s.phases.forEach((p, i) => {
      phaseInserts.push({
        user_id: userId,
        skill_id: skillId,
        label: p.label,
        description: p.description,
        consecutive_sessions: p.consecutiveSessions,
        position: i,
      });
    });
  }

  const phasen = await store.insertSkillPhasen(phaseInserts);

  const phaseIdBy = new Map<string, string>();
  for (const row of phasen) {
    phaseIdBy.set(`${row.skill_id}:${String(row.position)}`, row.id);
  }

  // Katalog-Uebungen des Nutzers einmal lesen, um exercise_id je Phasen-Uebung
  // aus dem exerciseKey des Seeds aufzuloesen. Ohne diese Verknuepfung findet
  // weder der Uebungs-Verlauf die Skill-Saetze noch das Start-Popup die
  // Detailseite. Fehlt eine Katalog-Uebung, bleibt die Zeile ohne Verknuepfung.
  const exerciseIdByKey = idsNachSchluessel(await store.listUebungen());

  const exInserts: SkillPhaseExerciseInsert[] = [];
  const eqInserts: SkillPhaseEquipmentInsert[] = [];
  for (const s of skillSeeds) {
    const skillId = skillIdByKey.get(s.key);
    if (skillId === undefined) continue;
    s.phases.forEach((p, pi) => {
      const phaseId = phaseIdBy.get(`${skillId}:${String(pi)}`);
      if (phaseId === undefined) {
        throw new Error(`Skill-Phase ohne ID: ${s.key}/${String(pi)}`);
      }
      p.exercises.forEach((e, ei) => {
        exInserts.push({
          user_id: userId,
          skill_phase_id: phaseId,
          name: e.name,
          metric: e.metric,
          sets: e.sets,
          target: e.target,
          tempo: e.tempo,
          exercise_id:
            e.exerciseKey === null
              ? null
              : (exerciseIdByKey.get(e.exerciseKey) ?? null),
          position: ei,
        });
      });
      for (const key of p.equipment) {
        eqInserts.push({
          user_id: userId,
          skill_phase_id: phaseId,
          equipment_key: key,
        });
      }
    });
  }

  if (exInserts.length > 0) {
    await store.insertSkillUebungen(exInserts);
  }
  if (eqInserts.length > 0) {
    await store.insertSkillEquipment(eqInserts);
  }
}

/** Zeilen mit Schluessel zu einer Zuordnung Schluessel -> Kennung machen.
 *  Zeilen ohne Schluessel (aelterer Bestand) fallen weg. */
function idsNachSchluessel(
  zeilen: Array<{ id: string; key: string | null }>,
): Map<string, string> {
  const idByKey = new Map<string, string>();
  for (const row of zeilen) {
    if (row.key !== null) idByKey.set(row.key, row.id);
  }
  return idByKey;
}
