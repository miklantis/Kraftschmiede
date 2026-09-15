import { Check, Target } from "lucide-react";
import { Section } from "@/components/ui/section";
import { List, ListRow } from "@/components/ui/list";
import type { TestWeekView } from "@/hooks/useTrainingOverview";

// Die Testwoche auf dem Trainingsbildschirm (#240, Schritt 3): oben der
// Hinweis, dass die Woche laeuft und wann sie endet, darunter die Hauptuebungen
// mit direktem Test-Start.
//
// Der Kasten hat die Optik des Wochenplan-Hinweises (PlanNoteBanner) - in einer
// Woche ohne Plan steht hier, was sonst dort steht, damit der Bildschirm nicht
// zwei Sprachen spricht.
//
// Die Liste entscheidet nichts. Sie zeigt nur, was diese Woche schon getestet
// ist, und kuerzt den Weg dorthin ab; die Woche endet am Sonntag, unabhaengig
// davon, was noch offen steht. Eine schon getestete Uebung bleibt darum
// startbar - ein zweiter Versuch ist erlaubt.
//
// Getestet ist der einzige Zustand, der sich in der Liste abheben muss (#472):
// das Haekchen sitzt darum dick in einem weichen gruenen Kreis - derselbe
// Marker-Gedanke wie beim JourneyChip - und die Unterzeile traegt die
// Erfolgsfarbe statt Grau.
export function TestWeekPanel({
  view,
  onStart,
  blocked,
}: {
  view: TestWeekView;
  onStart: (exerciseId: string) => void;
  /** Laeuft bereits eine Einheit? Dann ist der Test-Start gesperrt. */
  blocked: boolean;
}): React.ReactElement {
  return (
    <Section eyebrow="Testwoche">
      <div className="rounded-[14px] border border-primary/30 bg-primary/10 px-4 py-3">
        <div className="text-[14px] font-semibold leading-snug text-foreground">
          Testwoche – bis {view.untilLabel}
        </div>
        <div className="mt-1.5 text-[13px] leading-snug text-foreground">
          Keine Vorgabe in dieser Woche. Am Sonntag ist die Journey durchlaufen –
          ob getestet wurde oder nicht.
        </div>
        <div className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground">
          Trainieren ist erlaubt: die Einheit zählt zur Journey und ändert am
          Ablauf nichts.
        </div>
      </div>

      {view.exercises.length > 0 && (
        <>
          <div className="mt-3 mb-2 flex items-baseline justify-between gap-3">
            <span className="text-[13px] font-semibold text-foreground">
              Hauptübungen
            </span>
            <span className="text-[13px] text-muted-foreground">
              {view.stand}
            </span>
          </div>
          <List bordered>
            {view.exercises.map((ex) => (
              <ListRow
                key={ex.id}
                title={ex.name}
                subtitle={
                  ex.tested ? (
                    <span className="font-medium text-good">
                      Diese Woche getestet
                    </span>
                  ) : (
                    "1RM testen"
                  )
                }
                leading={<Target />}
                trailing={
                  ex.tested ? (
                    <span
                      role="img"
                      aria-label="Diese Woche getestet"
                      className="inline-flex size-7 flex-none items-center justify-center rounded-full bg-good/12 text-good"
                    >
                      <Check
                        className="size-[17px]"
                        strokeWidth={3}
                        aria-hidden
                      />
                    </span>
                  ) : undefined
                }
                chevron
                disabled={blocked}
                ariaLabel={"1RM testen: " + ex.name}
                onClick={blocked ? undefined : () => onStart(ex.id)}
              />
            ))}
          </List>
          {blocked && (
            <p className="mt-2 text-[13px] text-muted-foreground">
              Es läuft bereits eine Einheit – beende sie zuerst.
            </p>
          )}
        </>
      )}
    </Section>
  );
}
