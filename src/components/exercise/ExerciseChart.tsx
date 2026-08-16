import { useCallback } from "react";
import { scaleLinear } from "d3-scale";
import {
  appendAreaGradient,
  appendEndpointRing,
  appendTooltip,
  ChartCanvas,
  CHART_MONO,
  readToken,
  smoothArea,
  smoothLine,
  stepArea,
  stepLine,
  topRoundedBarPath,
  type ChartDims,
  type ChartSvg,
} from "@/components/ui/chart";
import { timeSlots } from "@/lib/chartTime";
import { fmtNum, fmtWeight } from "@/lib/format";
import {
  exLineSeries,
  exVolumeSeries,
  recordSeries,
  type ExHistoryEntry,
  type ExLineMetric,
  type ExMetric,
  type ExRmTestPoint,
} from "@/lib/exerciseHistory";

// Verlaufschart einer Uebung, 1:1 aus V1 (charts.js drawExLine/drawExBars) auf
// das geteilte D3-Fundament gehoben. Linien-Metriken (1RM/Top-Gewicht/Wdh/
// Haltezeit) zeichnen eine glatte Kurve je Einheit mit weicher Flaeche, hellem
// Endpunkt-Ring und Tooltip; Abweichungs-Einheiten bekommen einen roten Punkt.
// Die x-Achse laeuft nach Datum (tagesgenau): jede Einheit bleibt ein eigener
// Punkt, aber Trainingspausen bleiben als Luecke sichtbar.
// "volume" zeichnet Wochenbalken (oben gerundet, gruener Verlauf).

const MARGIN = { t: 14, r: 14, b: 8, l: 30 };
const BAR_MARGIN = { t: 14, r: 6, b: 28, l: 30 };
const PER_POINT = 26; // Mindestbreite je Punkt; darunter wird der Chart scrollbar.
const PER_WEEK = 26; // Mindestbreite je Kalenderwoche der Zeitspanne.
const PER_BAR = 30;

function fmtLineVal(metric: ExLineMetric, v: number, unit: string): string {
  if (metric === "rm" || metric === "trend" || metric === "weight")
    return fmtWeight(v, unit);
  if (metric === "duration") return fmtNum(v) + " s";
  return fmtNum(v);
}

export interface ExerciseChartProps {
  history: readonly ExHistoryEntry[];
  metric: ExMetric;
  unit: string;
  height?: number;
  // Optionale Ziel-Linien (Meilensteine) fuer die 1RM-Ansicht. Jede zeichnet
  // eine dezente Waagerechte auf Hoehe von value; erreichte werden gedimmt.
  // Leer/undefiniert => Chart verhaelt sich unveraendert.
  milestoneLines?: readonly { value: number; achieved: boolean; label: string }[];
  // Bewusste 1RM-Tests. In der 1RM-Ansicht (Rekord-Treppe) setzen sie eigene,
  // farblich abgesetzte Stufen. Leer/undefiniert => nur Trainings-PRs.
  rmTests?: readonly ExRmTestPoint[];
  // Gespeicherter Rekord der Uebung (exercises.rm). Bindet das Ende der
  // 1RM-Treppe an die Zahl im 1RM-Block. Nur fuer metric="rm" relevant.
  recordRm?: number | null;
}

export function ExerciseChart({
  history,
  metric,
  unit,
  height = 200,
  milestoneLines,
  rmTests,
  recordRm,
}: ExerciseChartProps): React.ReactElement {
  const isVolume = metric === "volume";
  const isRecord = metric === "rm";
  const linePoints = isVolume
    ? []
    : isRecord
      ? recordSeries(history, rmTests ?? [], recordRm ?? null)
      : exLineSeries(history, metric as ExLineMetric);
  const bars = isVolume ? exVolumeSeries(history) : [];
  const n = isVolume ? bars.length : linePoints.length;

  const drawLine = useCallback(
    (svg: ChartSvg, dims: ChartDims) => {
      const { innerWidth: iw, innerHeight: ih, margin } = dims;
      const g = svg
        .append("g")
        .attr("transform", `translate(${margin.l},${margin.t})`);

      const ACC = readToken("--primary");
      const BAD = readToken("--danger");
      // Tests heben sich farblich von den Einheiten ab (Form gleich, Farbe traegt
      // die Herkunft).
      const TEST = readToken("--skill");
      const GRID = readToken("--border");
      const FAINT = readToken("--muted-foreground");
      const INK = readToken("--foreground");

      if (n === 0) {
        g.append("text")
          .attr("x", iw / 2)
          .attr("y", ih / 2)
          .attr("text-anchor", "middle")
          .attr("fill", FAINT)
          .attr("font-family", CHART_MONO)
          .attr("font-size", 11)
          .text("noch keine Daten");
        return;
      }

      const pts = linePoints;
      const ys = pts.map((p) => p.y);
      let lo = Math.min(...ys);
      let hi = Math.max(...ys);
      if (lo === hi) {
        lo -= 1;
        hi += 1;
      }

      // Ziel-Linien in die Skala einbeziehen (damit sie im Bild liegen). axisLo/
      // axisHi tragen die echten Extremwerte fuer die Achsen-Beschriftung; die
      // Domaene fuers Zeichnen bekommt oben etwas Luft, wenn Ziele dabei sind.
      const goals = milestoneLines ?? [];
      let axisLo = lo;
      let axisHi = hi;
      let domLo = lo;
      let domHi = hi;
      if (goals.length > 0) {
        const tv = goals.map((gl) => gl.value);
        axisLo = Math.min(lo, ...tv);
        axisHi = Math.max(hi, ...tv);
        domLo = axisLo;
        domHi = axisHi;
        if (domLo === domHi) {
          domLo -= 1;
          domHi += 1;
        }
        domHi += (domHi - domLo) * 0.08;
      }

      // x-Achse laeuft nach Datum: jeder Punkt sitzt auf seinem Tag, Wochen
      // ohne Einheit bleiben als Luecke stehen. Ohne verwertbare Daten (oder
      // wenn alles auf einen Tag faellt) gleichmaessige Verteilung wie frueher.
      const slots = timeSlots(pts.map((p) => p.date));
      const x = scaleLinear()
        .domain([0, slots ? slots[slots.length - 1] : Math.max(1, n - 1)])
        .range([0, iw]);
      const px = (i: number) => (n === 1 ? iw / 2 : x(slots ? slots[i] : i));
      const Y = (v: number) => ih - ((v - domLo) / (domHi - domLo)) * ih;

      // x-Position je Punkt einbacken (Helfer erwarten (d)=>number).
      const co = pts.map((p, i) => ({
        y: p.y,
        flag: p.flag,
        test: p.test === true,
        cx: px(i),
      }));

      // Grundlinie + Min/Max-Beschriftung links.
      g.append("line")
        .attr("x1", 0)
        .attr("y1", ih)
        .attr("x2", iw)
        .attr("y2", ih)
        .attr("stroke", GRID)
        .attr("stroke-width", 1);
      [axisHi, axisLo].forEach((v) => {
        g.append("text")
          .attr("x", -6)
          .attr("y", Y(v) + 3.5)
          .attr("text-anchor", "end")
          .attr("fill", FAINT)
          .attr("font-family", CHART_MONO)
          .attr("font-size", 10)
          .text(fmtNum(v));
      });

      // Ziel-Linien (Meilensteine): dezent gestrichelt, Label rechts oben an der
      // Linie; erreichte Ziele gedimmt. Hinter Flaeche/Kurve (zuerst gezeichnet).
      goals.forEach((gl) => {
        const gy = Y(gl.value);
        if (gy < -2 || gy > ih + 2) return;
        const op = gl.achieved ? 0.4 : 0.85;
        g.append("line")
          .attr("x1", 0)
          .attr("y1", gy)
          .attr("x2", iw)
          .attr("y2", gy)
          .attr("stroke", FAINT)
          .attr("stroke-width", 1)
          .attr("stroke-dasharray", "3 3")
          .attr("opacity", op);
        g.append("text")
          .attr("x", iw)
          .attr("y", gy - 4)
          .attr("text-anchor", "end")
          .attr("fill", FAINT)
          .attr("opacity", op)
          .attr("font-family", CHART_MONO)
          .attr("font-size", 10)
          .text(gl.label);
      });

      // Flaeche + Linie. Der 1RM-Rekord ist zwischen den Aenderungen konstant und
      // wird als Treppe gezeichnet; alle anderen Metriken als weiche Kurve.
      const mkArea = isRecord ? stepArea : smoothArea;
      const mkLine = isRecord ? stepLine : smoothLine;
      const gid = "exarea" + Math.random().toString(36).slice(2, 7);
      appendAreaGradient(svg.append("defs"), gid, ACC, 0.18);
      g.append("path")
        .attr("d", mkArea<(typeof co)[number]>((d) => d.cx, ih, (d) => Y(d.y))(co) ?? "")
        .attr("fill", `url(#${gid})`);
      g.append("path")
        .attr("d", mkLine<(typeof co)[number]>((d) => d.cx, (d) => Y(d.y))(co) ?? "")
        .attr("fill", "none")
        .attr("stroke", ACC)
        .attr("stroke-width", 2.5)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round");

      // Punkte (letzter als offener Ring), Abweichung rot.
      const dotColor = (p: (typeof co)[number]): string =>
        p.test ? TEST : p.flag ? BAD : ACC;
      co.forEach((p, i) => {
        if (i === n - 1) return;
        g.append("circle")
          .attr("cx", p.cx)
          .attr("cy", Y(p.y))
          .attr("r", p.flag || p.test ? 3.6 : 2.8)
          .attr("fill", dotColor(p));
      });
      const last = co[n - 1];
      appendEndpointRing(g, last.cx, Y(last.y), dotColor(last));

      // Tooltip je Punkt (Tippen/Hovern).
      let tipTO: ReturnType<typeof setTimeout> | null = null;
      const showTip = (i: number) => {
        if (tipTO) {
          clearTimeout(tipTO);
          tipTO = null;
        }
        g.selectAll(".ex-tip").remove();
        const tip = g.append("g").attr("class", "ex-tip");
        appendTooltip(tip, {
          cx: co[i].cx,
          cy: Y(co[i].y),
          innerWidth: iw,
          text:
            fmtLineVal(metric as ExLineMetric, co[i].y, unit) +
            (co[i].test ? " · Test" : ""),
          bg: INK,
          fontFamily: CHART_MONO,
          fontSize: 14,
          height: 26,
        });
      };
      const hideTip = () => g.selectAll(".ex-tip").remove();
      co.forEach((p, i) => {
        g.append("circle")
          .attr("cx", p.cx)
          .attr("cy", Y(p.y))
          .attr("r", 12)
          .attr("fill", "transparent")
          .style("cursor", "pointer")
          .on("mouseenter", () => showTip(i))
          .on("mouseleave", hideTip)
          .on("touchstart", () => {
            showTip(i);
            if (tipTO) clearTimeout(tipTO);
            tipTO = setTimeout(hideTip, 1800);
          });
      });
    },
    // rmTests wirkt ueber linePoints mit hinein.
    [linePoints, n, metric, unit, milestoneLines],
  );

  const drawBars = useCallback(
    (svg: ChartSvg, dims: ChartDims) => {
      const { innerWidth: iw, innerHeight: ih, margin } = dims;
      const g = svg
        .append("g")
        .attr("transform", `translate(${margin.l},${margin.t})`);

      const ACC = readToken("--primary");
      const GRID = readToken("--border");
      const FAINT = readToken("--muted-foreground");

      if (n === 0) {
        g.append("text")
          .attr("x", iw / 2)
          .attr("y", ih / 2)
          .attr("text-anchor", "middle")
          .attr("fill", FAINT)
          .attr("font-family", CHART_MONO)
          .attr("font-size", 11)
          .text("noch keine Daten");
        return;
      }

      let max = Math.max(...bars.map((b) => b.value));
      if (max <= 0) max = 1;

      const gid = "exbar" + Math.random().toString(36).slice(2, 6);
      appendAreaGradient(svg.append("defs"), gid, ACC, 1, 0.45);

      g.append("line")
        .attr("x1", 0)
        .attr("y1", ih)
        .attr("x2", iw)
        .attr("y2", ih)
        .attr("stroke", GRID)
        .attr("stroke-width", 1);
      g.append("text")
        .attr("x", -6)
        .attr("y", 3.5)
        .attr("text-anchor", "end")
        .attr("fill", FAINT)
        .attr("font-family", CHART_MONO)
        .attr("font-size", 10)
        .text(fmtNum(max));

      const gap = 6;
      const bw = (iw - gap * (n - 1)) / n;
      bars.forEach((b, i) => {
        const bh = (b.value / max) * ih;
        const bx = i * (bw + gap);
        const by = ih - bh;
        const w = Math.max(1, bw);
        const h = Math.max(0, bh);
        g.append("path")
          .attr("d", topRoundedBarPath(+bx.toFixed(1), +by.toFixed(1), +w.toFixed(1), +h.toFixed(1), 20))
          .attr("fill", `url(#${gid})`);
        if (n <= 14) {
          g.append("text")
            .attr("x", +(bx + bw / 2).toFixed(1))
            .attr("y", ih + 13)
            .attr("text-anchor", "middle")
            .attr("fill", FAINT)
            .attr("font-family", CHART_MONO)
            .attr("font-size", 10)
            .text(b.label);
        }
      });
    },
    [bars, n],
  );

  // Hoehe wie V1: Detailkarte 200, angeheftete Kachel flacher (per height-Prop:
  // 150 Desktop / 120 Handy). Standard 200.
  if (isVolume) {
    return (
      <ChartCanvas
        height={height}
        margin={BAR_MARGIN}
        minInnerWidth={n * PER_BAR}
        draw={drawBars}
        ariaLabel="Wochenvolumen"
      />
    );
  }
  // Mindestbreite: Platz fuer alle Punkte, aber auch fuer die Zeitspanne, damit
  // Pausen als Luecke sichtbar bleiben statt zusammengedrueckt zu werden.
  const lineSlots = timeSlots(linePoints.map((p) => p.date));
  const spanWeeks = lineSlots ? lineSlots[lineSlots.length - 1] / 7 : 0;
  return (
    <ChartCanvas
      height={height}
      margin={MARGIN}
      minInnerWidth={Math.max(n * PER_POINT, Math.round(spanWeeks * PER_WEEK))}
      draw={drawLine}
      ariaLabel="Verlauf"
    />
  );
}
