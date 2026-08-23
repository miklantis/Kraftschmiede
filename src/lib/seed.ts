// Erstbefuellung der Definitionen (Bausteine, Journey-Vorlagen, Skills) in die
// Datenbank. Idempotent: laeuft nur, wenn noch keine Skills fuer den Nutzer
// existieren. Alles wird mit der user_id des angemeldeten Nutzers angelegt (RLS).

import { supabase } from "@/lib/supabase";
import {
  buildSeedPhase,
  journeyTemplateSeeds,
  seedPhaseLoadFactor,
  phaseTypeSeeds,
  skillSeeds,
  equipmentSeeds,
} from "@/seed/definitions";
import type {
  Focus,
  JourneyTemplateInsert,
  JourneyTemplatePhaseInsert,
  PhaseTypeInsert,
  SkillInsert,
  SkillPhaseInsert,
  SkillPhaseExerciseInsert,
  SkillPhaseEquipmentInsert,
  InventoryEquipmentInsert,
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
  if (definitionsSeeded) {
    await seedJourneyTemplates(userId);
    await seedSkills(userId);
  }

  // Equipment laeuft unabhaengig und idempotent: nur fehlende Standardgeraete
  // werden ergaenzt, bestehende (auch per V1-Import) bleiben unangetastet. So
  // bekommen auch frueher angelegte Nutzer das Skill-Tor-Inventar.
  const equipmentAdded = await ensureEquipmentSeeded(userId);

  // Bausteine ebenso: nur fehlende Schluessel werden ergaenzt. Bestehende Nutzer
  // bekommen sie ueber die Migration, dieser Weg faengt neue Konten und spaeter
  // dazukommende Bausteine ab.
  const phaseTypesAdded = await ensurePhaseTypesSeeded(userId);

  return {
    seeded: definitionsSeeded || equipmentAdded > 0 || phaseTypesAdded > 0,
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
      // Entlastung kommen von dort, die Wochenliste wird zur Wochenzahl gebaut,
      // und der Bauart-Vermerk sagt danach, nach welcher Regel das geschah. Er
      // wandert beim Journey-Start mit und wird zur Laufzeit gelesen (Coach,
      // Anker-Nachfuehrung, Empfehlung).
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
        load_factor: seedPhaseLoadFactor(p),
        week_plan: gebaut.weekPlan,
        plan_builder: gebaut.planBuilder,
        load_builder: gebaut.loadBuilder,
        careful: gebaut.careful,
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
