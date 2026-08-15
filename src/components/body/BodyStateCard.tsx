import { useState } from "react";
import { Check } from "lucide-react";
import { RatingScale } from "@/components/ui/rating-scale";
import { Switch } from "@/components/ui/switch";
import { soreButtonColors, readyButtonColors } from "@/lib/body";
import { useUpsertBodyToday } from "@/hooks/useUpsertBodyToday";
import type { BodyLogRow } from "@/schemas";

// Karte "Koerperzustand heute": drei Kater-Reihen (Beine/Oberkoerper/Gesamt,
// 0..3), Readiness (1..5), Schmerz-Schalter, Notiz und Eintragen. Genau ein
// Eintrag pro Tag – "Eintragen" legt an, "Aktualisieren" ueberschreibt. Der
// Entwurf lebt lokal; erst Speichern schreibt zurueck (wie V1 bodyDraft).
const SORE_VALUES = [0, 1, 2, 3] as const;
const READY_VALUES = [1, 2, 3, 4, 5] as const;

interface Draft {
  legs: number;
  upper_body: number;
  overall: number;
  readiness: number;
  pain_flag: boolean;
  notes: string;
}

function draftFrom(today: BodyLogRow | null): Draft {
  return {
    legs: today?.legs ?? 0,
    upper_body: today?.upper_body ?? 0,
    overall: today?.overall ?? 0,
    readiness: today?.readiness ?? 3,
    pain_flag: today?.pain_flag ?? false,
    notes: today?.notes ?? "",
  };
}

function SoreRow({
  name,
  values,
  value,
  onChange,
  colorFor,
}: {
  name: string;
  values: readonly number[];
  value: number;
  onChange: (n: number) => void;
  colorFor: (v: number, sel: boolean) => { bg: string; fg: string };
}): React.ReactElement {
  return (
    <div className="mb-2.5 flex items-center gap-2.5">
      <span className="flex-1 text-[14px] text-foreground/80">{name}</span>
      <RatingScale
        values={values}
        value={value}
        onChange={onChange}
        colorFor={colorFor}
        ariaLabel={name}
      />
    </div>
  );
}

export function BodyStateCard({
  today,
  hasToday,
}: {
  today: BodyLogRow | null;
  hasToday: boolean;
}): React.ReactElement {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(today));
  const [justSaved, setJustSaved] = useState(false);
  const { save, isPending, error } = useUpsertBodyToday();

  const set = <K extends keyof Draft>(key: K, val: Draft[K]): void => {
    setDraft((d) => ({ ...d, [key]: val }));
    setJustSaved(false);
  };

  const onSave = async (): Promise<void> => {
    await save(draft);
    setJustSaved(true);
  };

  const label = justSaved
    ? "Eingetragen"
    : hasToday
      ? "Aktualisieren"
      : "Eintragen";

  return (
    <div className="rounded-[18px] bg-card p-[18px] shadow-card min-[960px]:p-5">
      <SoreRow
        name="Beine Kater"
        values={SORE_VALUES}
        value={draft.legs}
        onChange={(n) => set("legs", n)}
        colorFor={soreButtonColors}
      />
      <SoreRow
        name="Oberkörper Kater"
        values={SORE_VALUES}
        value={draft.upper_body}
        onChange={(n) => set("upper_body", n)}
        colorFor={soreButtonColors}
      />
      <SoreRow
        name="Gesamt Kater"
        values={SORE_VALUES}
        value={draft.overall}
        onChange={(n) => set("overall", n)}
        colorFor={soreButtonColors}
      />
      <SoreRow
        name="Readiness"
        values={READY_VALUES}
        value={draft.readiness}
        onChange={(n) => set("readiness", n)}
        colorFor={readyButtonColors}
      />

      <div className="mt-1 mb-3 flex items-center justify-between">
        <span className="text-[14px] text-foreground/80">Schmerz</span>
        <Switch
          checked={draft.pain_flag}
          onChange={(v) => set("pain_flag", v)}
          label="Schmerz gemeldet"
        />
      </div>

      <textarea
        value={draft.notes}
        onChange={(e) => set("notes", e.target.value)}
        placeholder="Notiz (optional) …"
        // 16px auf Mobile verhindert den Auto-Zoom von iOS Safari beim Antippen.
        className="min-h-[46px] w-full resize-y rounded-[11px] border border-border bg-input px-3 py-2.5 text-[16px] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none min-[960px]:text-[14px]"
      />

      <button
        type="button"
        onClick={() => void onSave()}
        disabled={isPending}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-[11px] bg-primary py-3 text-[15px] font-semibold text-white transition-opacity disabled:opacity-60"
      >
        {justSaved && <Check className="size-[18px]" />}
        {isPending ? "Speichern …" : label}
      </button>

      {error instanceof Error && (
        <div className="mt-2 text-[13px] text-danger">{error.message}</div>
      )}
    </div>
  );
}
