// Was aus dem eigenen Bestand zu einer Uebung passt (Vorhaben #440).
//
// Reine Regel ohne DB- oder DOM-Bezug, gleiche Bauform wie lib/stangen.ts: sie
// nimmt die Uebung und die Bestaende und sagt, welcher Inhalt im Abschnitt
// "Inventar" der Uebungsseite steht.
//
// Die Zulassung der Stangen wird hier NICHT neu entschieden, sondern aus
// lib/stangen.ts geliehen - dieselbe Fassung, die das Auswahlfeld der laufenden
// Einheit und der Coach lesen. Eine zweite Regel wuerde genau den Widerspruch
// erzeugen, den dieser Abschnitt aufloesen soll: die Seite darf nie eine Stange
// zeigen, die die Einheit dann nicht anbietet.
//
// Die Bestaende kommen hier in der Schreibweise der Datenbank herein
// (bar_length, allowed_bar_lengths). Die Uebersetzung in die camelCase-Form der
// Regel passiert an dieser einen Stelle, damit die Komponente nichts umbauen
// muss.

import {
  hatBevorzugung,
  stangeIstBevorzugt,
  zugelasseneStangen,
} from "./stangen";
import type { BarLength, BarShape, ExerciseEquipment } from "@/schemas";

/** Die Uebung, so viel von ihr wie der Abschnitt braucht (DB-Schreibweise). */
export interface InventarUebung {
  equipment: ExerciseEquipment;
  allowed_bar_lengths?: readonly BarLength[] | null;
  allowed_bar_shapes?: readonly BarShape[] | null;
  preferred_bar_length?: BarLength | null;
  preferred_bar_shape?: BarShape | null;
}

/** Eine Stange des Bestands (inventory_bars). */
export interface InventarBar {
  id: string;
  name: string;
  weight: number;
  bar_length: BarLength;
  bar_shape: BarShape;
}

/** Ein Eintrag der Geraete-Liste (inventory_equipment). */
export interface InventarGeraet {
  key: string;
  label: string;
  active: boolean;
}

/** Die Bestaende, wie sie die Inventar-Hooks liefern. */
export interface InventarBestand {
  bars: readonly InventarBar[];
  plates: readonly { weight: number }[];
  dumbbells: readonly { weight: number }[];
  kettlebells: readonly { weight: number }[];
  equipment: readonly InventarGeraet[];
}

/** Eine Stange, wie der Abschnitt sie zeigt: Bauart bleibt roh, das Etikett
 *  baut die Komponente (barBuildLabel). */
export interface InventarStange {
  id: string;
  name: string;
  weight: number;
  barLength: BarLength;
  barShape: BarShape;
  /** Nur gesetzt, wenn die Uebung ueberhaupt eine Bevorzugung hinterlegt hat -
   *  ohne sie waere jede Stange "bevorzugt" und der Vermerk wertlos. */
  bevorzugt: boolean;
}

/** Der Inhalt des Abschnitts, je Geraet der Uebung ein anderer. */
export type InventarInhalt =
  | { art: "stangen"; stangen: InventarStange[]; scheiben: number[] }
  | { art: "kurzhanteln"; gewichte: number[] }
  | { art: "zusatzlast"; scheiben: number[]; kettlebells: number[] }
  | { art: "ausstattung"; geraete: string[] };

export interface InventarAnsicht {
  inhalt: InventarInhalt;
  /** Nichts Passendes im Bestand. Der Abschnitt sagt das dann offen, statt
   *  eine leere Liste zu zeigen. */
  leer: boolean;
  /** Aussage fuer den leeren Fall. Bei der Langhantel wortgleich mit der
   *  laufenden Einheit, damit beide Orte dasselbe sagen. */
  leerText: string;
}

// Welche Eintraege aus inventory_equipment zu einem Geraet der Uebung gehoeren.
// Die Schluessel stammen aus dem Seed (equipmentSeeds). Bewusst nur das im
// Geraet genannte: eine Band-Uebung zeigt Baender, keine Klimmzugstange -
// geraten wird hier nichts.
const AUSSTATTUNG: Partial<
  Record<ExerciseEquipment, { keys: readonly string[]; leerText: string }>
> = {
  bar: { keys: ["pullup-bar"], leerText: "Keine Klimmzugstange im Bestand" },
  band: {
    keys: ["band-light", "band-medium", "band-heavy"],
    leerText: "Kein Band im Bestand",
  },
};

const gewichte = (rows: readonly { weight: number }[]): number[] =>
  rows.map((r) => r.weight).sort((a, b) => a - b);

/**
 * Der Inventar-Abschnitt fuer diese Uebung - oder `null`, wenn es zu ihrem
 * Geraet nichts im Bestand gibt, worauf sie sich bezieht (Koerpergewicht).
 * Dann entfaellt der Abschnitt ganz, statt eine leere Huelle zu zeigen.
 */
export function uebungInventar(
  uebung: InventarUebung,
  bestand: InventarBestand,
): InventarAnsicht | null {
  if (uebung.equipment === "barbell") {
    const voraussetzung = {
      allowedBarLengths: uebung.allowed_bar_lengths,
      allowedBarShapes: uebung.allowed_bar_shapes,
    };
    const bevorzugung = {
      preferredBarLength: uebung.preferred_bar_length,
      preferredBarShape: uebung.preferred_bar_shape,
    };
    const mitBauart = bestand.bars.map((b) => ({
      ...b,
      barLength: b.bar_length,
      barShape: b.bar_shape,
    }));
    const markiert = hatBevorzugung(bevorzugung);
    const erlaubt = zugelasseneStangen(mitBauart, voraussetzung).map((b) => ({
      id: b.id,
      name: b.name,
      weight: b.weight,
      barLength: b.barLength,
      barShape: b.barShape,
      bevorzugt: markiert && stangeIstBevorzugt(b, bevorzugung),
    }));
    // Bevorzugte zuerst, darunter der Rest in der Reihenfolge des Bestands
    // (position). Die Bevorzugung entscheidet nur die Reihenfolge, nie die
    // Zulassung - genau wie in lib/stangen.ts beschrieben.
    const stangen = [
      ...erlaubt.filter((s) => s.bevorzugt),
      ...erlaubt.filter((s) => !s.bevorzugt),
    ];
    return {
      inhalt: { art: "stangen", stangen, scheiben: gewichte(bestand.plates) },
      leer: stangen.length === 0,
      leerText: "Keine passende Stange im Bestand",
    };
  }

  if (uebung.equipment === "dumbbell") {
    const gew = gewichte(bestand.dumbbells);
    return {
      inhalt: { art: "kurzhanteln", gewichte: gew },
      leer: gew.length === 0,
      leerText: "Keine Kurzhanteln im Bestand",
    };
  }

  if (uebung.equipment === "plate") {
    const scheiben = gewichte(bestand.plates);
    const kettlebells = gewichte(bestand.kettlebells);
    return {
      inhalt: { art: "zusatzlast", scheiben, kettlebells },
      leer: scheiben.length === 0 && kettlebells.length === 0,
      leerText: "Keine Scheiben oder Kettlebells im Bestand",
    };
  }

  const ausstattung = AUSSTATTUNG[uebung.equipment];
  if (!ausstattung) return null;
  // Nur was vorhanden ist (active). Reihenfolge bleibt die des Inventars.
  const geraete = bestand.equipment
    .filter((e) => e.active && ausstattung.keys.includes(e.key))
    .map((e) => e.label);
  return {
    inhalt: { art: "ausstattung", geraete },
    leer: geraete.length === 0,
    leerText: ausstattung.leerText,
  };
}
