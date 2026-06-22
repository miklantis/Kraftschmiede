import { Link } from "@tanstack/react-router";
import { NAV_ENTRIES } from "@/lib/nav";

// Untere Navigationsleiste fuer Mobile (unter 960px). Sichtbarkeit steuert die
// AppShell. Nur Icons (kein Label); das Label dient als aria-label/Titel fuer
// Bedienhilfen. Einstellungen sitzt separat im Kopf (Konto-Symbol).
// Optik an V1-"Klar" angeglichen: deckend weiss (bg-card, kein Weichzeichner),
// weicher oberer Schatten, inaktive Icons in hellem Grau (#b0b0b6, V1-Wert).
export function BottomNav(): React.ReactElement {
  return (
    <nav
      className="bg-card border-border fixed inset-x-0 bottom-0 z-30 flex border-t px-1.5 pt-2.5 shadow-[0_-6px_20px_-14px_rgba(20,24,40,0.25)]"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 18px)" }}
    >
      {NAV_ENTRIES.map((entry) => {
        const Icon = entry.icon;
        return (
          <Link
            key={entry.to}
            to={entry.to}
            activeOptions={entry.exact ? { exact: true } : undefined}
            aria-label={entry.label}
            title={entry.label}
            className="flex flex-1 items-center justify-center py-2 text-[#b0b0b6] transition-colors"
            activeProps={{ className: "text-primary" }}
          >
            <Icon className="size-6 shrink-0" />
          </Link>
        );
      })}
    </nav>
  );
}
