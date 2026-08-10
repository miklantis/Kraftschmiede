// Schreib-Baustein der Zeitraeume: die drei Aktionen (anlegen, aendern,
// loeschen) als duenne Folge ueber der Naht ZeitraumStore. Hier liegen die
// Absicht-zu-Handgriff-Zuordnung, die Umbenennung der Formularfelder auf die
// Datenbank-Spalten und die Anmeldepruefung – an einem Ort. Das eigentliche
// Schreiben und Fehlerwerfen macht der uebergebene Speicher.
//
// Haengt nur an der Naht (Typ ZeitraumStore) und an den Schema-Typen, kennt
// Supabase nicht. Dadurch mit einem Speicher im Arbeitsspeicher pruefbar.

import type {
  ZeitraumPatch,
  ZeitraumRowIns,
  ZeitraumStore,
} from "./zeitraumStore";
import type { ZeitraumTyp } from "@/schemas";

/** Die Felder, wie sie das Formular fuehrt (deutsche Domaenensprache). */
export interface ZeitraumFelder {
  typ: ZeitraumTyp;
  startDatum: string;
  endDatum: string | null;
  name: string | null;
  notiz: string | null;
}

/** Was der Nutzer will – der Hook traegt nur noch die Absicht herein. */
export type ZeitraumAction =
  | { type: "add"; felder: ZeitraumFelder }
  | { type: "update"; id: string; felder: ZeitraumFelder }
  | { type: "delete"; id: string };

/** Formularfelder auf die Datenbank-Spalten abbilden. Eine Stelle fuer Anlegen
 *  und Aendern, damit beide dieselben Felder schreiben. */
function felderToPatch(felder: ZeitraumFelder): ZeitraumPatch {
  return {
    typ: felder.typ,
    start_datum: felder.startDatum,
    end_datum: felder.endDatum,
    name: felder.name,
    notiz: felder.notiz,
  };
}

/** Eine Zeitraum-Aktion abspielen: Absicht herein, Handgriffe auf den Speicher
 *  heraus. Ohne angemeldeten Nutzer wird nichts geschrieben. */
export async function writeZeitraumAction(
  store: ZeitraumStore,
  userId: string | null,
  action: ZeitraumAction,
): Promise<void> {
  if (userId === null) throw new Error("Nicht angemeldet.");

  if (action.type === "add") {
    const row: ZeitraumRowIns = {
      user_id: userId,
      ...felderToPatch(action.felder),
    };
    await store.insertZeitraum(row);
    return;
  }

  if (action.type === "update") {
    await store.updateZeitraum(action.id, felderToPatch(action.felder));
    return;
  }

  await store.deleteZeitraum(action.id);
}
