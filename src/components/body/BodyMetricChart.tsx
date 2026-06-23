import { useCallback } from "react";
import { scaleLinear } from "d3-scale";
import {
  appendAreaGradient,
  appendEndpointRing,
  ChartCanvas,
  CHART_MONO,
  readToken,
  smoothArea,
  smoothLine,
  type ChartDims,
  type ChartSvg,
} from "@/components/ui/chart";
import { fmtScore } from "@/lib/format";

// Verlaufslinie einer Koerper-Messmetrik (Gewicht/Fett/Muskel/Wasser/Phasen-
// winkel) auf dem geteilten D3-Fundament, im V1-Look: glatte gruene Kurve mit
// weicher Flaeche, drei Hilfslinien und ein Mono-Wertlabel am letzten Punkt.
// Reine Werte-Reihe (alt -> neu); kein Tooltip (wie V1).

const MARGIN = { t: 18, r: 16, b: 16, l: 10 };
const PER_POINT = 44;

export function BodyMetricChart({
  vals,
  unit,
  pad,
  height = 180,
}: {
  vals: number[];
  unit: string;
  pad: number;
  height?: number;
}): React.ReactElement {
  const n = vals.length;

  const draw = useCallback(
    (svg: ChartSvg, dims: ChartDims) => {
      const { innerWidth: iw, innerHeight: ih, margin } = dims;
      const g = svg
        .append("g")
        .attr("transform", `translate(${margin.l},${margin.t})`);

      const ACC = readToken("--primary", "#0c9d77");
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
          .text("für diese Metrik noch keine Messung");
        return;
      }

      let lo = Math.min(...vals);
      let hi = Math.max(...vals);
      if (lo === hi) {
        lo -= 1;
        hi += 1;
      } else {
        lo -= pad;
        hi += pad;
      }
      const x = scaleLinear()
        .domain([0, Math.max(1, n - 1)])
        .range([0, iw]);
      const px = (i: number) => (n === 1 ? iw / 2 : x(i));
      const Y = (v: number) => ih - ((v - lo) / (hi - lo)) * ih;

      // Drei Hilfslinien.
      const yScale = scaleLinear().domain([lo, hi]).range([ih, 0]);
      yScale.ticks(3).forEach((t) => {
        g.append("line")
          .attr("x1", 0)
          .attr("x2", iw)
          .attr("y1", yScale(t))
          .attr("y2", yScale(t))
          .attr("stroke", GRID)
          .attr("stroke-width", 1);
      });

      const co = vals.map((v, i) => ({ y: v, cx: px(i) }));

      const gid = "bodyarea" + Math.random().toString(36).slice(2, 7);
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

      const last = co[n - 1];
      appendEndpointRing(g, last.cx, Y(last.y), ACC);
      g.append("text")
        .attr("x", last.cx)
        .attr("y", Y(last.y) - 12)
        .attr("text-anchor", "end")
        .attr("fill", INK)
        .attr("font-size", 13)
        .attr("font-weight", 700)
        .attr("font-family", CHART_MONO)
        .text(fmtScore(last.y) + " " + unit);
    },
    [vals, n, unit, pad],
  );

  return (
    <ChartCanvas
      height={height}
      margin={MARGIN}
      minInnerWidth={n * PER_POINT}
      draw={draw}
      ariaLabel="Messverlauf"
    />
  );
}
