// Schreib-Baustein der Koerpermessungen und ihrer Meilensteine: die Aktionen
// beider Bereiche (jeweils anlegen, aendern, loeschen) als duenne Folgen ueber
// der Naht CompositionStore. Hier liegen die Absicht-zu-Handgriff-Zuordnung, die
// Trennung von Datum und Werten und die Anmeldepruefung – an einem Ort. Das
// eigentliche Schreiben und Fehlerwerfen macht der uebergebene Speicher.
//
// Haengt nur an der Naht (Typ CompositionStore) und an den Schema-Typen, kennt
// Supabase nicht. Dadurch mit einem Speicher im Arbeitsspeicher pruefbar.
//
// Zum Ueberschreib-Verhalten der Messungen: es gilt ein Eintrag pro Tag
// (unique user_id,date). Gespeichert wird immer der volle Satz Werte – ein leer
// geraeumtes Feld kommt als null herein und entfernt den Wert bewusst.

import type {
  CompositionStore,
  MessungPatch,
  MessungRowIns,
  MeilensteinRowIns,
} from "./compositionStore";

/** Die Felder einer Messung, wie sie das Formular fuehrt: Datum plus die
 *  Werte-Spalten, alle einzeln leerbar. */
export interface CompositionFelder {
  date: string;
  weight: number | null;
  body_fat_kg: number | null;
  body_fat_pct: number | null;
  skeletal_muscle_kg: number | null;
  muscle_mass_kg: number | null;
  tbw_kg: number | null;
  ecw_kg: number | null;
  icw_kg: number | null;
  phase_angle: number | null;
  visceral_fat: number | null;
  bmr_kcal: number | null;
}

/** Was der Nutzer mit einer Messung will. */
export type CompositionAction =
  | { type: "add"; felder: CompositionFelder }
  | { type: "update"; id: string; felder: CompositionFelder }
  | { type: "delete"; id: string };

/** Was der Nutzer mit einem Mess-Meilenstein will. Die Metrik steht nur beim
 *  Anlegen fest, geaendert werden nur Name und Zielwert. */
export type CompositionMilestoneAction =
  | { type: "add"; metric: string; name: string; target: number }
  | { type: "update"; id: string; name: string; target: number }
  | { type: "delete"; id: string };

/** Formularfelder auf die Datenbank-Spalten abbilden. Eine Stelle fuer Anlegen
 *  und Aendern, damit beide denselben vollen Satz Felder schreiben. */
function felderToPatch(felder: CompositionFelder): MessungPatch {
  return {
    date: felder.date,
    weight: felder.weight,
    body_fat_kg: felder.body_fat_kg,
    body_fat_pct: felder.body_fat_pct,
    skeletal_muscle_kg: felder.skeletal_muscle_kg,
    muscle_mass_kg: felder.muscle_mass_kg,
    tbw_kg: felder.tbw_kg,
    ecw_kg: felder.ecw_kg,
    icw_kg: felder.icw_kg,
    phase_angle: felder.phase_angle,
    visceral_fat: felder.visceral_fat,
    bmr_kcal: felder.bmr_kcal,
  };
}

/** Eine Messungs-Aktion abspielen: Absicht herein, Handgriffe auf den Speicher
 *  heraus. Ohne angemeldeten Nutzer wird nichts geschrieben. */
export async function writeCompositionAction(
  store: CompositionStore,
  userId: string | null,
  action: CompositionAction,
): Promise<void> {
  if (userId === null) throw new Error("Nicht angemeldet.");

  if (action.type === "add") {
    const row: MessungRowIns = {
      user_id: userId,
      ...felderToPatch(action.felder),
    };
    await store.insertMessung(row);
    return;
  }

  if (action.type === "update") {
    await store.updateMessung(action.id, felderToPatch(action.felder));
    return;
  }

  await store.deleteMessung(action.id);
}

/** Eine Meilenstein-Aktion abspielen. Gleiche Form wie bei den Messungen, damit
 *  beide Bereiche sich gleich lesen. */
export async function writeCompositionMilestoneAction(
  store: CompositionStore,
  userId: string | null,
  action: CompositionMilestoneAction,
): Promise<void> {
  if (userId === null) throw new Error("Nicht angemeldet.");

  if (action.type === "add") {
    const row: MeilensteinRowIns = {
      user_id: userId,
      metric: action.metric,
      name: action.name,
      target: action.target,
    };
    await store.insertMeilenstein(row);
    return;
  }

  if (action.type === "update") {
    await store.updateMeilenstein(action.id, {
      name: action.name,
      target: action.target,
    });
    return;
  }

  await store.deleteMeilenstein(action.id);
}
