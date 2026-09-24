import { Section } from "@/components/ui/section";
import { PhaseBar } from "@/components/ui/phase-bar";
import type { FastenbegleiterView } from "@/hooks/useFastenbegleiter";

// Der Fastenbegleiter auf der Trainingsseite (Vorhaben #503): steht an
// Heilfasten-Tagen an der Stelle von Empfehlung, Workouts und Skills. Oben der
// Stand („Fastentag 4 von 14“) mit einem Segment je Tag, darunter der Text des
// Tages aus der Datenbank in drei Teilen, unten der feste Fuss mit dem
// persoenlichen Buchinger-Rahmen und den Warnzeichen - an jedem Tag gleich.
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

  return (
    <Section eyebrow="Fastenbegleiter">
      <div className="rounded-[22px] bg-card p-5 shadow-hi min-[960px]:px-7 min-[960px]:py-[26px]">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[13px] font-semibold tracking-[0.3px] text-muted-foreground">
            {stand}
          </span>
          {bisLabel !== null && (
            <span className="text-[13px] text-muted-foreground">
              bis {bisLabel}
            </span>
          )}
        </div>
        {von !== null && (
          <PhaseBar
            index={tag - 1}
            count={von}
            ariaLabel={stand}
            className="mt-2.5"
          />
        )}

        {text ? (
          <>
            <h3 className="mt-3.5 text-[22px] font-bold leading-snug text-foreground min-[960px]:text-[30px] min-[960px]:tracking-[-0.4px]">
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
