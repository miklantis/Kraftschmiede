// Profilbild: aus einer gewaehlten Bilddatei wird ein quadratischer, kleiner
// Avatar als Data-URL. Alles passiert im Browser - die Originaldatei verlaesst
// das Geraet nie, hochgeladen wird nur das fertige, verkleinerte Bild.
//
// Warum Data-URL und nicht Datei-Ablage: das Bild liegt als Text in
// `settings.avatar` (Migration 0052). Damit ist es Teil der Sicherung, offline
// aus dem Zwischenspeicher da und braucht keine zweite Rechteschicht.
//
// Kantenlaenge 256: angezeigt wird der Kreis mit hoechstens 44 Pixel, auf einem
// scharfen Display also rund 130 Pixel. 256 deckt das mit Reserve ab.
//
// Die reinen Rechenteile (Ausschnitt, Groessengrenze, Dateipruefung) stehen
// bewusst als eigene Funktionen: sie sind ohne Browser pruefbar
// (`__tests__/profilbild.test.ts`). Nur `avatarAusDatei` braucht Canvas und
// bleibt untestbar.

/** Kantenlaenge des gespeicherten Avatars in Pixeln. */
export const AVATAR_KANTE = 256;

/** Obergrenze der fertigen Data-URL in Zeichen (rund 150 KB). Ein 256er
 *  Avatar liegt normal weit darunter; die Grenze faengt Ausreisser ab, damit
 *  die Einstellungs-Zeile nicht unbemerkt schwer wird. */
export const AVATAR_MAX_ZEICHEN = 200_000;

/** Qualitaetsstufen der Kodierung, absteigend. Die erste Stufe, die unter der
 *  Grenze bleibt, gewinnt. */
export const AVATAR_QUALITAETEN = [0.82, 0.65, 0.5] as const;

/** Grenze fuer die gewaehlte Datei. Groessere Fotos werden gar nicht erst
 *  dekodiert - auf dem Handy ist das sonst der Punkt, an dem der Tab stirbt. */
export const AVATAR_MAX_DATEI_BYTES = 25 * 1024 * 1024;

/** Quadratischer Ausschnitt aus der Mitte eines Bildes. */
export interface Ausschnitt {
  readonly x: number;
  readonly y: number;
  readonly kante: number;
}

/** Das groesstmoegliche Quadrat aus der Mitte: die kuerzere Seite gibt die
 *  Kante vor, der Rest wird links/rechts bzw. oben/unten gleich abgeschnitten. */
export function mittigerAusschnitt(breite: number, hoehe: number): Ausschnitt {
  const kante = Math.min(breite, hoehe);
  return {
    x: Math.round((breite - kante) / 2),
    y: Math.round((hoehe - kante) / 2),
    kante,
  };
}

/** Ist die Datei ueberhaupt ein Bild? Der Dateiwaehler laesst sich umgehen,
 *  darum wird der Typ noch einmal geprueft. */
export function istBilddatei(datei: File): boolean {
  return datei.type.startsWith("image/");
}

/** Passt die fertige Data-URL in die Zeile? */
export function kleinGenug(datenUrl: string): boolean {
  return datenUrl.length <= AVATAR_MAX_ZEICHEN;
}

/** Bild aus einer Datei laden. Ueber ein <img> statt createImageBitmap, weil
 *  die Browser dabei die Drehung aus den Foto-Daten (EXIF) selbst anwenden -
 *  sonst laegen Handy-Fotos quer. Die Objekt-Adresse wird in jedem Fall wieder
 *  freigegeben. */
async function ladeBild(datei: File): Promise<HTMLImageElement> {
  const adresse = URL.createObjectURL(datei);
  try {
    return await new Promise<HTMLImageElement>((auf, ab) => {
      const bild = new Image();
      bild.onload = () => auf(bild);
      bild.onerror = () =>
        ab(new Error("Die Datei liess sich nicht als Bild oeffnen."));
      bild.src = adresse;
    });
  } finally {
    URL.revokeObjectURL(adresse);
  }
}

/** Zeichnet den mittigen Ausschnitt auf eine quadratische Flaeche. */
function zeichneAvatar(bild: HTMLImageElement): HTMLCanvasElement {
  const flaeche = document.createElement("canvas");
  flaeche.width = AVATAR_KANTE;
  flaeche.height = AVATAR_KANTE;
  const stift = flaeche.getContext("2d");
  if (stift === null) {
    throw new Error("Das Bild konnte nicht verarbeitet werden.");
  }
  const { x, y, kante } = mittigerAusschnitt(
    bild.naturalWidth,
    bild.naturalHeight,
  );
  stift.drawImage(bild, x, y, kante, kante, 0, 0, AVATAR_KANTE, AVATAR_KANTE);
  return flaeche;
}

/** Kodiert die Flaeche: erst WebP, sonst JPEG. Aeltere Browser geben bei einem
 *  unbekannten Format still PNG zurueck - darum wird das Ergebnis geprueft und
 *  nicht dem Wunsch geglaubt. */
function kodiere(flaeche: HTMLCanvasElement, qualitaet: number): string {
  const webp = flaeche.toDataURL("image/webp", qualitaet);
  if (webp.startsWith("data:image/webp")) return webp;
  return flaeche.toDataURL("image/jpeg", qualitaet);
}

/** Gewaehlte Datei zu einem fertigen Avatar machen. Wirft mit einem Text, der
 *  dem Nutzer direkt angezeigt werden kann. */
export async function avatarAusDatei(datei: File): Promise<string> {
  if (!istBilddatei(datei)) {
    throw new Error("Das ist keine Bilddatei.");
  }
  if (datei.size > AVATAR_MAX_DATEI_BYTES) {
    throw new Error("Das Bild ist zu gross. Bitte ein kleineres waehlen.");
  }

  const bild = await ladeBild(datei);
  if (bild.naturalWidth === 0 || bild.naturalHeight === 0) {
    throw new Error("Die Datei liess sich nicht als Bild oeffnen.");
  }

  const flaeche = zeichneAvatar(bild);
  for (const qualitaet of AVATAR_QUALITAETEN) {
    const datenUrl = kodiere(flaeche, qualitaet);
    if (kleinGenug(datenUrl)) return datenUrl;
  }
  throw new Error("Das Bild liess sich nicht klein genug speichern.");
}
