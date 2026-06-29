import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { PageReveal } from "@/components/ui/page-reveal";
import { BackLink } from "@/components/ui/back-link";
import { fetchChangelogVersions } from "@/lib/changelog";
import { longDateYearDE } from "@/lib/format";

// Versionsverlauf. Eigenstaendige Vollseite (entschachtelt mit _), erreichbar
// ueber den App-Version-Block in den Einstellungen. Zeigt alle Versionen aus
// public/changelog.json (newest-first) mit ihren Aenderungen als schlichten
// Text - bewusst ohne Karten/Hintergruende, nur Text auf dem Seitenhintergrund.
// Oben ein Zurueck-Link zu den Einstellungen.
export const Route = createFileRoute("/einstellungen_/version")({
  component: VersionHistoryPage,
});

function VersionHistoryPage(): React.ReactElement {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["changelog-all"],
    queryFn: fetchChangelogVersions,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const versions = data ?? [];

  return (
    <div>
      <BackLink to="/einstellungen" label="Einstellungen" />
      <PageHeader title="Versionsverlauf" hideAccount />

      <PageReveal>
        {isLoading && (
          <p className="text-sm text-muted-foreground">Wird geladen …</p>
        )}

        {isError && (
          <p className="text-sm text-danger">
            Der Versionsverlauf konnte nicht geladen werden.
          </p>
        )}

        {!isLoading && !isError && versions.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Noch kein Versionsverlauf vorhanden.
          </p>
        )}

        <div className="flex flex-col gap-7">
          {versions.map((v) => (
            <section key={v.version}>
              <h2 className="text-[17px] font-semibold tracking-[-0.2px] text-foreground">
                Version {v.version}
              </h2>
              <div className="mb-2.5 text-[13px] font-medium text-muted-foreground">
                {longDateYearDE(v.date)}
              </div>
              <div className="flex flex-col gap-2.5">
                {v.changes.map((change, i) => (
                  <p
                    key={i}
                    className="text-[15px] leading-[1.5] text-muted-foreground"
                  >
                    {change}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </PageReveal>
    </div>
  );
}
