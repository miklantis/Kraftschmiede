// Einheit einer Skill-Metrik fuer Ziel-Anzeigen ("3 × 8 Wdh.", "3 × 30 Sek.").
export function skillMetricUnit(metric: string | null | undefined): string {
  if (metric === "reps") return "Wdh.";
  if (metric === "duration") return "Sek.";
  return "";
}

// Ab dieser Haltezeit wird in Minuten statt in Sekunden angezeigt: lange Ziele
// (z. B. 900) sind als "15 Min." deutlich schneller zu erfassen.
const MINUTEN_AB_SEKUNDEN = 120;

// Haltezeit in Sekunden als lesbare Dauer: unter zwei Minuten in Sekunden,
// darueber in Minuten ("15 Min."), bei krummen Werten mit Sekunden ("2:30 Min.").
// `kurz` liefert die knappe Form fuer die Live-Ansicht ("30 s", "15 min").
export function dauerLabel(sekunden: number, kurz = false): string {
  const sek = Math.max(0, Math.round(sekunden));
  if (sek < MINUTEN_AB_SEKUNDEN) return kurz ? `${sek} s` : `${sek} Sek.`;
  const min = Math.floor(sek / 60);
  const rest = sek % 60;
  const wert = rest === 0 ? String(min) : `${min}:${String(rest).padStart(2, "0")}`;
  return kurz ? `${wert} min` : `${wert} Min.`;
}

// Ziel einer Skill-Uebung als Wert samt Einheit ("8 Wdh.", "30 Sek.", "15 Min.").
export function skillTargetLabel(
  target: number,
  metric: string | null | undefined,
  kurz = false,
): string {
  if (metric === "duration") return dauerLabel(target, kurz);
  if (metric === "reps") return kurz ? `${target} Wdh` : `${target} Wdh.`;
  return String(target);
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
