// Ruecksprung-Adressen und Marker fuer die Anmelde-Links von Supabase
// (Einladung, "Passwort vergessen").
//
// Warum eigene Marker: Supabase haengt die Sitzungsinfos im Standard-Flow an
// den URL-Hash (#access_token=...&type=recovery). Den raeumt die Supabase-
// Bibliothek beim Einlesen sofort weg - ein Marker im Hash ist also nicht mehr
// da, wenn die App laeuft. Ein Marker in der Query (?einladung) ueberlebt und
// bleibt lesbar.
//
// Steht bewusst ausserhalb von auth.tsx, damit es ohne React getestet werden
// kann.

/** Anlass, aus dem der Bildschirm zum Passwort-Setzen erscheint. */
export type PasswortAnlass = "einladung" | "wiederherstellung";

/** Marker fuer den Einladungs-Link (bestehend, nicht aendern). */
export const EINLADUNG_MARKER = "einladung";

/** Marker fuer den Link aus "Passwort vergessen". */
export const WIEDERHERSTELLUNG_MARKER = "wiederherstellung";

/**
 * Baut die Adresse, auf die ein Anmelde-Link zurueckspringen soll:
 * Herkunft + Basispfad der App + `?marker`.
 *
 * Ein Fehler in dieser Adresse ist teuer: Supabase verbraucht den Token beim
 * Klick, auch wenn die Weiterleitung ins Leere laeuft. Darum wird sie hier aus
 * dem laufenden Browser abgeleitet statt irgendwo von Hand eingetragen.
 */
export function ruecksprungAdresse(
  marker: string,
  origin: string,
  basis: string,
): string {
  const herkunft = origin.replace(/\/+$/, "");
  const pfad = basis === "" ? "/" : `/${basis.replace(/^\/+|\/+$/g, "")}/`;
  const sauber = pfad === "//" ? "/" : pfad;
  return `${herkunft}${sauber}?${marker}`;
}

/**
 * Liest aus Query und Hash, ob die App gerade ueber einen Anmelde-Link
 * geoeffnet wurde - und ueber welchen.
 *
 * Wiederherstellung schlaegt Einladung: Faellt Supabase mangels passendem
 * Eintrag in den Redirect URLs auf die Site URL (die den Einladungs-Marker
 * traegt) zurueck, steht `type=recovery` trotzdem im Hash und gibt den
 * Ausschlag.
 */
export function anlassAusUrl(search: string, hash: string): PasswortAnlass | null {
  const text = `${search} ${hash}`.toLowerCase();
  if (text.includes("type=recovery") || text.includes(WIEDERHERSTELLUNG_MARKER)) {
    return "wiederherstellung";
  }
  if (text.includes("type=invite") || text.includes(EINLADUNG_MARKER)) {
    return "einladung";
  }
  return null;
}

/** Anlass aus der aktuell im Browser stehenden Adresse. */
export function anlassAusFenster(): PasswortAnlass | null {
  if (typeof window === "undefined") return null;
  return anlassAusUrl(window.location.search, window.location.hash);
}

/** Ruecksprung-Adresse fuer den laufenden Browser (Herkunft + Vite-Basispfad). */
export function ruecksprungFuerFenster(marker: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  return ruecksprungAdresse(
    marker,
    window.location.origin,
    import.meta.env.BASE_URL,
  );
}
