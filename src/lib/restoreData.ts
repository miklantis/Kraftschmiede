// Reine, DOM-/Supabase-freie Pruefung und Aufbereitung eines eigenen Exports
// fuer das Voll-Restore: nimmt einen EIGENEN Kraftschmiede-Export (app +
// schemaVersion "v2" oder "v3"), entschachtelt die Einheiten wieder in die
// flachen Tabellen (sessions/session_exercises/sets) und liefert pro Tabelle
// eine Zeilenliste plus eine kleine Vorschau (Anzahlen).
//
// Validierung mit Zod nur auf der Huelle. Die Zeilen selbst werden zum Schluss
// auf die heute bekannten Spalten eingedampft (`bestandsSpalten.ts`): eine
// Sicherung haelt den Stand von damals fest, und ein Feld, das es inzwischen
// nicht mehr gibt, wuerde das Einspielen abbrechen lassen. Damit erledigt sich
// zugleich, was frueher von Hand abgeraeumt wurde - die abgeleiteten
// Satz-Felder (rir/rpe/scoreLabel) und die alte Rolle in template_exercises.
// Werte bleiben unangetastet, ids und Fremdschluessel auch, damit die
// Beziehungen halten; user_id setzt spaeter der Schreiber.
//
// Was echtes Umrechnen braucht (aus alten Feldern neue ableiten), steht in
// UMBAU und laeuft vor dem Eindampfen - sonst waeren die alten Felder schon
// weg.
//
// Welche Tabellen dazugehoeren, steht im Bestandsregister - hier wird nur noch
// darueber gelaufen.

import { z } from "zod";
import type { Row } from "@/lib/exportData";
import {
  BESTANDSREGISTER,
  type EinzelTabelle,
  type ListenTabelle,
} from "@/lib/bestandsregister";
import { aufBekannteSpalten } from "@/lib/bestandsSpalten";

// Zeilen je Tabelle, Feldliste aus dem Bestandsregister abgeleitet.
export type RestoreTables = Record<ListenTabelle, Row[]> &
  Record<EinzelTabelle, Row | null>;

export interface RestorePreview {
  sessions: number;
  sets: number;
  journeys: number;
  exercises: number;
}

export interface RestoreResult {
  tables: RestoreTables;
  preview: RestorePreview;
}

const zRow = z.record(z.string(), z.unknown());
const zEntry = z.looseObject({ sets: z.array(zRow).optional() });
const zSession = z.looseObject({ entries: z.array(zEntry).optional() });

// Huellen-Schema aus dem Register aufgebaut: nur Struktur, keine Spalten-Tiefe
// (sonst wuerde ein gueltiger Export an Detailregeln scheitern). app +
// schemaVersion sind die harte Schranke. Jeder Schluessel ist optional - aeltere
// Sicherungen kennen spaeter dazugekommene Tabellen nicht, deren Liste bleibt
// dann leer.
const inventarHuelle: Record<string, z.ZodType> = {};
const listenHuelle: Record<string, z.ZodType> = {};
for (const e of BESTANDSREGISTER) {
  if (e.ablage === "in_einheit") continue; // steckt in den Einheiten
  if (e.ablage === "inventar") {
    inventarHuelle[e.key] = z.array(zRow).optional();
  } else if (e.ablage === "einheiten") {
    listenHuelle[e.key] = z.array(zSession).optional();
  } else {
    listenHuelle[e.key] = e.einzelzeile
      ? zRow.nullable().optional()
      : z.array(zRow).optional();
  }
}

const zExport = z.looseObject({
  app: z.literal("Kraftschmiede"),
  schemaVersion: z.union([z.literal("v2"), z.literal("v3")]),
  inventory: z.looseObject(inventarHuelle).optional(),
  ...listenHuelle,
});

// Nach der Zod-Pruefung stehen die Listen als unknown da (die Huelle wird
// dynamisch aufgebaut); hier einmal auf Zeilenlisten zurueckgeholt.
function arr(v: unknown): Row[] {
  return Array.isArray(v) ? (v as Row[]) : [];
}

// Tabellen, deren Zeilen aus Alt-Backups echtes Umrechnen brauchen: aus Feldern,
// die es heute nicht mehr gibt, wird ein heutiges Feld abgeleitet. Reines
// Wegwerfen steht hier nicht mehr - das erledigt das Eindampfen auf die
// bekannten Spalten weiter unten.
const UMBAU: Record<string, (r: Row) => Row> = {
  exercises: migrateExerciseRow,
};

// Uebungszeilen aus Alt-Backups auf die neue Form bringen: tier aus kind
// ableiten falls es fehlt, und die Barbell-Wahrheit aus category in equipment
// sichern (wie die DB-Migration). Die Altfelder selbst (category/kind, dazu
// active aus Backups vor dem Aufraeumen der Aktiv-Spalte) bleiben stehen und
// fallen beim Eindampfen weg. Neuere Backups passieren unveraendert.
function migrateExerciseRow(r: Row): Row {
  const out: Row = { ...r };
  if (out.tier == null) {
    out.tier = r.kind === "accessory" ? "accessory" : "main";
  }
  if (r.category === "barbell") {
    out.equipment = "barbell";
  }
  return out;
}

export function parseRestore(text: string): RestoreResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(
      "Ungueltiges JSON: " + (e instanceof Error ? e.message : String(e)),
    );
  }

  // Frueh und mit klarer Meldung gegen Fremd-/V1-Dateien abgrenzen.
  const obj = data as Record<string, unknown> | null;
  if (
    obj == null ||
    obj.app !== "Kraftschmiede" ||
    (obj.schemaVersion !== "v2" && obj.schemaVersion !== "v3")
  ) {
    throw new Error(
      "Das ist kein Kraftschmiede-Export. Nur ein eigener Export (Schema v2 " +
        "oder v3) kann wiederhergestellt werden (kein V1-JSON).",
    );
  }

  const parsed = zExport.safeParse(data);
  if (!parsed.success) {
    throw new Error("Der Export hat ein unerwartetes Format.");
  }
  const exp = parsed.data as Record<string, unknown>;
  const inventar = (exp.inventory ?? {}) as Record<string, unknown>;

  // Einheiten entschachteln: session-Zeile ohne entries, je Uebung ohne sets,
  // Saetze flach. ids/Fremdschluessel bleiben; die abgeleiteten Satz-Felder
  // (rir/rpe/scoreLabel) faellt das Eindampfen weiter unten weg.
  const sessions: Row[] = [];
  const session_exercises: Row[] = [];
  const sets: Row[] = [];
  for (const s of arr(exp.sessions)) {
    const { entries, ...sessionRow } = s as Row & { entries?: Row[] };
    sessions.push(sessionRow);
    for (const e of entries ?? []) {
      const { sets: exSets, ...exRow } = e as Row & { sets?: Row[] };
      session_exercises.push(exRow);
      for (const st of exSets ?? []) sets.push(st);
    }
  }
  const ausEinheiten: Record<string, Row[]> = {
    sessions,
    session_exercises,
    sets,
  };

  // Je Register-Eintrag die passende Liste holen, umrechnen falls noetig und auf
  // die heute bekannten Spalten eindampfen. Fehlt ein Schluessel (aeltere
  // Sicherung), bleibt die Liste leer.
  const gefuellt: Record<string, Row[] | Row | null> = {};
  for (const e of BESTANDSREGISTER) {
    if (e.einzelzeile) {
      const einzel = (exp[e.key] as Row | null | undefined) ?? null;
      gefuellt[e.tabelle] =
        einzel == null ? null : aufBekannteSpalten(e.tabelle, einzel);
      continue;
    }
    const roh =
      e.ablage === "einheiten" || e.ablage === "in_einheit"
        ? (ausEinheiten[e.tabelle] ?? [])
        : e.ablage === "inventar"
          ? arr(inventar[e.key])
          : arr(exp[e.key]);
    const umbau = UMBAU[e.tabelle];
    gefuellt[e.tabelle] = roh.map((r) =>
      aufBekannteSpalten(e.tabelle, umbau ? umbau(r) : r),
    );
  }

  // Die Schluessel stammen aus dem Register, das die Form von RestoreTables
  // bestimmt - deshalb hier eine einmalige Zusicherung.
  const tables = gefuellt as RestoreTables;

  const preview: RestorePreview = {
    sessions: sessions.length,
    sets: sets.length,
    journeys: tables.journeys.length,
    exercises: tables.exercises.length,
  };

  return { tables, preview };
}
