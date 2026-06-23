// Bildschirm wachhalten waehrend einer laufenden Live-Session - bewusste
// Erweiterung ueber V1 hinaus (V1 hatte keinen Wake-Lock). Duenner, DOM-naher
// Effekt-Baustein in derselben Art wie liveAudio.ts: kein React, robuste
// try/catch, und auf Geraeten/Browsern ohne Screen Wake Lock API ein reines
// No-op (z. B. aelteres iOS Safari vor 16.4).
//
// Eigenheit der API: sobald der Tab in den Hintergrund geht, gibt der Browser
// den Lock von selbst frei. Das Neu-Anfordern bei Rueckkehr uebernimmt der Hook
// useWakeLock; dieses Modul haelt nur den aktuellen Sentinel und kapselt die
// drei Aktionen anfordern/freigeben/Unterstuetzung-pruefen.

let sentinel: WakeLockSentinel | null = null;

/** Ob das Geraet/der Browser die Screen Wake Lock API kennt. */
export function isWakeLockSupported(): boolean {
  try {
    return typeof navigator !== "undefined" && "wakeLock" in navigator;
  } catch {
    return false;
  }
}

/** Lock anfordern (No-op ohne Unterstuetzung oder wenn schon aktiv). */
export async function requestWakeLock(): Promise<void> {
  if (!isWakeLockSupported()) return;
  try {
    if (sentinel && !sentinel.released) return;
    sentinel = await navigator.wakeLock.request("screen");
    // Gibt das System den Lock frei (Tab versteckt o. Ae.), Referenz leeren,
    // damit der naechste Versuch sauber neu anfordert.
    sentinel.addEventListener("release", () => {
      sentinel = null;
    });
  } catch {
    // z. B. Tab nicht im Vordergrund oder Energiesparmodus - still ignorieren,
    // die Session laeuft unbeeintraechtigt weiter.
    sentinel = null;
  }
}

/** Lock freigeben (immer ungefaehrlich, auch ohne aktiven Lock). */
export async function releaseWakeLock(): Promise<void> {
  try {
    if (sentinel && !sentinel.released) await sentinel.release();
  } catch {
    // ignorieren
  } finally {
    sentinel = null;
  }
}
