// Muskel-Region-Registry und reine Aggregations-Helfer.
//
// Quelle der Wahrheit fuer die Bedeutung der SVG-Regionen: NICHT die SVG
// (Illustrator strippt Zusatz-Attribute beim Export), sondern diese Registry.
// Die SVG (src/assets/body-muscles.svg) liefert nur Form + id; alle Labels,
// Gruppen und Aggregationsregeln leben hier. Portiert 1:1 aus V1
// (js/muscles.js + js/data.js: MUSCLES, MUSCLE_SECTIONS, MUSCLE_LOAD).
//
// Reine Logik ohne DOM/DB-Bezug: die Render-Komponente (Phase 8, Schritt 2)
// faerbt anhand der hier erzeugten Region->Wert-Map; die Beteiligung pro Uebung
// kommt zur Laufzeit aus der DB-Tabelle exercise_muscles (region_id, kategorie).

import type { MuscleKategorie } from "@/schemas";

export type MuscleView = "front" | "back";

// Grobe Gruppe je Region (fuer Aggregation und spaeteres Muskelkater-Shading).
export type MuscleGroup =
  | "schultern"
  | "ruecken"
  | "arme"
  | "brust"
  | "core"
  | "gesaess"
  | "beine";

// Sektion = groebste Ebene (abgeleitet ueber Gruppen). Bewusste Ueberlappung
// (arme liegt auch im oberkoerper); reiner Eingabe-Komfort, kein striktes Modell.
export type MuscleSection = "oberkoerper" | "unterkoerper" | "arme";

export interface MuscleRegion {
  id: string;
  view: MuscleView;
  group: MuscleGroup;
  labels: { de: string; en: string };
}

// 14 Regionen (8 Back, 6 Front) – exakt die id's der Master-SVG.
export const MUSCLES: readonly MuscleRegion[] = [
  // Rueckansicht (back)
  { id: "schultern_hinten", view: "back", group: "schultern", labels: { de: "Schultern hinten", en: "Rear Delts" } },
  { id: "trapez", view: "back", group: "ruecken", labels: { de: "Trapez / oberer Rücken", en: "Trapezius" } },
  { id: "ruecken_mitte", view: "back", group: "ruecken", labels: { de: "Mittlerer Rücken", en: "Mid Back" } },
  { id: "latissimus", view: "back", group: "ruecken", labels: { de: "Latissimus", en: "Lats" } },
  { id: "trizeps", view: "back", group: "arme", labels: { de: "Trizeps", en: "Triceps" } },
  { id: "gesaess", view: "back", group: "gesaess", labels: { de: "Gesäß", en: "Glutes" } },
  { id: "beinbeuger", view: "back", group: "beine", labels: { de: "Beinbeuger", en: "Hamstrings" } },
  { id: "waden", view: "back", group: "beine", labels: { de: "Waden", en: "Calves" } },
  // Vorderansicht (front)
  { id: "schultern_vorne", view: "front", group: "schultern", labels: { de: "Schultern vorne", en: "Front Delts" } },
  { id: "bizeps", view: "front", group: "arme", labels: { de: "Bizeps", en: "Biceps" } },
  { id: "brust", view: "front", group: "brust", labels: { de: "Brust", en: "Chest" } },
  { id: "bauch", view: "front", group: "core", labels: { de: "Bauch", en: "Abs" } },
  { id: "bauch_seitlich", view: "front", group: "core", labels: { de: "Seitliche Bauchmuskeln", en: "Obliques" } },
  { id: "quadrizeps", view: "front", group: "beine", labels: { de: "Quadrizeps", en: "Quads" } },
];

// Sektion -> Gruppen. Abgeleitete, groebste Eingabeebene.
export const MUSCLE_SECTIONS: Record<MuscleSection, MuscleGroup[]> = {
  oberkoerper: ["schultern", "ruecken", "arme", "brust", "core"],
  unterkoerper: ["gesaess", "beine"],
  arme: ["arme"],
};

// Kategorische Beteiligung -> Zahl 0..1. EINZIGE Justierstelle.
export const MUSCLE_LOAD: Record<MuscleKategorie, number> = {
  primaer: 1.0,
  sekundaer: 0.55,
  stabilisierend: 0.25,
};

const REGION_IDS = new Set(MUSCLES.map((m) => m.id));

// Schnellzugriff Gruppe -> Region-IDs.
const REGIONS_BY_GROUP: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {};
  for (const m of MUSCLES) (out[m.group] ??= []).push(m.id);
  return out;
})();

export function kategorieToValue(kat: MuscleKategorie): number {
  return MUSCLE_LOAD[kat] ?? 0;
}

export function regionById(id: string): MuscleRegion | null {
  return MUSCLES.find((m) => m.id === id) ?? null;
}

// Region-IDs einer groben Gruppe (z. B. "ruecken" -> trapez, ruecken_mitte, latissimus).
export function regionsForGroup(group: string): string[] {
  return REGIONS_BY_GROUP[group] ?? [];
}

// Region-IDs einer Sektion (groebste Ebene, ueber die Gruppen aufgeloest).
export function regionsForSection(section: string): string[] {
  const groups = MUSCLE_SECTIONS[section as MuscleSection];
  if (!groups) return [];
  return groups.flatMap((g) => regionsForGroup(g));
}

// Beliebig gemischte Werte-Map (Keys auf Region-, Gruppen- ODER Sektionsebene)
// auf eine reine Region->Wert-Map aufloesen.
// Spezifitaet: region schlaegt group schlaegt section (genauer gewinnt).
// Innerhalb derselben Ebene werden mehrere Treffer auf dieselbe Region ueber
// das Maximum zusammengefuehrt. Unbekannte oder nicht-numerische Keys fallen weg.
export function expand(values: Record<string, number>): Record<string, number> {
  const direct: Record<string, number> = {};
  const fromGroup: Record<string, number> = {};
  const fromSection: Record<string, number> = {};

  for (const [key, raw] of Object.entries(values ?? {})) {
    const v = Number(raw);
    if (Number.isNaN(v)) continue;
    if (REGION_IDS.has(key)) {
      direct[key] = v;
    } else if (REGIONS_BY_GROUP[key]) {
      for (const rid of REGIONS_BY_GROUP[key]) {
        fromGroup[rid] = Math.max(fromGroup[rid] ?? 0, v);
      }
    } else if (MUSCLE_SECTIONS[key as MuscleSection]) {
      for (const rid of regionsForSection(key)) {
        fromSection[rid] = Math.max(fromSection[rid] ?? 0, v);
      }
    }
  }

  const out: Record<string, number> = {};
  for (const m of MUSCLES) {
    const rid = m.id;
    if (direct[rid] != null) out[rid] = direct[rid];
    else if (fromGroup[rid] != null) out[rid] = fromGroup[rid];
    else if (fromSection[rid] != null) out[rid] = fromSection[rid];
  }
  return out;
}

// Aus den DB-Zeilen der Tabelle exercise_muscles (region_id -> kategorie) die
// fertige Region->Wert-Map fuer die Komponente bauen. Nullwerte fallen raus.
// Pendant zu V1 valuesForExercise(ex.muscles).
export interface MuscleRowLike {
  region_id: string;
  kategorie: MuscleKategorie;
}
export function muscleValuesFromRows(
  rows: readonly MuscleRowLike[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const w = kategorieToValue(r.kategorie);
    if (w > 0) out[r.region_id] = w;
  }
  return out;
}

// Mehrere Uebungen zu EINER Werte-Karte zusammenfassen ("Schwerpunkt" eines
// Workouts): die Beteiligungswerte je Region ueber alle Uebungen addieren und
// anschliessend an der staerksten Region messen (normiert auf 0..1). So wird
// ein Muskel, der in mehreren Uebungen vorkommt, deutlich kraeftiger gefaerbt
// als einer, der nur einmal stabilisierend mitlaeuft.
//
// Bei genau einer Uebung faellt das Ergebnis mit der Uebungs-Detailseite
// zusammen (Hauptmuskel = 1.0 ist dort schon das Maximum). Uebungen ohne
// hinterlegte Zuordnung tragen nichts bei; ist nichts hinterlegt, kommt eine
// leere Karte zurueck (= nur graue Silhouette). Eingaben duerfen wie ueberall
// Region-, Gruppen- oder Sektions-Keys mischen, expand() loest sie auf.
export function aggregateMuscleValues(
  perExercise: readonly Record<string, number>[],
): Record<string, number> {
  const sums: Record<string, number> = {};
  for (const values of perExercise) {
    for (const [region, v] of Object.entries(expand(values))) {
      if (!(v > 0)) continue;
      sums[region] = (sums[region] ?? 0) + v;
    }
  }
  const werte = Object.values(sums);
  if (werte.length === 0) return {};
  const max = Math.max(...werte);
  if (max <= 0) return {};
  const out: Record<string, number> = {};
  for (const [region, sum] of Object.entries(sums)) out[region] = sum / max;
  return out;
}
