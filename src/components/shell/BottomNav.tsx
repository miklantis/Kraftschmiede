import { Link } from "@tanstack/react-router";
import { NAV_ENTRIES } from "@/lib/nav";

// Untere Navigationsleiste fuer Mobile (unter 960px). Sichtbarkeit steuert die
// AppShell. Nur Icons (kein Label); das Label dient als aria-label/Titel fuer
// Bedienhilfen. Einstellungen sitzt separat im Kopf (Konto-Symbol).
// Optik an V1-"Klar": heller Hintergrund (bg-card), inaktive Icons hellgrau (text-foreground-faint),
// aktives Icon in Akzentgruen (text-primary). Farbe getrennt ueber inactiveProps/activeProps
// (kein konkurrierendes text-* in der Basisklasse). Dezenter oberer Schatten zur Abgrenzung.
export function BottomNav(): React.ReactElement {
  return (
    <nav
      className="ks-botnav bg-card border-border fixed inset-x-0 bottom-0 z-[86] flex border-t px-1.5 pt-2.5 shadow-nav transition-transform duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 22px)" }}
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
            className="flex flex-1 items-center justify-center py-2 transition-colors"
            inactiveProps={{ className: "text-foreground-faint" }}
            activeProps={{ className: "text-primary" }}
          >
            <Icon className="size-[27px] shrink-0" />
          </Link>
        );
      })}
    </nav>
  );
}
