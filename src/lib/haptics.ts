// Kurze taktile Rueckmeldung beim Tippen (Hauptnavigation, Satz-Haken).
// Duenner, DOM-naher Effekt-Baustein in derselben Art wie liveAudio.ts und
// wakeLock.ts: kein React, robuste try/catch, und ein reines No-op dort, wo
// das Geraet/der Browser nichts kann.
//
// Plattform-Weiche (bewusst ohne unzuverlaessige Geraete-Erkennung):
//   - Android/Chrome u. a. kennen die Vibrations-API (navigator.vibrate) ->
//     kurzer Tick darueber.
//   - iOS Safari kennt navigator.vibrate NICHT, unterstuetzt seit iOS 18 aber
//     ein nicht-standardisiertes Schalter-Element (<input type="checkbox"
//     switch>): wird ein zugehoeriges <label> programmatisch geklickt, gibt das
//     System ein kurzes haptisches Signal ab. Genau ein verstecktes Hilfs-
//     element wird dafuer lazy angelegt und wiederverwendet.
//   - Aeltere iPhones (vor iOS 18) ohne beides: still nichts, die App laeuft
//     unveraendert.
//
// So feuert je Geraet genau ein Kanal - keine doppelte Rueckmeldung.

let iosLabel: HTMLLabelElement | null = null;

/** Verstecktes Schalter-Element fuer den iOS-Haptik-Trick (lazy, einmalig). */
function ensureIosLabel(): HTMLLabelElement | null {
  if (typeof document === "undefined") return null;
  if (iosLabel && document.body.contains(iosLabel)) return iosLabel;
  try {
    const label = document.createElement("label");
    label.setAttribute("aria-hidden", "true");
    label.style.position = "absolute";
    label.style.width = "1px";
    label.style.height = "1px";
    label.style.overflow = "hidden";
    label.style.clip = "rect(0 0 0 0)";
    label.style.pointerEvents = "none";

    const input = document.createElement("input");
    input.type = "checkbox";
    // Nicht-standardisiertes Attribut; nur Safari/iOS wertet es aus.
    input.setAttribute("switch", "");
    input.tabIndex = -1;

    label.appendChild(input);
    document.body.appendChild(label);
    iosLabel = label;
    return iosLabel;
  } catch {
    return null;
  }
}

/**
 * Einen kurzen Tick ausloesen, sofern die Haptik eingeschaltet ist. Wird
 * `enabled` auf false gesetzt (Schalter in den Einstellungen aus), passiert
 * nichts. Ueberall robust: jeder Fehler wird verschluckt, damit ein fehlendes
 * Geraete-Feature nie die Bedienung stoert.
 */
export function hapticTick(enabled: boolean): void {
  if (!enabled) return;
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(12);
      return;
    }
    const label = ensureIosLabel();
    if (label) label.click();
  } catch {
    // ignorieren - Haptik ist nur ein Zusatz.
  }
}
