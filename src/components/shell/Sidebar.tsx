import { Link } from "@tanstack/react-router";
import { Settings2 } from "lucide-react";
import { NAV_ENTRIES } from "@/lib/nav";
import { useHaptics } from "@/hooks/useHaptics";
import { BrandMark } from "./BrandMark";
import { AccountButton } from "./AccountButton";

// Feste Seitenleiste fuer Desktop (ab 960px). Sichtbarkeit steuert die AppShell.
// Optik an V1-"Klar" angeglichen: versaler Markenname mit Sperrung, Nav-Eintraege
// mit 12px-Radius und warmem Grau-Ink (#6c685f, V1-Wert), Akzent-Toenung fuer
// Hover (.06) und Aktiv (.10) wie in V1.
export function Sidebar(): React.ReactElement {
  const { tick } = useHaptics();
  return (
    <aside className="bg-sidebar border-sidebar-border fixed inset-y-0 left-0 z-20 flex w-[264px] flex-col border-r">
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <span className="bg-primary text-primary-foreground rounded-control flex size-9 items-center justify-center">
          <BrandMark size={22} />
        </span>
        <span className="text-[15px] font-bold tracking-[1px] text-[#5c5c61] uppercase">
          Kraftschmiede
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3.5 py-1">
        {NAV_ENTRIES.map((entry) => {
          const Icon = entry.icon;
          return (
            <Link
              key={entry.to}
              to={entry.to}
              activeOptions={entry.exact ? { exact: true } : undefined}
              onClick={tick}
              className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-medium text-[#6c685f] transition-colors outline-none hover:bg-primary/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
              activeProps={{
                className:
                  "bg-primary/10 font-semibold text-primary hover:bg-primary/10 hover:text-primary",
              }}
            >
              <Icon className="size-5 shrink-0" />
              {entry.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-sidebar-border flex items-center gap-2 border-t px-3.5 py-3">
        <div className="min-w-0 flex-1">
          <AccountButton variant="full" />
        </div>
        <Link
          to="/einstellungen"
          aria-label="Einstellungen"
          className="rounded-control flex size-10 items-center justify-center text-[#6c685f] transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
          activeProps={{ className: "bg-primary/10 text-primary" }}
        >
          <Settings2 className="size-5" />
        </Link>
      </div>
    </aside>
  );
}
