// Live-Session: das Arbeitsobjekt der gefuehrten Durchfuehrung (Phase 11).
//
// Bewusst geraete-lokal gehalten (nicht in der normalisierten DB): eine laufende
// Einheit ist ein fluechtiges Arbeitsobjekt, das Reload/Tab-Wechsel/Funkloch
// uebersteht. Erst beim Beenden ("Speichern") werden die erledigten Saetze als
// saubere Zeilen in die DB geschrieben (Lieferung 4). So verschmutzt keine
// halbfertige Einheit den Bestand, und das Aufzeichnen laeuft komplett offline.
//
// Lieferung 1 (Panel-Huelle): die Struktur ist hier noch schlank - nur das
// Noetige fuer Kopf, Uhr und Start-/Ende-Vorschau. Der echte Aufbau aus Vorlage
// + Coach (Uebungs-/Satzkarten) ersetzt `exercisesPreview` in Lieferung 2 durch
// vollwertige Eintraege; die Aenderung bleibt additiv.

// Eine reine Funktion (keine React-/DOM-Abhaengigkeit), damit die Engine-/
// Format-Logik testbar bleibt - dieselbe Trennung wie im uebrigen Projekt.

/** Zweistellig auffuellen (Sekunden/Minuten in der Uhr). */
export function pad2(n: number): string {
  return n < 10 ? "0" + n : "" + n;
}

/**
 * Trainings-Uhr-Format wie V1 (live.js fmtDur). Unter einer Stunde `m:ss`,
 * ab einer Stunde `h:mm:ss`. Negative Werte werden auf 0 geklemmt.
 */
export function fmtDur(sec: number): string {
  const s = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return (h > 0 ? h + ":" + pad2(m) : "" + m) + ":" + pad2(ss);
}

// ---- Live-Session-Objekt ----------------------------------------------------

/** Art der laufenden Einheit. Skill kommt in Lieferung 5 dazu. */
export type LiveKind = "workout";

export interface LiveSession {
  /** Lokale Lauf-ID (kollidiert nicht mit DB-UUIDs der gespeicherten Session). */
  id: string;
  kind: LiveKind;
  /** Vorlage, aus der die Einheit aufgebaut wurde. */
  templateId: string;
  /** Anzeigename der Vorlage (Kopf, Mini-Streifen, Dialoge). */
  title: string;
  /** Startzeitpunkt in ms (Date.now). Die Uhr rechnet immer ab hier. */
  startedAt: number;
  /**
   * Lieferung-1-Platzhalter: Uebungsnamen fuer die Start-/Ende-Vorschau und den
   * Panel-Inhalt, solange es noch keine echten Satzkarten gibt. Wird in
   * Lieferung 2 durch vollwertige Eintraege abgeloest.
   */
  exercisesPreview: string[];
}

// ---- Lokale Persistenz ------------------------------------------------------
// Wie die angehefteten Charts (usePinnedCharts) ueber localStorage: synchron,
// sofort beim Reload da (kein Flackern), getrennt vom synchronisierten Bestand.

export const LIVE_STORAGE_KEY = "ks_live_v1";

export interface PersistedLive {
  session: LiveSession | null;
  collapsed: boolean;
}

/** Defensive Wiederherstellung aus dem rohen localStorage-String. */
export function parseLive(raw: string | null): PersistedLive {
  const empty: PersistedLive = { session: null, collapsed: false };
  if (!raw) return empty;
  try {
    const obj = JSON.parse(raw) as unknown;
    if (typeof obj !== "object" || obj === null) return empty;
    const rec = obj as Record<string, unknown>;
    const collapsed = rec.collapsed === true;
    const s = rec.session;
    if (typeof s !== "object" || s === null) return { session: null, collapsed };
    const sr = s as Record<string, unknown>;
    if (
      typeof sr.id !== "string" ||
      sr.kind !== "workout" ||
      typeof sr.templateId !== "string" ||
      typeof sr.title !== "string" ||
      typeof sr.startedAt !== "number"
    ) {
      return { session: null, collapsed };
    }
    const preview = Array.isArray(sr.exercisesPreview)
      ? sr.exercisesPreview.filter((x): x is string => typeof x === "string")
      : [];
    return {
      session: {
        id: sr.id,
        kind: "workout",
        templateId: sr.templateId,
        title: sr.title,
        startedAt: sr.startedAt,
        exercisesPreview: preview,
      },
      collapsed,
    };
  } catch {
    return empty;
  }
}

export function serializeLive(state: PersistedLive): string {
  return JSON.stringify({ session: state.session, collapsed: state.collapsed });
}

/** Neue lokale Lauf-ID, klar von DB-UUIDs unterscheidbar. */
export function newLiveId(): string {
  return "live_" + Date.now().toString(36) + "_" + Math.floor(Math.random() * 1000);
}
