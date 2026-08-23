// Hilfen fuer den Sitzungs-Check beim App-Start (Issue #348).
//
// Der Check darf nie stumm haengenbleiben: Er bekommt hier ein Zeitlimit und
// eine verstaendliche Fehlermeldung. Beides steht bewusst ausserhalb von
// auth.tsx, damit es ohne React getestet werden kann.

/** Zeitlimit fuer den Sitzungs-Check beim Start (Millisekunden). */
export const SITZUNG_ZEITLIMIT_MS = 8000;

/** Meldung, wenn das Zeitlimit zuschlaegt. */
export const ZEITLIMIT_MELDUNG =
  "Zeitüberschreitung: Die Anmeldung hat nicht geantwortet.";

/**
 * Laesst `aufgabe` nur begrenzt lange laufen. Antwortet sie nicht innerhalb von
 * `ms`, wird das Ergebnis-Promise mit `meldung` abgelehnt. Der Timer wird in
 * jedem Fall aufgeraeumt, damit kein Handle offen bleibt.
 *
 * Die urspruengliche Aufgabe laeuft weiter (abbrechen laesst sie sich nicht) -
 * ihr spaeteres Ergebnis wird nur nicht mehr beachtet.
 */
export function mitZeitlimit<T>(
  aufgabe: Promise<T>,
  ms: number,
  meldung: string = ZEITLIMIT_MELDUNG,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(meldung));
    }, ms);
    aufgabe.then(
      (wert) => {
        clearTimeout(timer);
        resolve(wert);
      },
      (fehler: unknown) => {
        clearTimeout(timer);
        reject(fehler instanceof Error ? fehler : new Error(String(fehler)));
      },
    );
  });
}

/**
 * Macht aus einem beliebigen Fehlerobjekt einen anzeigbaren Text. Leere oder
 * unbrauchbare Werte bekommen einen Ersatztext, damit die Anzeige nie leer
 * bleibt - genau das war der stumme Zustand aus Issue #348.
 */
export function anmeldeFehlerText(fehler: unknown): string {
  const roh =
    fehler instanceof Error
      ? fehler.message
      : typeof fehler === "string"
        ? fehler
        : "";
  const text = roh.trim();
  return text === "" ? "Unbekannter Fehler beim Anmelde-Check." : text;
}
