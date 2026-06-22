import { Link } from "@tanstack/react-router";
import { NAV_ENTRIES } from "@/lib/nav";

// Untere Navigationsleiste fuer Mobile (unter 960px). Sichtbarkeit steuert die
// AppShell. Sechs Punkte; Einstellungen sitzt separat im Kopf (Konto-Symbol).
export function BottomNav(): React.ReactElement {
  return (
    <nav
      className="bg-card/95 border-border fixed inset-x-0 bottom-0 z-30 flex border-t backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {NAV_ENTRIES.map((entry) => {
        const Icon = entry.icon;
        return (
          <Link
            key={entry.to}
            to={entry.to}
            activeOptions={entry.exact ? { exact: true } : undefined}
            className="text-muted-foreground flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors"
            activeProps={{ className: "text-primary" }}
          >
            <Icon className="size-6 shrink-0" />
            <span className="leading-none">{entry.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
