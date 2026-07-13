import type { Focus } from "@/schemas/shared";

// Anzeigename des Periodisierungs-Fokus (Domaenensprache deutsch, 1:1 aus V1).
const FOCUS_LABELS: Record<Focus, string> = {
  reentry: "Wiedereinstieg",
  hypertrophy: "Hypertrophie",
  strength: "Maximalkraft",
  power: "Intensivierung",
  endurance: "Kraftausdauer",
  test: "Test/Peak",
  maintenance: "Erhaltung",
};

export function focusLabel(focus: Focus | string | null | undefined): string {
  if (!focus) return "";
  return FOCUS_LABELS[focus as Focus] ?? String(focus);
}

// Einheit einer Skill-Metrik fuer Ziel-Anzeigen ("3 × 8 Wdh.", "3 × 30 Sek.").
export function skillMetricUnit(metric: string | null | undefined): string {
  if (metric === "reps") return "Wdh.";
  if (metric === "duration") return "Sek.";
  return "";
}

// Anzeigename der Uebungsart (tier). Ersetzt das fruehere kindLabel.
const TIER_LABELS: Record<string, string> = {
  main: "Hauptübung",
  accessory: "Assistenz",
};
export function tierLabel(tier: string | null | undefined): string {
  if (!tier) return "–";
  return TIER_LABELS[tier] ?? tier;
}

// Anzeigename des Uebungs-Profils (Progressionsart).
const PROFILE_LABELS: Record<string, string> = {
  strength: "Kraft",
  core: "Core",
  bodyweight: "Körpergewicht",
};
export function profileLabel(profile: string | null | undefined): string {
  if (!profile) return "–";
  return PROFILE_LABELS[profile] ?? profile;
}

// Anzeigename des Geraets einer Uebung.
const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: "Langhantel",
  plate: "Hantelscheibe",
  bar: "Stange",
  band: "Band",
  bodyweight: "Körpergewicht",
  dumbbell: "Kurzhantel",
};
export function equipmentLabel(equipment: string | null | undefined): string {
  if (!equipment) return "–";
  return EQUIPMENT_LABELS[equipment] ?? equipment;
}
