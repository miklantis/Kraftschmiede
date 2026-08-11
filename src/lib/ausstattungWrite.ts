// Schreib-Baustein der Ausstattung: die Aktionen des Inventars (Scheibe,
// Kettlebell, Kurzhantel anlegen und loeschen, Equipment-Tor umlegen) und die
// Aenderung der Einstellungen als duenne Folge ueber der Naht
// AusstattungStore. Hier liegen die Absicht-zu-Handgriff-Zuordnung und die
// Anmeldepruefung – an einem Ort. Das eigentliche Schreiben und Fehlerwerfen
// macht der uebergebene Speicher.
//
// Haengt nur an der Naht (Typ AusstattungStore) und an den Schema-Typen, kennt
// Supabase nicht. Dadurch mit einem Speicher im Arbeitsspeicher pruefbar.
//
// Zur Position: Scheiben, Kettlebells und Kurzhanteln werden in der Anzeige
// nach Gewicht sortiert, deshalb wird die Position bewusst nicht gesetzt und
// bleibt beim Standard der Datenbank.

import type {
  AusstattungStore,
  EinstellungenPatch,
} from "./ausstattungStore";

export type { EinstellungenPatch };

/** Was der Nutzer will – der Hook traegt nur noch die Absicht herein. */
export type AusstattungAction =
  | { type: "addScheibe"; gewicht: number }
  | { type: "deleteScheibe"; id: string }
  | { type: "addKettlebell"; gewicht: number }
  | { type: "deleteKettlebell"; id: string }
  | { type: "addKurzhantel"; gewicht: number }
  | { type: "deleteKurzhantel"; id: string }
  | { type: "toggleEquipment"; key: string; aktiv: boolean }
  | { type: "updateEinstellungen"; patch: EinstellungenPatch };

/** Eine Ausstattungs-Aktion abspielen: Absicht herein, Handgriffe auf den
 *  Speicher heraus. Ohne angemeldeten Nutzer wird nichts geschrieben – auch
 *  nicht bei den Aktionen, die die Nutzer-Kennung nicht selbst mitschreiben,
 *  weil sie sonst auf fremde Zeilen zielen koennten. */
export async function writeAusstattungAction(
  store: AusstattungStore,
  userId: string | null,
  action: AusstattungAction,
): Promise<void> {
  if (userId === null) throw new Error("Nicht angemeldet.");

  switch (action.type) {
    case "addScheibe":
      await store.insertScheibe({ user_id: userId, weight: action.gewicht });
      return;
    case "deleteScheibe":
      await store.deleteScheibe(action.id);
      return;
    case "addKettlebell":
      await store.insertKettlebell({ user_id: userId, weight: action.gewicht });
      return;
    case "deleteKettlebell":
      await store.deleteKettlebell(action.id);
      return;
    case "addKurzhantel":
      await store.insertKurzhantel({ user_id: userId, weight: action.gewicht });
      return;
    case "deleteKurzhantel":
      await store.deleteKurzhantel(action.id);
      return;
    case "toggleEquipment":
      await store.setEquipmentAktiv(action.key, action.aktiv);
      return;
    case "updateEinstellungen":
      await store.updateEinstellungen(userId, action.patch);
      return;
  }
}
