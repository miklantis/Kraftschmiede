import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountButton } from "./AccountButton";

// Schlanker Kopf fuer Mobile (unter 960px). Rechts oben Theme-Umschalter und
// Konto-Symbol; die Hauptnavigation liegt unten in der Bottom-Nav.
export function MobileHeader(): React.ReactElement {
  return (
    <header className="flex items-center justify-end gap-1 px-4 pt-3 pb-1">
      <ThemeToggle variant="icon" />
      <AccountButton variant="compact" />
    </header>
  );
}
