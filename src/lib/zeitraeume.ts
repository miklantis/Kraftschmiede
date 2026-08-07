// Reine Helfer und Anzeige-Konstanten fuer die Zeitraeume (Timeline-Marker).
// Geteilt zwischen der Verwaltungs-Sektion und (spaeter) dem Kalender-Band, damit
// Reihenfolge, Namen und Farbe je Typ nur an EINER Stelle gepflegt werden.

import type { ZeitraumTyp } from "@/schemas";

// Reihenfolge und Anzeigename je Typ (Domaenensprache deutsch). Diese Liste
// speist die Auswahl im Formular und die Beschriftung in der Liste.
export const ZEITRAUM_TYPEN: { value: ZeitraumTyp; label: string }[] = [
  { value: "heilfasten", label: "Heilfasten" },
  { value: "urlaub", label: "Urlaub" },
  { value: "pause", label: "Pause" },
  { value: "krankheit", label: "Krankheit" },
  { value: "verletzung", label: "Verletzung" },
  { value: "sonstiges", label: "Sonstiges" },
];

const ZEITRAUM_LABELS: Record<ZeitraumTyp, string> = {
  heilfasten: "Heilfasten",
  urlaub: "Urlaub",
  pause: "Pause",
  krankheit: "Krankheit",
  verletzung: "Verletzung",
  sonstiges: "Sonstiges",
};

export function zeitraumLabel(typ: ZeitraumTyp | string): string {
  return ZEITRAUM_LABELS[typ as ZeitraumTyp] ?? String(typ);
}

// Vollstaendige Tailwind-Klassenliterale je Typ (kein Laufzeit-Zusammenbau, sonst
// greift der Compiler sie nicht). Solide Fuellfarbe des Markers: als kleiner
// Punkt in der Liste, spaeter als Band im Kalender wiederverwendet. Toene aus dem
// „Klar“-Theme, gut unterscheidbar und dezent.
export const ZEITRAUM_FARBE: Record<ZeitraumTyp, string> = {
  heilfasten: "bg-[#2f9e78]",
  urlaub: "bg-[#3f7fb5]",
  pause: "bg-[#9a9aa0]",
  krankheit: "bg-[#c25f77]",
  verletzung: "bg-[#c0803f]",
  sonstiges: "bg-[#6b5fb8]",
};

// Ein Wochen-Segment eines Zeitraums: ein durchgehender, beschrifteter Balken
// ueber die betroffenen Spalten EINER Kalenderwoche. Laeuft ein Zeitraum ueber
// den Wochenwechsel, entsteht je Woche ein eigenes Segment (und wird dort erneut
// beschriftet). colStart/colSpan sind 1-basierte Grid-Spalten (Montag = 1); slot
// ist die ueber den ganzen Monat stabile Stapel-Ebene, damit ein mehrwoechiges
// Band vertikal auf einer Hoehe bleibt. isStart/isEnd markieren nur den echten
// Anfang/das echte Ende (fuer die Abrundung); an Wochengrenzen bleibt die Kante
// eckig, sodass die Fortsetzung sichtbar ist.
export interface ZeitraumWochenSegment {
  id: string;
  typ: ZeitraumTyp;
  label: string; // Notiz des Zeitraums; leer -> Typ-Bezeichnung als Rueckfall
  colStart: number; // 1..7
  colSpan: number; // 1..7
  slot: number; // 0-basierte Stapel-Ebene, ueber den Monat stabil
  isStart: boolean; // echter Starttag faellt auf den ersten Tag dieses Segments
  isEnd: boolean; // echter Endtag faellt auf den letzten Tag dieses Segments
}

// Minimaler Zeitraum-Ausschnitt, den die Band-Berechnung braucht (entkoppelt vom
// vollen Row-Typ, damit der Helfer leicht testbar bleibt).
interface ZeitraumSpan {
  id: string;
  typ: ZeitraumTyp;
  start_datum: string;
  end_datum: string | null;
  notiz: string | null;
}

function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

function isoDay(y: number, mZero: number, day: number): string {
  return y + "-" + pad2(mZero + 1) + "-" + pad2(day);
}

// Bildet fuer den angezeigten Monat (y, mZero 0-basiert) die Zeitraum-Baender je
// Kalenderwoche als durchgehende Segmente ab. Rueckgabe: Wochenindex (0 = erste
// Gitterzeile) -> Segmente. Die Wochen-/Spalteneinteilung ist identisch zum
// Calendar-Baustein (Montag als erste Spalte). Ein laufender Zeitraum ohne Ende
// faerbt bis zum Monatsende weiter (und in Folgemonaten erneut ab dem Ersten).
// ISO-Datumsstrings sind lexikografisch vergleichbar, daher reicht der
// String-Vergleich. Zeitraeume werden nach Start, dann id sortiert, damit die
// Slot-Zuweisung stabil ist.
export function zeitraumWochenBaender(
  zeitraeume: readonly ZeitraumSpan[],
  y: number,
  mZero: number,
): Record<number, ZeitraumWochenSegment[]> {
  const tageImMonat = new Date(y, mZero + 1, 0).getDate();
  const ersterTag = isoDay(y, mZero, 1);
  const letzterTag = isoDay(y, mZero, tageImMonat);
  const startDow = (new Date(y, mZero, 1).getDay() + 6) % 7; // Montag = 0

  const wocheVonTag = (tag: number): number => Math.floor((startDow + tag - 1) / 7);
  const spalteVonTag = (tag: number): number => ((startDow + tag - 1) % 7) + 1; // 1..7

  const sortiert = [...zeitraeume].sort((a, b) => {
    if (a.start_datum !== b.start_datum) {
      return a.start_datum < b.start_datum ? -1 : 1;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  // Slot-Zuweisung ueber den ganzen Monat: niedrigster Slot, der ueber die
  // sichtbare Spanne (in Tagnummern) frei ist.
  const slotBelegung: { von: number; bis: number }[][] = [];
  const out: Record<number, ZeitraumWochenSegment[]> = {};

  for (const z of sortiert) {
    const sichtbaresEnde = z.end_datum ?? letzterTag;
    if (z.start_datum > letzterTag || sichtbaresEnde < ersterTag) continue;

    const vonTag = z.start_datum > ersterTag ? Number(z.start_datum.slice(8, 10)) : 1;
    const bisTag =
      sichtbaresEnde < letzterTag ? Number(sichtbaresEnde.slice(8, 10)) : tageImMonat;

    let slot = 0;
    for (;;) {
      const belegt = slotBelegung[slot] ?? [];
      const kollision = belegt.some((iv) => vonTag <= iv.bis && bisTag >= iv.von);
      if (!kollision) {
        (slotBelegung[slot] ??= []).push({ von: vonTag, bis: bisTag });
        break;
      }
      slot++;
    }

    const label = (z.notiz ?? "").trim() || zeitraumLabel(z.typ);
    const echterStartTag =
      z.start_datum >= ersterTag && z.start_datum <= letzterTag
        ? Number(z.start_datum.slice(8, 10))
        : null;
    const echterEndTag =
      z.end_datum !== null && z.end_datum >= ersterTag && z.end_datum <= letzterTag
        ? Number(z.end_datum.slice(8, 10))
        : null;

    // Sichtbare Tage in Wochen-Abschnitte zerlegen.
    let t = vonTag;
    while (t <= bisTag) {
      const woche = wocheVonTag(t);
      const colStart = spalteVonTag(t);
      let ende = t;
      while (ende + 1 <= bisTag && wocheVonTag(ende + 1) === woche) ende++;
      (out[woche] ??= []).push({
        id: z.id,
        typ: z.typ,
        label,
        colStart,
        colSpan: ende - t + 1,
        slot,
        isStart: echterStartTag === t,
        isEnd: echterEndTag === ende,
      });
      t = ende + 1;
    }
  }
  return out;
}

// Kurzes Datum, z. B. „12. März“.
function tagMonat(iso: string): string {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("de-DE", {
      day: "numeric",
      month: "long",
    });
  } catch {
    return iso;
  }
}

// Datum mit Jahr, z. B. „12. März 2026“.
function tagMonatJahr(iso: string): string {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("de-DE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// Lesbare Spanne fuer die Liste. Laufender Zeitraum (kein Ende): „seit 12. März
// 2026“. Abgeschlossen: „12. März – 20. März 2026“ (Startjahr nur, wenn es vom
// Endjahr abweicht, sonst steht es einmal am Ende).
export function zeitraumSpanne(start: string, ende: string | null): string {
  if (!ende) return "seit " + tagMonatJahr(start);
  const startJahr = start.slice(0, 4);
  const endeJahr = ende.slice(0, 4);
  const startTeil = startJahr === endeJahr ? tagMonat(start) : tagMonatJahr(start);
  return startTeil + " – " + tagMonatJahr(ende);
}
