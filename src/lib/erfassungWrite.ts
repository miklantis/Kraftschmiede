// Schreib-Baustein der Erfassungen: Befinden eintragen, Yoga-Einheit anlegen,
// Einheit loeschen und die manuellen Eingriffe in den Skill-Fortschritt (Phase
// zurueck, zuruecksetzen) als duenne Folgen ueber der Naht ErfassungStore. Hier
// liegen die Absicht-zu-Handgriff-Zuordnung, die Umbenennung der Formularfelder
// auf die Datenbank-Spalten und die Anmeldepruefung – an einem Ort. Das
// eigentliche Schreiben und Fehlerwerfen macht der uebergebene Speicher.
//
// Haengt nur an der Naht (Typ ErfassungStore) und an den Schema-Typen, kennt
// Supabase nicht. Dadurch mit einem Speicher im Arbeitsspeicher pruefbar. Das
// heutige Datum kommt von aussen herein (`heute`), damit der Ablauf ohne Uhr
// pruefbar bleibt.

import type {
  ErfassungStore,
  SkillFortschrittPatch,
} from "./erfassungStore";
import type { SkillLog } from "@/schemas";

/** Die Felder des Befinden-Formulars. Der Schmerz-Vermerk (pain_note) wird von
 *  der Oberflaeche nicht gefuehrt und bleibt leer. */
export interface BefindenFelder {
  legs: number;
  upper_body: number;
  overall: number;
  readiness: number;
  pain_flag: boolean;
  notes: string;
}

/** Was der Nutzer will – der Hook traegt nur noch die Absicht herein. */
export type ErfassungAction =
  | { type: "befinden"; felder: BefindenFelder }
  | { type: "addYoga"; datum: string; minuten: number }
  | { type: "deleteEinheit"; id: string }
  | { type: "skillRegress"; skillId: string }
  | { type: "skillReset"; skillId: string };

/** Einen Eintrag an die Versuchshistorie eines Skills anhaengen. Die bisherige
 *  Historie bleibt unangetastet, der neue Eintrag traegt das heutige Datum. */
function appendLog(
  bisher: SkillLog,
  heute: string,
  entry: Record<string, unknown>,
): SkillLog {
  return [...bisher, { date: heute, ...entry }];
}

/** Eine Erfassungs-Aktion abspielen: Absicht herein, Handgriffe auf den
 *  Speicher heraus. Ohne angemeldeten Nutzer wird nichts geschrieben. Die
 *  Skill-Eingriffe laufen ins Leere, wenn es noch keinen Fortschritt gibt – die
 *  Zeile entsteht erst mit der ersten abgeschlossenen Skill-Einheit. */
export async function writeErfassungAction(
  store: ErfassungStore,
  userId: string | null,
  heute: string,
  action: ErfassungAction,
): Promise<void> {
  if (userId === null) throw new Error("Nicht angemeldet.");

  switch (action.type) {
    case "befinden": {
      await store.upsertBefinden({
        user_id: userId,
        date: heute,
        legs: action.felder.legs,
        upper_body: action.felder.upper_body,
        overall: action.felder.overall,
        readiness: action.felder.readiness,
        pain_flag: action.felder.pain_flag,
        pain_note: "",
        notes: action.felder.notes,
      });
      return;
    }
    case "addYoga": {
      await store.insertEinheit({
        user_id: userId,
        date: action.datum,
        type: "yoga",
        status: "done",
        minutes: action.minuten,
        notes: "",
      });
      return;
    }
    case "deleteEinheit": {
      await store.deleteEinheit(action.id);
      return;
    }
    case "skillRegress": {
      const prog = await store.findSkillFortschritt(action.skillId);
      if (!prog) return;
      const to = Math.max(0, prog.current_phase - 1);
      const patch: SkillFortschrittPatch = {
        current_phase: to,
        counter: 0,
        mastered: false,
        log: appendLog(prog.log, heute, {
          type: "regress",
          from: prog.current_phase,
          to,
        }),
      };
      await store.updateSkillFortschritt(prog.id, patch);
      return;
    }
    case "skillReset": {
      const prog = await store.findSkillFortschritt(action.skillId);
      if (!prog) return;
      const patch: SkillFortschrittPatch = {
        current_phase: 0,
        counter: 0,
        mastered: false,
        log: appendLog(prog.log, heute, {
          type: "reset",
          from: prog.current_phase,
        }),
      };
      await store.updateSkillFortschritt(prog.id, patch);
      return;
    }
  }
}
