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

// Ein Balken-Segment eines Zeitraums an einem einzelnen Kalendertag. Der Kalender
// zeichnet je Tag alle hier gelisteten Segmente als schmale farbige Streifen. Die
// Rundungs-Flags erzeugen die Bandwirkung: nur der echte Start-/Endtag wird an der
// jeweiligen Seite abgerundet, dazwischen (auch ueber Wochen- und Monatsgrenzen)
// bleibt der Streifen eckig, sodass er wie ein durchgehendes Band ueber die Tage
// laeuft.
export interface ZeitraumBand {
  id: string;
  typ: ZeitraumTyp;
  isStart: boolean; // echter Starttag des Zeitraums faellt auf diesen Tag
  isEnd: boolean; // echter Endtag des Zeitraums faellt auf diesen Tag
}

// Minimaler Zeitraum-Ausschnitt, den die Band-Berechnung braucht (entkoppelt vom
// vollen Row-Typ, damit der Helfer leicht testbar bleibt).
interface ZeitraumSpan {
  id: string;
  typ: ZeitraumTyp;
  start_datum: string;
  end_datum: string | null;
}

function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

function isoDay(y: number, mZero: number, day: number): string {
  return y + "-" + pad2(mZero + 1) + "-" + pad2(day);
}

// Bildet fuer den angezeigten Monat (y, mZero 0-basiert) je Tag (ISO) die aktiven
// Band-Segmente ab. Ein laufender Zeitraum ohne Ende faerbt bis zum Monatsende
// weiter (und in Folgemonaten erneut ab dem Ersten). ISO-Datumsstrings sind
// lexikografisch vergleichbar, daher reicht der String-Vergleich. Reihenfolge der
// Segmente je Tag ist stabil (nach Start, dann id), damit sich ueberlappende
// Baender ruhig stapeln.
export function zeitraumBaenderImMonat(
  zeitraeume: readonly ZeitraumSpan[],
  y: number,
  mZero: number,
): Record<string, ZeitraumBand[]> {
  const tageImMonat = new Date(y, mZero + 1, 0).getDate();
  const ersterTag = isoDay(y, mZero, 1);
  const letzterTag = isoDay(y, mZero, tageImMonat);

  const sortiert = [...zeitraeume].sort((a, b) => {
    if (a.start_datum !== b.start_datum) {
      return a.start_datum < b.start_datum ? -1 : 1;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const out: Record<string, ZeitraumBand[]> = {};
  for (const z of sortiert) {
    // Sichtbares Ende im Monat: echtes Ende, sonst (laufend) das Monatsende.
    const sichtbaresEnde = z.end_datum ?? letzterTag;
    // Ausserhalb des Monats -> ueberspringen.
    if (z.start_datum > letzterTag || sichtbaresEnde < ersterTag) continue;

    const vonTag = z.start_datum > ersterTag ? Number(z.start_datum.slice(8, 10)) : 1;
    const bisTag =
      sichtbaresEnde < letzterTag ? Number(sichtbaresEnde.slice(8, 10)) : tageImMonat;

    for (let d = vonTag; d <= bisTag; d++) {
      const iso = isoDay(y, mZero, d);
      const band: ZeitraumBand = {
        id: z.id,
        typ: z.typ,
        isStart: iso === z.start_datum,
        isEnd: z.end_datum !== null && iso === z.end_datum,
      };
      (out[iso] ??= []).push(band);
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
