// Fastenstand: welcher Fastentag ist heute? Reine Helfer ohne DOM und ohne
// Datenbank (Vorhaben #503). Die Trainingsseite fragt hier, ob heute in einem
// Heilfasten-Zeitraum liegt - dann zeigt sie statt Empfehlung und Skills den
// Fastenbegleiter mit dem Text des Tages.
//
// Quelle ist allein der Kalender-Zeitraum vom Typ „heilfasten“: kein eigenes
// Eingabefeld, kein zweiter Zustand. Andere Zeitraum-Typen (Urlaub, Krankheit
// ...) aendern an der Trainingsseite nichts.

import type { ZeitraumTyp } from "@/schemas";

/** Minimaler Zeitraum-Ausschnitt, den die Berechnung braucht (entkoppelt vom
 *  vollen Row-Typ, damit der Helfer leicht testbar bleibt). */
interface FastenZeitraum {
  id: string;
  typ: ZeitraumTyp;
  start_datum: string;
  end_datum: string | null;
}

export interface FastenStand {
  /** Fastentag, 1-basiert: der Starttag des Zeitraums ist Tag 1. */
  tag: number;
  /** Zahl der Fastentage insgesamt; null, solange der Zeitraum kein Ende hat. */
  von: number | null;
  /** Letzter Fastentag als ISO-Datum; null ohne Ende. */
  bis: string | null;
}

// Tage zwischen zwei ISO-Daten (bis - von), ueber UTC gerechnet, damit eine
// Zeitumstellung dazwischen keinen halben Tag verschluckt.
function tageZwischen(von: string, bis: string): number {
  const utc = (iso: string): number =>
    Date.UTC(
      Number(iso.slice(0, 4)),
      Number(iso.slice(5, 7)) - 1,
      Number(iso.slice(8, 10)),
    );
  return Math.round((utc(bis) - utc(von)) / 86_400_000);
}

/**
 * Liegt `heute` (ISO-Datum) in einem Heilfasten-Zeitraum, der Stand darin;
 * sonst null. Start- und Endtag zaehlen mit, ein Zeitraum ohne Ende laeuft
 * weiter. Ueberlappen sich zwei, gilt der zuletzt begonnene (bei gleichem
 * Start entscheidet die Kennung, damit das Ergebnis stabil bleibt).
 */
export function fastenStand(
  zeitraeume: readonly FastenZeitraum[],
  heute: string,
): FastenStand | null {
  let aktiv: FastenZeitraum | null = null;
  for (const z of zeitraeume) {
    if (z.typ !== "heilfasten") continue;
    if (z.start_datum > heute) continue;
    if (z.end_datum !== null && z.end_datum < heute) continue;
    if (
      aktiv === null ||
      z.start_datum > aktiv.start_datum ||
      (z.start_datum === aktiv.start_datum && z.id > aktiv.id)
    ) {
      aktiv = z;
    }
  }
  if (aktiv === null) return null;

  return {
    tag: tageZwischen(aktiv.start_datum, heute) + 1,
    von:
      aktiv.end_datum === null
        ? null
        : tageZwischen(aktiv.start_datum, aktiv.end_datum) + 1,
    bis: aktiv.end_datum,
  };
}

/**
 * Der Text fuer einen Fastentag: der Text genau dieses Tags, sonst der des
 * hoechsten Tags davor. Laeuft ein Fasten laenger, als es Texte gibt, bleibt
 * so der letzte stehen (heute Tag 21). Ohne passenden Text null.
 */
export function fastenTextFuer<T extends { tag: number }>(
  texte: readonly T[],
  tag: number,
): T | null {
  let treffer: T | null = null;
  for (const t of texte) {
    if (t.tag > tag) continue;
    if (treffer === null || t.tag > treffer.tag) treffer = t;
  }
  return treffer;
}
