import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Info, ChevronRight } from "lucide-react";
import { fetchLatestChangelog } from "@/lib/changelog";
import { longDateYearDE } from "@/lib/format";

// Versions-Panel auf der Einstellungen-Seite, ganz am Seitenende. Zeigt die
// aktuelle App-Version samt Datum (Quelle: public/changelog.json). Antippen
// fuehrt auf die Versionsverlauf-Unterseite (alle Versionen mit Aenderungen).
// Das "Was ist neu"-Popup bleibt bestehen, wird aber nur noch beim App-Start
// als Update-Hinweis gebraucht - nicht mehr von hier aus geoeffnet.
//
// Eigene Query (gecacht, beim Mount geladen): die Version soll hier dauerhaft
// sichtbar sein.
export function AppVersionCard(): React.ReactElement {
  const { data: entry } = useQuery({
    queryKey: ["app-version"],
    queryFn: fetchLatestChangelog,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const versionText =
    entry != null
      ? `Version ${entry.version} · ${longDateYearDE(entry.date)}`
      : "Version wird geladen …";

  return (
    <div className="rounded-card bg-card shadow-card">
      <Link
        to="/einstellungen/version"
        className="flex w-full items-center gap-3 p-4 text-left transition-[filter] hover:brightness-[0.99]"
      >
        <span className="flex size-11 flex-none items-center justify-center rounded-full bg-primary/12 text-primary">
          <Info className="size-5" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold text-foreground">
            App-Version
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {versionText}
          </span>
        </span>
        <ChevronRight className="ml-auto size-[18px] flex-none text-[#a0a0a5]" />
      </Link>
    </div>
  );
}
