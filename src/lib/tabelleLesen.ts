// Naht zur Leseseite der Datenbank: die schmale Schnittstelle, ueber die alle
// Lese-Hooks ihre Abfragen abspielen. Das Gegenstueck zu den Schreib-Speichern
// (zeitraumStore, journeyStore, ...) – dieselbe Bauform, nur fuer das Lesen:
// eine Beschreibung der Abfrage geht rein, Zeilen kommen raus, und die Regel
// "Fehler wird zu einem Error" steht an genau einer Stelle statt zwanzigmal.
//
// Zwei Gesichter: der echte Supabase-Leser im Betrieb und ein Leser aus dem
// Arbeitsspeicher fuer Tests. Unterste Schicht: kennt nur Supabase, niemals die
// Hooks darueber. Die Umformung der Zeilen (verschachtelte Auswahl auspacken,
// Ansichten ableiten) bleibt bewusst beim jeweiligen Hook – die Grundlage nimmt
// ihm nur den wiederkehrenden Teil ab.

import { supabase } from "@/lib/supabase";

/** Eine Sortierstufe. Ohne `absteigend` wird aufsteigend sortiert – dieselbe
 *  Voreinstellung wie bei Supabase (`ascending: true`). */
export interface LeseSortierung {
  spalte: string;
  absteigend?: boolean;
}

/** Beschreibung einer Abfrage: welche Tabelle, welche Spalten, welche
 *  Gleichheits-Filter, welche Sortierung, wie viele Zeilen hoechstens.
 *  Die Nutzer-Kennung steht bewusst nicht drin: RLS scope't jede Tabelle
 *  ohnehin auf den angemeldeten Nutzer, die Kennung traegt nur der Query-Key
 *  (siehe queryKeys.ts). */
export interface LeseAbfrage {
  tabelle: string;
  /** Spaltenauswahl in Supabase-Schreibweise. Voreinstellung: alle Spalten. */
  spalten?: string;
  /** Gleichheits-Filter, alle miteinander verundet. */
  gleich?: Record<string, string | number | boolean>;
  sortierung?: LeseSortierung[];
  grenze?: number;
}

/** Schmale Schnittstelle fuer alle Lesevorgaenge. `zeilen` liefert eine Liste,
 *  `zeile` hoechstens einen Treffer (leer ergibt `null`, nie einen Fehler). */
export interface TabellenLeser {
  zeilen<T>(abfrage: LeseAbfrage): Promise<T[]>;
  zeile<T>(abfrage: LeseAbfrage): Promise<T | null>;
}

// --- Echter Leser (Betrieb): Supabase ---

/** Baut die Supabase-Kette in der Reihenfolge auf, die die Hooks bisher von
 *  Hand geschrieben haben: auswaehlen, filtern, sortieren, begrenzen. */
function baueKette(abfrage: LeseAbfrage) {
  let kette = supabase.from(abfrage.tabelle).select(abfrage.spalten ?? "*");
  for (const [spalte, wert] of Object.entries(abfrage.gleich ?? {})) {
    kette = kette.eq(spalte, wert);
  }
  for (const stufe of abfrage.sortierung ?? []) {
    kette = kette.order(stufe.spalte, { ascending: stufe.absteigend !== true });
  }
  if (abfrage.grenze !== undefined) {
    kette = kette.limit(abfrage.grenze);
  }
  return kette;
}

export const supabaseTabellenLeser: TabellenLeser = {
  async zeilen<T>(abfrage: LeseAbfrage): Promise<T[]> {
    const { data, error } = await baueKette(abfrage);
    if (error) throw new Error(error.message);
    return (data ?? []) as T[];
  },
  async zeile<T>(abfrage: LeseAbfrage): Promise<T | null> {
    const { data, error } = await baueKette(abfrage).maybeSingle();
    if (error) throw new Error(error.message);
    return (data as T | null) ?? null;
  },
};

// --- Bequemer Zugriff fuer die Hooks ---

/** Liest eine Liste ueber den Betriebs-Leser. Die Form, die die Lese-Hooks
 *  benutzen – sie sollen den Leser nicht selbst durchreichen muessen. */
export function leseZeilen<T>(abfrage: LeseAbfrage): Promise<T[]> {
  return supabaseTabellenLeser.zeilen<T>(abfrage);
}

/** Liest hoechstens eine Zeile ueber den Betriebs-Leser. */
export function leseZeile<T>(abfrage: LeseAbfrage): Promise<T | null> {
  return supabaseTabellenLeser.zeile<T>(abfrage);
}

// --- Leser aus dem Arbeitsspeicher (nur Tests) ---

/** Tabellen-Inhalte fuer den Test-Leser: Tabellenname auf Zeilen. */
export type SpeicherTabellen = Record<string, Array<Record<string, unknown>>>;

/** Protokoll der ueber den Test-Leser gelaufenen Abfragen – so laesst sich
 *  pruefen, welche Tabelle mit welcher Sortierung gelesen wurde. */
export interface SpeicherLeseLog {
  abfragen: LeseAbfrage[];
}

/** Vergleicht zwei Werte fuer die Sortierung. Zahlen numerisch, alles andere
 *  als Text; `null`/`undefined` wandern ans Ende. */
function vergleiche(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a) < String(b) ? -1 : 1;
}

/** Erzeugt einen Leser, der aus vorgegebenen Tabellen im Arbeitsspeicher
 *  bedient und jede Abfrage protokolliert – fuer Tests ohne echte Datenbank.
 *  Mit `fehler` laesst sich der Fehlerfall pruefen. */
export function createMemoryTabellenLeser(
  tabellen: SpeicherTabellen = {},
  fehler?: string,
): { leser: TabellenLeser; log: SpeicherLeseLog } {
  const log: SpeicherLeseLog = { abfragen: [] };

  function auswerten(abfrage: LeseAbfrage): Array<Record<string, unknown>> {
    log.abfragen.push(abfrage);
    if (fehler !== undefined) throw new Error(fehler);
    let zeilen = (tabellen[abfrage.tabelle] ?? []).slice();
    for (const [spalte, wert] of Object.entries(abfrage.gleich ?? {})) {
      zeilen = zeilen.filter((zeile) => zeile[spalte] === wert);
    }
    for (const stufe of (abfrage.sortierung ?? []).slice().reverse()) {
      zeilen.sort((a, b) => {
        const r = vergleiche(a[stufe.spalte], b[stufe.spalte]);
        return stufe.absteigend === true ? -r : r;
      });
    }
    if (abfrage.grenze !== undefined) zeilen = zeilen.slice(0, abfrage.grenze);
    return zeilen;
  }

  const leser: TabellenLeser = {
    async zeilen<T>(abfrage: LeseAbfrage): Promise<T[]> {
      return auswerten(abfrage) as T[];
    },
    async zeile<T>(abfrage: LeseAbfrage): Promise<T | null> {
      const treffer = auswerten(abfrage);
      return (treffer[0] as T | undefined) ?? null;
    },
  };

  return { leser, log };
}
