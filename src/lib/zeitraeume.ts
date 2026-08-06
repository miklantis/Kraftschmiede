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
