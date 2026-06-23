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
  topRoundedBarPath,
  type ChartDims,
  type ChartSvg,
} from "@/components/ui/chart";
import { fmtNum, fmtWeight } from "@/lib/format";
import {
  exLineSeries,
  exVolumeSeries,
  type ExHistoryEntry,
  type ExLineMetric,
  type ExMetric,
} from "@/lib/exerciseHistory";

// Verlaufschart einer Uebung, 1:1 aus V1 (charts.js drawExLine/drawExBars) auf
// das geteilte D3-Fundament gehoben. Linien-Metriken (1RM/Top-Gewicht/Wdh/
// Haltezeit) zeichnen eine glatte Kurve je Einheit mit weicher Flaeche, hellem
// Endpunkt-Ring und Tooltip; Abweichungs-Einheiten bekommen einen roten Punkt.
// "volume" zeichnet Wochenbalken (oben gerundet, gruener Verlauf).

const MARGIN = { t: 14, r: 14, b: 8, l: 30 };
const BAR_MARGIN = { t: 14, r: 6, b: 28, l: 30 };
const PER_POINT = 26; // Mindestbreite je Punkt; darunter wird der Chart scrollbar.
const PER_BAR = 30;

function fmtLineVal(metric: ExLineMetric, v: number, unit: string): string {
  if (metric === "rm" || metric === "weight") return fmtWeight(v, unit);
  if (metric === "duration") return fmtNum(v) + " s";
  return fmtNum(v);
}

export interface ExerciseChartProps {
  history: readonly ExHistoryEntry[];
  metric: ExMetric;
  unit: string;
  height?: number;
}

export function ExerciseChart({
  history,
  metric,
  unit,
  height = 200,
}: ExerciseChartProps): React.ReactElement {
  const isVolume = metric === "volume";
  const linePoints = isVolume
    ? []
    : exLineSeries(history, metric as ExLineMetric);
  const bars = isVolume ? exVolumeSeries(history) : [];
  const n = isVolume ? bars.length : linePoints.length;

  const drawLine = useCallback(
    (svg: ChartSvg, dims: ChartDims) => {
      const { innerWidth: iw, innerHeight: ih, margin } = dims;
      const g = svg
        .append("g")
        .attr("transform", `translate(${margin.l},${margin.t})`);

      const ACC = readToken("--primary", "#0c9d77");
      const BAD = readToken("--danger", "#ef5b5b");
      const GRID = readToken("--border", "#e4e4e8");
      const FAINT = readToken("--muted-foreground", "#8a8a8e");
      const INK = readToken("--foreground", "#1c1c1e");

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
      const x = scaleLinear()
        .domain([0, Math.max(1, n - 1)])
        .range([0, iw]);
      const px = (i: number) => (n === 1 ? iw / 2 : x(i));
      const Y = (v: number) => ih - ((v - lo) / (hi - lo)) * ih;

      // x-Position je Punkt einbacken (Helfer erwarten (d)=>number).
      const co = pts.map((p, i) => ({ y: p.y, flag: p.flag, cx: px(i) }));

      // Grundlinie + Min/Max-Beschriftung links.
      g.append("line")
        .attr("x1", 0)
        .attr("y1", ih)
        .attr("x2", iw)
        .attr("y2", ih)
        .attr("stroke", GRID)
        .attr("stroke-width", 1);
      [hi, lo].forEach((v) => {
        g.append("text")
          .attr("x", -6)
          .attr("y", Y(v) + 3.5)
          .attr("text-anchor", "end")
          .attr("fill", FAINT)
          .attr("font-family", CHART_MONO)
          .attr("font-size", 10)
          .text(fmtNum(v));
      });

      // Flaeche + Kurve.
      const gid = "exarea" + Math.random().toString(36).slice(2, 7);
      appendAreaGradient(svg.append("defs"), gid, ACC, 0.18);
      g.append("path")
        .attr("d", smoothArea<(typeof co)[number]>((d) => d.cx, ih, (d) => Y(d.y))(co) ?? "")
        .attr("fill", `url(#${gid})`);
      g.append("path")
        .attr("d", smoothLine<(typeof co)[number]>((d) => d.cx, (d) => Y(d.y))(co) ?? "")
        .attr("fill", "none")
        .attr("stroke", ACC)
        .attr("stroke-width", 2.5)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round");

      // Punkte (letzter als offener Ring), Abweichung rot.
      co.forEach((p, i) => {
        if (i === n - 1) return;
        g.append("circle")
          .attr("cx", p.cx)
          .attr("cy", Y(p.y))
          .attr("r", p.flag ? 3.6 : 2.8)
          .attr("fill", p.flag ? BAD : ACC);
      });
      const last = co[n - 1];
      appendEndpointRing(g, last.cx, Y(last.y), last.flag ? BAD : ACC);

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
          text: fmtLineVal(metric as ExLineMetric, co[i].y, unit),
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
    [linePoints, n, metric, unit],
  );

  const drawBars = useCallback(
    (svg: ChartSvg, dims: ChartDims) => {
      const { innerWidth: iw, innerHeight: ih, margin } = dims;
      const g = svg
        .append("g")
        .attr("transform", `translate(${margin.l},${margin.t})`);

      const ACC = readToken("--primary", "#0c9d77");
      const GRID = readToken("--border", "#e4e4e8");
      const FAINT = readToken("--muted-foreground", "#8a8a8e");

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
  return (
    <ChartCanvas
      height={height}
      margin={MARGIN}
      minInnerWidth={n * PER_POINT}
      draw={drawLine}
      ariaLabel="Verlauf"
    />
  );
}
