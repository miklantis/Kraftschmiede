import { useCallback } from "react";
import { scaleLinear } from "d3-scale";
import {
  appendListTooltip,
  ChartCanvas,
  CHART_MONO,
  readToken,
  smoothLine,
  type ChartDims,
  type ChartSvg,
} from "@/components/ui/chart";
import { timeSlots } from "@/lib/chartTime";
import { longDateShort } from "@/lib/format";
import {
  seriesValueText,
  type JourneyChartSeries,
  type JourneyPhaseMark,
  type JourneySeriesKey,
} from "@/lib/journeyChart";

// Verlaufschart einer Uebung innerhalb einer Journey: mehrere Linien
// gleichzeitig statt einer umgeschalteten Metrik. Ein Punkt ist eine
// absolvierte Einheit; die x-Achse laeuft tagesgenau, Pausen bleiben als
// Luecke stehen.
//
// Jede Serie ist auf IHRE EIGENE Spanne gestreckt (0..1 ueber die Hoehe), damit
// Gewicht, Wiederholungen, Score und Trend nebeneinander lesbar sind. Es gibt
// deshalb bewusst keine y-Achse – die Zahlen stehen im Tooltip. Eine Serie ohne
// Spanne (konstanter Wert oder ein einziger Punkt) laeuft mittig als gerade
// Linie bzw. sitzt als einzelner Punkt in der Mitte; das ist der haeufigste
// Fall in Journey-Woche 1.
//
// Phasengrenzen sind senkrechte Trennlinien mit dem Phasennamen am Fuss: beim
// Phaseneintritt setzt der Coach den Anker neu, ohne Markierung saehe dieser
// gewollte Sprung nach Fehler aus.

// Farbe je Serie (CSS-Variablen des Themes). Legende und Schalterreihe lesen
// dieselbe Zuordnung, damit Linie und Chip nie auseinanderlaufen.
export const JOURNEY_SERIES_VAR: Record<JourneySeriesKey, string> = {
  weight: "--primary",
  reps: "--tone-blue",
  score: "--tone-amber",
  trend: "--tone-purple",
};

const MARGIN = { t: 10, r: 12, b: 22, l: 12 };
const PER_POINT = 34; // Mindestbreite je Einheit; darunter scrollt der Chart.
const PER_WEEK = 22; // Mindestbreite je Kalenderwoche der Zeitspanne.
const PAD_Y = 10; // Luft ueber und unter den Extremwerten.

export interface JourneyExerciseChartProps {
  /** Tag je Einheit dieser Uebung in der Journey, aelteste zuerst. */
  dates: readonly string[];
  /** Bereits auf die eingeschalteten Serien gefiltert. */
  series: readonly JourneyChartSeries[];
  marks: readonly JourneyPhaseMark[];
  unit: string;
  height?: number;
}

export function JourneyExerciseChart({
  dates,
  series,
  marks,
  unit,
  height = 170,
}: JourneyExerciseChartProps): React.ReactElement {
  const n = dates.length;

  const draw = useCallback(
    (svg: ChartSvg, dims: ChartDims) => {
      const { innerWidth: iw, innerHeight: ih, margin } = dims;
      const g = svg
        .append("g")
        .attr("transform", `translate(${margin.l},${margin.t})`);

      const GRID = readToken("--border");
      const FAINT = readToken("--muted-foreground");
      const INK = readToken("--foreground");

      const hint = (text: string): void => {
        g.append("text")
          .attr("x", iw / 2)
          .attr("y", ih / 2)
          .attr("text-anchor", "middle")
          .attr("fill", FAINT)
          .attr("font-family", CHART_MONO)
          .attr("font-size", 11)
          .text(text);
      };

      // Grundlinie: gibt den Linien einen Boden, auch wenn nichts gezeichnet wird.
      g.append("line")
        .attr("x1", 0)
        .attr("y1", ih)
        .attr("x2", iw)
        .attr("y2", ih)
        .attr("stroke", GRID)
        .attr("stroke-width", 1);

      if (n === 0) {
        hint("noch keine Einheit");
        return;
      }
      if (series.length === 0) {
        hint("keine Serie gewählt");
        return;
      }

      // x-Achse nach Datum. Mehrere Einheiten am selben Tag teilen sich ihren
      // Platz (gleicher x-Wert) – die Zeit bleibt die Wahrheit der Achse.
      const slots = timeSlots(dates);
      const x = scaleLinear()
        .domain([0, slots ? slots[n - 1] : Math.max(1, n - 1)])
        .range([0, iw]);
      const px = (i: number): number =>
        n === 1 ? iw / 2 : x(slots ? slots[i] : i);

      const indexOfDate = new Map<string, number>();
      dates.forEach((d, i) => {
        if (!indexOfDate.has(d)) indexOfDate.set(d, i);
      });

      // Normalisierung je Serie: eigene Spanne auf die volle Hoehe. Ohne Spanne
      // (konstant oder ein Punkt) laeuft die Serie mittig.
      const yOf = (norm: number): number =>
        ih - PAD_Y - norm * (ih - 2 * PAD_Y);

      // Phasengrenzen zuerst (liegen hinter den Linien). Der Strich sitzt
      // zwischen der letzten Einheit der alten und der ersten der neuen Phase.
      marks.forEach((m) => {
        if (m.index >= n) return;
        const at = px(m.index);
        const lineX = m.index > 0 ? (px(m.index - 1) + at) / 2 : 0;
        if (m.index > 0) {
          g.append("line")
            .attr("x1", lineX)
            .attr("y1", 0)
            .attr("x2", lineX)
            .attr("y2", ih)
            .attr("stroke", FAINT)
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "3 4")
            .attr("opacity", 0.5);
        }
        // Name am Fuss, rechts der Linie; am rechten Rand nach links gekippt.
        const est = m.name.length * 5.4;
        const toRight = lineX + 4 + est <= iw;
        g.append("text")
          .attr("x", toRight ? lineX + 4 : lineX - 4)
          .attr("y", ih + 14)
          .attr("text-anchor", toRight ? "start" : "end")
          .attr("fill", FAINT)
          .attr("font-family", CHART_MONO)
          .attr("font-size", 10)
          .text(m.name);
      });

      // Linien je Serie.
      series.forEach((s) => {
        const color = readToken(JOURNEY_SERIES_VAR[s.key]);
        const vals = s.points.map((p) => p.value);
        const lo = Math.min(...vals);
        const hi = Math.max(...vals);
        const flat = hi - lo <= 0;
        const co = s.points.map((p) => ({
          cx: px(indexOfDate.get(p.date) ?? 0),
          cy: yOf(flat ? 0.5 : (p.value - lo) / (hi - lo)),
        }));

        if (co.length > 1) {
          g.append("path")
            .attr(
              "d",
              smoothLine<(typeof co)[number]>(
                (d) => d.cx,
                (d) => d.cy,
              )(co) ?? "",
            )
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", 2)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round");
        }
        co.forEach((p) => {
          g.append("circle")
            .attr("cx", p.cx)
            .attr("cy", p.cy)
            .attr("r", 2.6)
            .attr("fill", color);
        });
      });

      // Tooltip je Einheit: senkrechte Fuehrungslinie plus alle Werte dieses
      // Tages. Getroffen wird ueber ein Band, das bis zur Mitte zu den
      // Nachbarn reicht – damit ist jeder Punkt auch auf dem Handy zu treffen.
      const valuesAt = (i: number): { text: string; color: string }[] => {
        const date = dates[i];
        const out: { text: string; color: string }[] = [];
        for (const s of series) {
          const p = s.points.find((q) => q.date === date);
          if (!p) continue;
          out.push({
            text: seriesValueText(s, p.value, unit),
            color: readToken(JOURNEY_SERIES_VAR[s.key]),
          });
        }
        return out;
      };

      let tipTO: ReturnType<typeof setTimeout> | null = null;
      const hideTip = (): void => {
        g.selectAll(".jx-tip").remove();
      };
      const showTip = (i: number): void => {
        if (tipTO) {
          clearTimeout(tipTO);
          tipTO = null;
        }
        hideTip();
        const rows = valuesAt(i);
        if (rows.length === 0) return;
        const tip = g.append("g").attr("class", "jx-tip");
        tip
          .append("line")
          .attr("x1", px(i))
          .attr("y1", 0)
          .attr("x2", px(i))
          .attr("y2", ih)
          .attr("stroke", INK)
          .attr("stroke-width", 1)
          .attr("opacity", 0.18);
        appendListTooltip(tip, {
          cx: px(i),
          innerWidth: iw,
          title: longDateShort(dates[i]),
          rows,
          bg: INK,
        });
      };

      dates.forEach((_, i) => {
        const left = i === 0 ? 0 : (px(i - 1) + px(i)) / 2;
        const right = i === n - 1 ? iw : (px(i) + px(i + 1)) / 2;
        g.append("rect")
          .attr("x", left)
          .attr("y", 0)
          .attr("width", Math.max(1, right - left))
          .attr("height", ih)
          .attr("fill", "transparent")
          .style("cursor", "pointer")
          .on("mouseenter", () => showTip(i))
          .on("mouseleave", hideTip)
          .on("touchstart", () => {
            showTip(i);
            if (tipTO) clearTimeout(tipTO);
            tipTO = setTimeout(hideTip, 2200);
          });
      });
    },
    [dates, series, marks, unit, n],
  );

  // Mindestbreite: Platz fuer jede Einheit, aber auch fuer die Zeitspanne,
  // damit Pausen als Luecke sichtbar bleiben. Reicht der Platz nicht, scrollt
  // der Chart seitlich – auch auf dem Desktop in der Zwei-Drittel-Spalte.
  const slots = timeSlots(dates);
  const spanWeeks = slots ? slots[slots.length - 1] / 7 : 0;
  return (
    <ChartCanvas
      height={height}
      margin={MARGIN}
      minInnerWidth={Math.max(n * PER_POINT, Math.round(spanWeeks * PER_WEEK))}
      draw={draw}
      ariaLabel="Verlauf in dieser Journey"
    />
  );
}
