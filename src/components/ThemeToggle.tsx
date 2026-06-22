import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme, type Theme } from "@/lib/theme";

// Schaltet die Darstellung der Reihe nach durch: hell -> dunkel -> system -> hell.
// Zwei Auspraegungen: "button" (mit Beschriftung, z. B. Einstellungen) und
// "icon" (nur Symbol, z. B. Sidebar-Fuss / Mobile-Kopf).
const NEXT: Record<Theme, Theme> = {
  light: "dark",
  dark: "system",
  system: "light",
};

const LABEL: Record<Theme, string> = {
  light: "Hell",
  dark: "Dunkel",
  system: "System",
};

export function ThemeToggle({
  variant = "button",
}: {
  variant?: "button" | "icon";
}): React.ReactElement {
  const { theme, setTheme } = useTheme();
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  const label = `Darstellung: ${LABEL[theme]}. Klicken zum Umschalten.`;

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setTheme(NEXT[theme])}
        aria-label={label}
        title={label}
      >
        <Icon />
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setTheme(NEXT[theme])}
      aria-label={label}
    >
      <Icon />
      {LABEL[theme]}
    </Button>
  );
}
