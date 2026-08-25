// Erstbefuellung der Definitionen (Bausteine, Inventar, Uebungskatalog,
// Journey-Vorlagen, Skills) in die Datenbank. Alles wird mit der user_id des
// angemeldeten Nutzers angelegt (RLS).
//
// Zwei Arten von Erstbefuellung liegen hier nebeneinander:
//   - einmalig: Journey-Vorlagen und Skills entstehen nur, solange der Nutzer
//     noch gar keine Skills hat. Sie sind spaeter bearbeitbar; ein zweiter Lauf
//     duerfte geloeschte oder umbenannte Zeilen nicht wieder herstellen.
//   - nachziehend: Bausteine, Inventar, Uebungskatalog und Ausstattung
//     ergaenzen jeweils nur die fehlenden Schluessel und lassen vorhandene
//     Zeilen unangetastet. So bekommen auch frueher angelegte Konten, was
//     spaeter dazugekommen ist, ohne dass ein zweiter Lauf etwas veraendert.

import { supabase } from "@/lib/supabase";
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
  seeded: boolean;
}

export async function ensureDefinitionsSeeded(
  userId: string,
): Promise<SeedErgebnis> {
  // Sind schon Skills fuer diesen Nutzer vorhanden, gilt als bereits geseedet.
  const { count, error } = await supabase
    .from("skills")
    .select("*", { count: "exact", head: true });
  if (error) {
    throw new Error(`Pruefung des Datenstands fehlgeschlagen: ${error.message}`);
  }
  const definitionsSeeded = (count ?? 0) === 0;

  // Bausteine zuerst, und zwar zwingend: seit Migration 0048 zeigt der Fokus
  // jeder Vorlagenphase per Fremdschluessel auf den Baustein desselben Nutzers.
  // Fehlt er, scheitert das Anlegen der Vorlagen. Idempotent - nur fehlende
  // Schluessel werden ergaenzt, bestehende Zeilen bleiben unangetastet.
  const phaseTypesAdded = await ensurePhaseTypesSeeded(userId);

  // Inventar vor dem Uebungskatalog, und zwar zwingend: jede
  // Langhantel-Uebung zeigt per bar_id auf eine Stange desselben Nutzers.
  // Ohne Stangen bliebe der halbe Katalog ohne Last-Bezug.
  const barIdByKey = await ensureBarsSeeded(userId);
  const platesAdded = await ensurePlatesSeeded(userId);
  const kettlebellsAdded = await ensureKettlebellsSeeded(userId);

  // Uebungskatalog vor den Skills, und zwar zwingend: seedSkills loest
  // exercise_id ueber den Schluessel aus dem Katalog auf. Fehlt der Katalog,
  // bleiben alle Skill-Phasen-Uebungen ohne Verknuepfung (Issue #393).
  const exercisesAdded = await ensureExercisesSeeded(userId, barIdByKey);

  if (definitionsSeeded) {
    await seedJourneyTemplates(userId);
    await seedSkills(userId);
  }

  // Equipment laeuft unabhaengig und idempotent: nur fehlende Standardgeraete
  // werden ergaenzt, bestehende (auch per V1-Import) bleiben unangetastet. So
  // bekommen auch frueher angelegte Nutzer das Skill-Tor-Inventar.
  const equipmentAdded = await ensureEquipmentSeeded(userId);

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
async function ensurePhaseTypesSeeded(userId: string): Promise<number> {
  const { data, error } = await supabase.from("phase_types").select("key");
  if (error) {
    throw new Error(`Bausteine pruefen fehlgeschlagen: ${error.message}`);
  }
  const vorhanden = new Set(
    ((data ?? []) as Array<{ key: string }>).map((b) => b.key),
  );

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

  const { error: insError } = await supabase
    .from("phase_types")
    .insert(fehlende);
  if (insError) {
    throw new Error(`Bausteine anlegen fehlgeschlagen: ${insError.message}`);
  }
  return fehlende.length;
}

// Fuegt fehlende Standardgeraete hinzu, ohne vorhandene zu ueberschreiben.
// Gibt die Zahl neu angelegter Geraete zurueck.
async function ensureEquipmentSeeded(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("inventory_equipment")
    .select("key");
  if (error) {
    throw new Error(`Equipment pruefen fehlgeschlagen: ${error.message}`);
  }
  const vorhanden = new Set(
    ((data ?? []) as Array<{ key: string }>).map((e) => e.key),
  );

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

  const { error: insError } = await supabase
    .from("inventory_equipment")
    .insert(fehlende);
  if (insError) {
    throw new Error(`Equipment anlegen fehlgeschlagen: ${insError.message}`);
  }
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
async function ensureBarsSeeded(
  userId: string,
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("inventory_bars")
    .select("id, key")
    .returns<Array<{ id: string; key: string | null }>>();
  if (error) {
    throw new Error(`Stangen pruefen fehlgeschlagen: ${error.message}`);
  }

  const vorhanden = data ?? [];
  if (vorhanden.length > 0) {
    const idByKey = new Map<string, string>();
    for (const row of vorhanden) {
      if (row.key !== null) idByKey.set(row.key, row.id);
    }
    return idByKey;
  }

  const inserts: InventoryBarInsert[] = barSeeds.map((b, i) => ({
    user_id: userId,
    key: b.key,
    name: b.name,
    weight: b.weight,
    is_default: b.isDefault,
    position: i,
  }));

  const { data: angelegt, error: insError } = await supabase
    .from("inventory_bars")
    .insert(inserts)
    .select("id, key")
    .returns<Array<{ id: string; key: string | null }>>();
  if (insError) {
    throw new Error(`Stangen anlegen fehlgeschlagen: ${insError.message}`);
  }
  if (angelegt === null) {
    throw new Error("Stangen: keine IDs zurueckgegeben.");
  }

  const idByKey = new Map<string, string>();
  for (const row of angelegt) {
    if (row.key !== null) idByKey.set(row.key, row.id);
  }
  return idByKey;
}

// Legt die Standard-Scheiben an, falls der Nutzer noch keine hat. Gleicher
// Gedanke wie bei den Stangen: Scheiben haben keinen Schluessel, sondern nur
// ein Gewicht, und sie sind in den Einstellungen loeschbar. Ein Nachziehen
// ueber das Gewicht wuerde eine geloeschte Scheibe beim naechsten Start wieder
// hinstellen. Gibt die Zahl neu angelegter Scheiben zurueck.
async function ensurePlatesSeeded(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("inventory_plates")
    .select("*", { count: "exact", head: true });
  if (error) {
    throw new Error(`Scheiben pruefen fehlgeschlagen: ${error.message}`);
  }
  if ((count ?? 0) > 0) return 0;

  const inserts: InventoryPlateInsert[] = plateSeeds.map((weight, i) => ({
    user_id: userId,
    weight,
    position: i,
  }));

  const { error: insError } = await supabase
    .from("inventory_plates")
    .insert(inserts);
  if (insError) {
    throw new Error(`Scheiben anlegen fehlgeschlagen: ${insError.message}`);
  }
  return inserts.length;
}

// Legt die Standard-Kettlebells an, falls der Nutzer noch keine hat. Gleicher
// Gedanke wie bei den Scheiben. Gibt die Zahl neu angelegter Kettlebells
// zurueck.
async function ensureKettlebellsSeeded(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("inventory_kettlebells")
    .select("*", { count: "exact", head: true });
  if (error) {
    throw new Error(`Kettlebells pruefen fehlgeschlagen: ${error.message}`);
  }
  if ((count ?? 0) > 0) return 0;

  const inserts: InventoryKettlebellInsert[] = kettlebellSeeds.map(
    (weight, i) => ({
      user_id: userId,
      weight,
      position: i,
    }),
  );

  const { error: insError } = await supabase
    .from("inventory_kettlebells")
    .insert(inserts);
  if (insError) {
    throw new Error(`Kettlebells anlegen fehlgeschlagen: ${insError.message}`);
  }
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
async function ensureExercisesSeeded(
  userId: string,
  barIdByKey: Map<string, string>,
): Promise<number> {
  const { data, error } = await supabase.from("exercises").select("key");
  if (error) {
    throw new Error(`Uebungskatalog pruefen fehlgeschlagen: ${error.message}`);
  }
  const vorhanden = new Set(
    ((data ?? []) as Array<{ key: string | null }>)
      .map((e) => e.key)
      .filter((k): k is string => k !== null),
  );

  const fehlende = exerciseSeeds.filter((e) => !vorhanden.has(e.key));
  if (fehlende.length === 0) return 0;

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
    position: e.position,
  }));

  const { data: angelegt, error: insError } = await supabase
    .from("exercises")
    .insert(inserts)
    .select("id, key")
    .returns<Array<{ id: string; key: string | null }>>();
  if (insError) {
    throw new Error(`Uebungen anlegen fehlgeschlagen: ${insError.message}`);
  }
  if (angelegt === null) {
    throw new Error("Uebungen: keine IDs zurueckgegeben.");
  }

  const idByKey = new Map<string, string>();
  for (const row of angelegt) {
    if (row.key !== null) idByKey.set(row.key, row.id);
  }

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
    const { error: muskelError } = await supabase
      .from("exercise_muscles")
      .insert(muskelInserts);
    if (muskelError) {
      throw new Error(
        `Muskel-Zuordnung anlegen fehlgeschlagen: ${muskelError.message}`,
      );
    }
  }

  return fehlende.length;
}

async function seedJourneyTemplates(userId: string): Promise<void> {
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

  const { data: tpls, error } = await supabase
    .from("journey_templates")
    .insert(tplInserts)
    .select("id, key")
    .returns<Array<{ id: string; key: string | null }>>();
  if (error) {
    throw new Error(`Journey-Vorlagen anlegen fehlgeschlagen: ${error.message}`);
  }
  if (tpls === null) {
    throw new Error("Journey-Vorlagen: keine IDs zurueckgegeben.");
  }

  const idByKey = new Map<string, string>();
  for (const row of tpls) {
    if (row.key !== null) idByKey.set(row.key, row.id);
  }

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

  const { error: phaseError } = await supabase
    .from("journey_template_phases")
    .insert(phaseInserts);
  if (phaseError) {
    throw new Error(`Vorlagen-Phasen anlegen fehlgeschlagen: ${phaseError.message}`);
  }
}

async function seedSkills(userId: string): Promise<void> {
  const skillInserts: SkillInsert[] = skillSeeds.map((s, i) => ({
    user_id: userId,
    key: s.key,
    name: s.name,
    category: s.category,
    image: s.image,
    position: i,
  }));

  const { data: skills, error } = await supabase
    .from("skills")
    .insert(skillInserts)
    .select("id, key")
    .returns<Array<{ id: string; key: string | null }>>();
  if (error) {
    throw new Error(`Skills anlegen fehlgeschlagen: ${error.message}`);
  }
  if (skills === null) {
    throw new Error("Skills: keine IDs zurueckgegeben.");
  }

  const skillIdByKey = new Map<string, string>();
  for (const row of skills) {
    if (row.key !== null) skillIdByKey.set(row.key, row.id);
  }

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

  const { data: phases, error: phaseError } = await supabase
    .from("skill_phases")
    .insert(phaseInserts)
    .select("id, skill_id, position")
    .returns<Array<{ id: string; skill_id: string; position: number }>>();
  if (phaseError) {
    throw new Error(`Skill-Phasen anlegen fehlgeschlagen: ${phaseError.message}`);
  }
  if (phases === null) {
    throw new Error("Skill-Phasen: keine IDs zurueckgegeben.");
  }

  const phaseIdBy = new Map<string, string>();
  for (const row of phases) {
    phaseIdBy.set(`${row.skill_id}:${String(row.position)}`, row.id);
  }

  // Katalog-Uebungen des Nutzers einmal lesen, um exercise_id je Phasen-Uebung
  // aus dem exerciseKey des Seeds aufzuloesen. Ohne diese Verknuepfung findet
  // weder der Uebungs-Verlauf die Skill-Saetze noch das Start-Popup die
  // Detailseite. Fehlt eine Katalog-Uebung, bleibt die Zeile ohne Verknuepfung.
  const { data: catalog, error: catalogError } = await supabase
    .from("exercises")
    .select("id, key")
    .returns<Array<{ id: string; key: string | null }>>();
  if (catalogError) {
    throw new Error(`Uebungskatalog lesen fehlgeschlagen: ${catalogError.message}`);
  }
  const exerciseIdByKey = new Map<string, string>();
  for (const row of catalog ?? []) {
    if (row.key !== null) exerciseIdByKey.set(row.key, row.id);
  }

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
    const { error: exError } = await supabase
      .from("skill_phase_exercises")
      .insert(exInserts);
    if (exError) {
      throw new Error(`Skill-Uebungen anlegen fehlgeschlagen: ${exError.message}`);
    }
  }
  if (eqInserts.length > 0) {
    const { error: eqError } = await supabase
      .from("skill_phase_equipment")
      .insert(eqInserts);
    if (eqError) {
      throw new Error(`Skill-Equipment anlegen fehlgeschlagen: ${eqError.message}`);
    }
  }
}
