// Reine, DOM-/Supabase-freie Pruefung und Aufbereitung eines eigenen Exports
// fuer das Voll-Restore. Spiegelt V1 io.js (stripDerived): nimmt einen EIGENEN
// Kraftschmiede-Export (app + schemaVersion "v2" oder "v3"), verwirft die
// abgeleiteten Felder (rir/rpe/scoreLabel je Satz, _scoreScale), entschachtelt
// die Einheiten wieder in die flachen Tabellen (sessions/session_exercises/sets)
// und liefert pro Tabelle eine Zeilenliste plus eine kleine Vorschau (Anzahlen).
// Validierung mit Zod auf der Huelle; die Zeilen selbst bleiben durchgereicht
// (der Schreiber setzt user_id und behaelt ids/Fremdschluessel, damit die
// Beziehungen halten).
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

// Tabellen, deren Zeilen beim Einspielen umgebaut werden muessen (Alt-Backups).
const UMBAU: Record<string, (r: Row) => Row> = {
  exercises: migrateExerciseRow,
  template_exercises: stripTemplateExerciseRow,
};

// Abgeleitete Satz-Felder wegwerfen (wie V1 stripDerived).
function stripSet(set: Row): Row {
  const copy: Row = { ...set };
  delete copy.rir;
  delete copy.rpe;
  delete copy.scoreLabel;
  return copy;
}

// Uebungszeilen aus Alt-Backups auf die neue Form bringen: Altfelder verwerfen
// (category/kind aus v2, active aus Backups vor dem Aufraeumen der Aktiv-Spalte),
// tier ableiten falls es fehlt, und die Barbell-Wahrheit aus category in
// equipment sichern (wie die DB-Migration). Neuere Backups passieren unveraendert.
function migrateExerciseRow(r: Row): Row {
  const { category, kind, active, ...rest } = r;
  void active;
  const out: Row = { ...rest };
  if (out.tier == null) {
    out.tier = kind === "accessory" ? "accessory" : "main";
  }
  if (category === "barbell") {
    out.equipment = "barbell";
  }
  return out;
}

// Alt-Backups (vor Version 1.3.16 bzw. Migration 0006) fuehren je Uebung eine
// Rolle. Die Spalte gibt es nicht mehr; sie wird beim Restore verworfen, damit
// ein aelterer Export weiterhin sauber einspielbar bleibt.
function stripTemplateExerciseRow(r: Row): Row {
  const { role: _role, ...rest } = r;
  return rest;
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
  // Saetze flach (abgeleitete Felder entfernt). ids/Fremdschluessel bleiben.
  const sessions: Row[] = [];
  const session_exercises: Row[] = [];
  const sets: Row[] = [];
  for (const s of arr(exp.sessions)) {
    const { entries, ...sessionRow } = s as Row & { entries?: Row[] };
    sessions.push(sessionRow);
    for (const e of entries ?? []) {
      const { sets: exSets, ...exRow } = e as Row & { sets?: Row[] };
      session_exercises.push(exRow);
      for (const st of exSets ?? []) sets.push(stripSet(st));
    }
  }
  const ausEinheiten: Record<string, Row[]> = {
    sessions,
    session_exercises,
    sets,
  };

  // Je Register-Eintrag die passende Liste holen. Fehlt ein Schluessel (aeltere
  // Sicherung), bleibt sie leer.
  const gefuellt: Record<string, Row[] | Row | null> = {};
  for (const e of BESTANDSREGISTER) {
    if (e.einzelzeile) {
      gefuellt[e.tabelle] = (exp[e.key] as Row | null | undefined) ?? null;
      continue;
    }
    if (e.ablage === "einheiten" || e.ablage === "in_einheit") {
      gefuellt[e.tabelle] = ausEinheiten[e.tabelle] ?? [];
      continue;
    }
    const roh = e.ablage === "inventar" ? arr(inventar[e.key]) : arr(exp[e.key]);
    const umbau = UMBAU[e.tabelle];
    gefuellt[e.tabelle] = umbau ? roh.map(umbau) : roh;
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
