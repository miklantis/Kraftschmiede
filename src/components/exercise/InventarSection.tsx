import { Link } from "@tanstack/react-router";
import { Section } from "@/components/ui/section";
import { SettingsGroup, SettingRow } from "@/components/ui/setting-list";
import {
  useBars,
  useDumbbells,
  useEquipment,
  useKettlebells,
  usePlates,
} from "@/hooks/useInventory";
import { fmtKg } from "@/lib/format";
import { barBuildLabel } from "@/lib/labels";
import { uebungInventar, type InventarUebung } from "@/lib/uebungInventar";

// Abschnitt "Passend aus dem Inventar" auf der Uebungs-Detailseite (#440).
// Zeigt, womit genau diese Uebung aus dem eigenen Bestand ausfuehrbar ist -
// bei der Langhantel also nur die zugelassenen Stangen, nicht den ganzen
// Bestand. Bis #440 stand diese Zuordnung nur im Auswahlfeld der laufenden
// Einheit, also erst mitten im Training.
//
// Rein anzeigend: hier wird nichts am Inventar geaendert (das bleibt in den
// Einstellungen) und keine Uebung gesperrt (das ist #438). Der Verweis auf die
// Einstellungen erscheint nur im leeren Fall - dort, wo er etwas loest.
//
// Was gezeigt wird, entscheidet lib/uebungInventar.ts; die Stangen-Zulassung
// kommt von dort aus lib/stangen.ts, derselben Fassung wie in der Einheit.
// Optik der Reihen wie im Inventar der Einstellungen (SettingsGroup), damit
// beide Orte dieselbe Liste gleich zeigen.
export function InventarSection({
  exercise,
  unit,
  className,
}: {
  exercise: InventarUebung;
  unit: string;
  className?: string;
}): React.ReactElement | null {
  // Alle Bestaende auf einmal: die Abfragen sind klein, liegen im Cache der
  // Einstellungen und duerfen nicht bedingt aufgerufen werden (Hook-Regel).
  const barsQ = useBars();
  const platesQ = usePlates();
  const dumbbellsQ = useDumbbells();
  const kettlebellsQ = useKettlebells();
  const equipmentQ = useEquipment();

  const ansicht = uebungInventar(exercise, {
    bars: barsQ.data ?? [],
    plates: platesQ.data ?? [],
    dumbbells: dumbbellsQ.data ?? [],
    kettlebells: kettlebellsQ.data ?? [],
    equipment: equipmentQ.data ?? [],
  });

  // Koerpergewicht-Uebungen haben keinen Bezug zum Bestand - kein Abschnitt.
  if (!ansicht) return null;

  const liste = (werte: number[]): string =>
    werte.map((w) => fmtKg(w)).join(" · ") + " " + unit;

  // Solange die Bestaende laden, waere jede Liste leer - und der Abschnitt
  // wuerde faelschlich "nichts im Bestand" behaupten.
  const laedt =
    barsQ.isLoading ||
    platesQ.isLoading ||
    dumbbellsQ.isLoading ||
    kettlebellsQ.isLoading ||
    equipmentQ.isLoading;

  return (
    <Section eyebrow="Passend aus dem Inventar" className={className}>
      {laedt ? (
        <p className="text-sm text-muted-foreground">Wird geladen …</p>
      ) : ansicht.leer ? (
        <>
          <SettingsGroup>
            <SettingRow
              label={
                <span className="text-muted-foreground">{ansicht.leerText}</span>
              }
            />
          </SettingsGroup>
          <Link
            to="/einstellungen"
            className="mt-2 self-start text-[13px] font-semibold text-primary transition-colors hover:text-primary/80"
          >
            Inventar öffnen
          </Link>
        </>
      ) : (
        <SettingsGroup>
          {ansicht.inhalt.art === "stangen" && (
            <>
              {ansicht.inhalt.stangen.map((s) => (
                <SettingRow
                  key={s.id}
                  label={
                    <>
                      {s.name}
                      {s.bevorzugt && (
                        <span className="ml-2 rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          bevorzugt
                        </span>
                      )}
                    </>
                  }
                  description={barBuildLabel(s.barLength, s.barShape)}
                >
                  <span className="font-mono text-sm text-muted-foreground tabular-nums">
                    {fmtKg(s.weight)} {unit}
                  </span>
                </SettingRow>
              ))}
              {ansicht.inhalt.scheiben.length > 0 && (
                <SettingRow
                  label="Scheiben · pro Seite"
                  description={liste(ansicht.inhalt.scheiben)}
                />
              )}
            </>
          )}

          {ansicht.inhalt.art === "kurzhanteln" && (
            <SettingRow
              label="Kurzhanteln · je Hand"
              description={liste(ansicht.inhalt.gewichte)}
            />
          )}

          {ansicht.inhalt.art === "zusatzlast" && (
            <>
              {ansicht.inhalt.scheiben.length > 0 && (
                <SettingRow
                  label="Scheiben"
                  description={liste(ansicht.inhalt.scheiben)}
                />
              )}
              {ansicht.inhalt.kettlebells.length > 0 && (
                <SettingRow
                  label="Kettlebells"
                  description={liste(ansicht.inhalt.kettlebells)}
                />
              )}
            </>
          )}

          {ansicht.inhalt.art === "ausstattung" &&
            ansicht.inhalt.geraete.map((g) => <SettingRow key={g} label={g} />)}
        </SettingsGroup>
      )}
    </Section>
  );
}
