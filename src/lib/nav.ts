import { Dumbbell, Map, ListChecks, Ruler, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Einzige Quelle fuer die Hauptnavigation. Sidebar (Desktop) und Bottom-Nav
// (Mobile) lesen beide aus dieser Liste, damit sie nie auseinanderlaufen.
// Einstellungen ist bewusst NICHT hier, sondern ueber das Konto-Symbol
// erreichbar (wie in V1).
export interface NavEntry {
  /** Zielroute (muss zu einer Datei in src/routes passen). */
  readonly to: string;
  /** Sichtbares Label (Domaenensprache deutsch). */
  readonly label: string;
  /** Lucide-Icon-Komponente. */
  readonly icon: LucideIcon;
  /** Nur die Startroute soll exakt matchen, sonst waere sie ueberall aktiv. */
  readonly exact?: boolean;
}

export const NAV_ENTRIES: readonly NavEntry[] = [
  { to: "/", label: "Training", icon: Dumbbell, exact: true },
  { to: "/journey", label: "Journey", icon: Map },
  { to: "/uebungen", label: "Übungen", icon: ListChecks },
  { to: "/koerper", label: "Körper", icon: Ruler },
  { to: "/skills", label: "Skills", icon: Zap },
];
