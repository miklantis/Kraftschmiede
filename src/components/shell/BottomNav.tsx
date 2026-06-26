import { Link } from "@tanstack/react-router";
import { NAV_ENTRIES } from "@/lib/nav";

// Untere Navigationsleiste fuer Mobile (unter 960px). Sichtbarkeit steuert die
// AppShell. Nur Icons (kein Label); das Label dient als aria-label/Titel fuer
// Bedienhilfen. Einstellungen sitzt separat im Kopf (Konto-Symbol).
// Optik: Hintergrund in Akzentgruen (bg-primary), Icons weiss mit Transparenz (text-white/55),
// aktives Icon voll weiss. Dezente helle obere Kante (border-white/15) plus oberer Schatten.
export function BottomNav(): React.ReactElement {
  return (
    <nav
      className="ks-botnav bg-primary border-white/15 fixed inset-x-0 bottom-0 z-[86] flex border-t px-1.5 pt-2.5 shadow-[0_-11px_26px_-8px_rgba(10,12,22,0.34)] transition-transform duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
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
            className="flex flex-1 items-center justify-center py-2 text-white/55 transition-colors"
            activeProps={{ className: "text-white" }}
          >
            <Icon className="size-[27px] shrink-0" />
          </Link>
        );
      })}
    </nav>
  );
}
