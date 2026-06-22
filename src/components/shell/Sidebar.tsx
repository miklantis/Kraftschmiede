import { Link } from "@tanstack/react-router";
import { Settings2 } from "lucide-react";
import { NAV_ENTRIES } from "@/lib/nav";
import { BrandMark } from "./BrandMark";
import { AccountButton } from "./AccountButton";
import { ThemeToggle } from "@/components/ThemeToggle";

// Feste Seitenleiste fuer Desktop (ab 960px). Sichtbarkeit steuert die AppShell.
export function Sidebar(): React.ReactElement {
  return (
    <aside className="bg-sidebar border-sidebar-border fixed inset-y-0 left-0 z-20 flex w-[264px] flex-col border-r">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-xl">
          <BrandMark size={20} />
        </span>
        <span className="text-sidebar-foreground text-base font-semibold tracking-tight">
          Kraftschmiede
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {NAV_ENTRIES.map((entry) => {
          const Icon = entry.icon;
          return (
            <Link
              key={entry.to}
              to={entry.to}
              activeOptions={entry.exact ? { exact: true } : undefined}
              className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-ring/30 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3"
              activeProps={{
                className:
                  "bg-primary/12 text-primary hover:bg-primary/12 hover:text-primary",
              }}
            >
              <Icon className="size-5 shrink-0" />
              {entry.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-sidebar-border flex items-center gap-1 border-t px-3 py-3">
        <div className="min-w-0 flex-1">
          <AccountButton variant="full" />
        </div>
        <ThemeToggle variant="icon" />
        <Link
          to="/einstellungen"
          aria-label="Einstellungen"
          className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-ring/30 flex size-9 items-center justify-center rounded-full outline-none focus-visible:ring-3"
          activeProps={{ className: "bg-primary/12 text-primary" }}
        >
          <Settings2 className="size-5" />
        </Link>
      </div>
    </aside>
  );
}
