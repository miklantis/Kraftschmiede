import { Section } from "@/components/ui/section";
import { PhaseBar } from "@/components/ui/phase-bar";
import type { FastenbegleiterView } from "@/hooks/useFastenbegleiter";

// Der Fastenbegleiter auf der Trainingsseite (Vorhaben #503): steht an
// Heilfasten-Tagen an der Stelle von Empfehlung, Workouts und Skills. Der Kopf
// ist gebaut wie der der Workout-Empfehlung (#507): gross „Heilfasten“ an der
// Stelle des Workout-Namens, rechts gross der Tag an der Stelle des Scores -
// damit auf einen Blick klar ist, dass gerade gefastet wird. Darunter Dauer
// und Ende, der Tagesbalken (ein Segment je Tag), der Text des Tages aus der
// Datenbank in drei Teilen und der feste Fuss mit dem persoenlichen
// Buchinger-Rahmen und den Warnzeichen - an jedem Tag gleich.
//
// Die Karte steht gleichrangig an der Stelle der Workout-Empfehlung und hat
// darum deren Optik (#505): weisse Karte mit weicher Elevation, der Tagestitel
// so gross wie der Workout-Name, kein eigener Farbton. Sie zeigt nur an: keine
// Eingaben, keine Haekchen.

const TEIL_LABEL =
  "text-[13px] font-semibold tracking-[0.3px] text-muted-foreground";
const TEIL_TEXT =
  "mt-1 text-[15px] leading-[1.5] text-foreground min-[960px]:text-base";

function Teil({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="mt-4">
      <div className={TEIL_LABEL}>{label}</div>
      {children}
    </div>
  );
}

export function FastenBegleiter({
  view,
}: {
  view: FastenbegleiterView;
}): React.ReactElement {
  const { tag, von, bisLabel, text } = view;
  const stand = von === null ? "Fastentag " + tag : "Fastentag " + tag + " von " + von;
  const unterzeile =
    von === null ? "Ohne festes Ende" : von + " Tage · bis " + bisLabel;

  return (
    <Section eyebrow="Fastenbegleiter">
      <div className="rounded-[22px] bg-card p-5 shadow-hi min-[960px]:px-7 min-[960px]:py-[26px]">
        <div className="flex items-start justify-between gap-[14px]">
          <div className="min-w-0">
            <div className="text-[22px] font-bold text-foreground min-[960px]:text-[30px] min-[960px]:tracking-[-0.4px]">
              Heilfasten
            </div>
            <div className="mt-0.5 text-[15px] leading-[1.5] text-foreground-secondary min-[960px]:text-base">
              {unterzeile}
            </div>
          </div>
          <div className="flex-none text-right" aria-label={stand}>
            <div className="text-[13px] font-medium text-muted-foreground">
              Tag
            </div>
            <div className="font-mono text-[22px] leading-none font-bold text-primary tabular-nums min-[960px]:text-[30px] min-[960px]:leading-[1.05]">
              {tag}
            </div>
          </div>
        </div>
        {von !== null && (
          <PhaseBar
            index={tag - 1}
            count={von}
            ariaLabel={stand}
            className="mt-3.5"
          />
        )}

        {text ? (
          <>
            <h3 className="mt-5 text-[17px] font-semibold leading-snug text-foreground min-[960px]:text-[19px]">
              {text.titel}
            </h3>
            <Teil label="Im Körper">
              <p className={TEIL_TEXT}>{text.koerper}</p>
            </Teil>
            <Teil label="So kannst du dich fühlen">
              <p className={TEIL_TEXT}>{text.gefuehl}</p>
            </Teil>
            {text.wichtig.length > 0 && (
              <Teil label="Heute wichtig">
                <ul className={TEIL_TEXT + " list-disc space-y-1 pl-5"}>
                  {text.wichtig.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </Teil>
            )}
          </>
        ) : (
          <p className="mt-3.5 text-[15px] text-muted-foreground">
            Der Text für heute wird geladen …
          </p>
        )}

        <div className="mt-5 space-y-1.5 border-t border-border pt-3.5 text-[13px] leading-snug text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Dein Rahmen:</span>{" "}
            Tee und Wasser über den Tag, eine Gemüsebrühe, bei Schwäche ½ TL
            Honig in den Tee.
          </p>
          <p>
            <span className="font-semibold text-foreground">Warnzeichen:</span>{" "}
            Herzrasen, starker Schwindel, Ohnmachtsgefühl oder Verwirrtheit –
            dann das Fasten beenden und ärztlich abklären lassen.
          </p>
        </div>
      </div>
    </Section>
  );
}
