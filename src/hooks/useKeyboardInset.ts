import { useEffect, useState } from "react";

// Wie viele Pixel am unteren Fensterrand die Bildschirmtastatur gerade
// verdeckt.
//
// Warum das noetig ist: iOS Safari macht das Layout-Fenster beim Oeffnen der
// Tastatur NICHT kleiner, sondern legt die Tastatur darueber. Eine fixierte
// Schicht (inset-0) reicht deshalb weiter bis unter die Tastatur, und alles
// dort ist unerreichbar - beim Bodenblatt ausgerechnet der Inhalt unter dem
// getippten Feld. Nur das sichtbare Fenster (window.visualViewport) schrumpft.
// Die Differenz zwischen beiden ist die verdeckte Hoehe. Android/Chrome
// verhaelt sich genauso.
//
// Kennt der Browser visualViewport nicht, bleibt der Wert 0 - dann ist das
// Verhalten wie vorher, nichts wird schlechter.

/** Ab hier gilt die Differenz als Tastatur. Darunter liegen die ein- und
 *  ausfahrenden Browserleisten von Safari (rund 50-90 px); eine Tastatur ist
 *  immer deutlich hoeher. */
const TASTATUR_AB_PX = 120;

/** Verdeckte Hoehe aus den drei Messwerten. Ausgelagert, damit die Rechnung
 *  ohne Browser pruefbar bleibt. */
export function verdeckteHoehe(
  fensterHoehe: number,
  sichtbareHoehe: number,
  versatzOben: number,
): number {
  const verdeckt = fensterHoehe - sichtbareHoehe - versatzOben;
  return verdeckt >= TASTATUR_AB_PX ? Math.round(verdeckt) : 0;
}

/**
 * @param active Nur messen, solange die Schicht im DOM ist.
 * @returns Verdeckte Hoehe in Pixeln, 0 ohne Tastatur.
 */
export function useKeyboardInset(active: boolean): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (!active) {
      setInset(0);
      return undefined;
    }
    const vv = window.visualViewport;
    if (!vv) return undefined;

    const messen = (): void => {
      setInset(verdeckteHoehe(window.innerHeight, vv.height, vv.offsetTop));
    };
    messen();
    // resize: Tastatur faehrt ein/aus. scroll: iOS schiebt beim Fokussieren das
    // sichtbare Fenster hoch (offsetTop), das gehoert zur verdeckten Hoehe.
    vv.addEventListener("resize", messen);
    vv.addEventListener("scroll", messen);
    return () => {
      vv.removeEventListener("resize", messen);
      vv.removeEventListener("scroll", messen);
    };
  }, [active]);

  return active ? inset : 0;
}
