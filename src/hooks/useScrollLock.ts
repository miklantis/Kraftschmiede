import { useEffect } from "react";

// Sperrt das Scrollen der Seite hinter einer Vollbild-Schicht (Live-Panel,
// Popups). `overflow: hidden` am Body allein reicht auf iOS Safari nicht: kann
// der innere Scrollbereich nicht weiterscrollen, reicht iOS die Wischgeste an
// das Dokument weiter und die Seite dahinter wandert mit. Verlaesslich ist nur,
// das Dokument zu fixieren und die gemerkte Position beim Freigeben
// zurueckzusetzen.
//
// Die Sperre zaehlt global mit: liegt ein Popup ueber dem Live-Panel, sind zwei
// Sperren gleichzeitig aktiv. Erst greift die erste, erst die letzte gibt frei
// und springt an die urspruengliche Seitenposition zurueck - sonst wuerde das
// Schliessen eines Popups die Seite auf Position 0 werfen.
//
// Ausnahme: Wird aus dem Popup heraus auf eine andere Seite gewechselt (z. B.
// Uebungsname im Start-Popup), laeuft die Ausblende-Animation noch, waehrend die
// neue Seite schon steht. Die gemerkte Position gehoert dann zur alten Seite -
// zurueckgesprungen wird nur, wenn der Pfad derselbe geblieben ist.

let lockCount = 0;
let savedY = 0;
let savedPath = "";
let savedStyle: {
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
  overflow: string;
} | null = null;

/** Position nach dem Freigeben: gemerkte Stelle auf derselben Seite, sonst oben. */
export function zielNachFreigabe(
  gemerkterPfad: string,
  aktuellerPfad: string,
  gemerkteY: number,
): number {
  return gemerkterPfad === aktuellerPfad ? gemerkteY : 0;
}

function applyLock(): void {
  const b = document.body;
  savedY = window.scrollY;
  savedPath = window.location.pathname;
  savedStyle = {
    position: b.style.position,
    top: b.style.top,
    left: b.style.left,
    right: b.style.right,
    width: b.style.width,
    overflow: b.style.overflow,
  };
  b.style.position = "fixed";
  b.style.top = -savedY + "px";
  b.style.left = "0";
  b.style.right = "0";
  b.style.width = "100%";
  b.style.overflow = "hidden";
}

function releaseLock(): void {
  const b = document.body;
  if (savedStyle) {
    b.style.position = savedStyle.position;
    b.style.top = savedStyle.top;
    b.style.left = savedStyle.left;
    b.style.right = savedStyle.right;
    b.style.width = savedStyle.width;
    b.style.overflow = savedStyle.overflow;
    savedStyle = null;
  }
  window.scrollTo(
    0,
    zielNachFreigabe(savedPath, window.location.pathname, savedY),
  );
}

/** Haelt die Seite hinter der Schicht still, solange `locked` gilt. */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return undefined;
    lockCount += 1;
    if (lockCount === 1) applyLock();
    return () => {
      lockCount -= 1;
      if (lockCount === 0) releaseLock();
    };
  }, [locked]);
}
