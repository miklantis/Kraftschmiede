import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";

// Schluessel, unter dem der gesamte Query-Cache in der Browser-Datenbank
// (IndexedDB) abgelegt wird.
const CACHE_SCHLUESSEL = "kraftschmiede-query-cache";

// Versionsmarke des gespeicherten Caches. Aendert sich diese Marke (z.B. bei
// einer Schema-Aenderung), wird ein alter gespeicherter Stand beim Laden
// automatisch verworfen, damit nichts Veraltetes haengenbleibt.
// v2: Skill-Definitionen tragen jetzt Uebungsname + Tempo (Phase 11 L5) - der
//     alte gecachte Stand ohne diese Felder muss verworfen werden.
// v3: journey_workouts wurde kurzzeitig als Set gecacht und zerfiel im
//     JSON-Persister zu {}; dieser kaputte Stand muss einmalig verworfen werden.
export const CACHE_BUSTER = "v3";

// Wie lange ein gespeicherter Stand hoechstens gueltig ist, bevor er beim
// Laden verworfen wird. Korrespondiert mit gcTime im queryClient.
export const CACHE_MAX_ALTER_MS = 1000 * 60 * 60 * 24 * 7; // 7 Tage

// Persister auf Basis von IndexedDB – robuster und groesser als der einfache
// Standardspeicher des Browsers. idb-keyval liefert die schlanke
// get/set/del-Schnittstelle, die der Async-Storage-Persister erwartet.
export const offlinePersister = createAsyncStoragePersister({
  key: CACHE_SCHLUESSEL,
  storage: {
    getItem: (key: string) => get<string>(key),
    setItem: (key: string, value: string) => set(key, value),
    removeItem: (key: string) => del(key),
  },
});
