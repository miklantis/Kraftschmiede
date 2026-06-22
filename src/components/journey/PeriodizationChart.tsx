import { useCallback } from "react";
import { scaleLinear } from "d3-scale";
import {
  appendAreaGradient,
  appendEndpointRing,
  appendTooltip,
  ChartCanvas,
  CHART_FONT,
  CHART_MONO,
  readToken,
  smoothArea,
  smoothLine,
  type ChartDims,
  type ChartSvg,
} from "@/components/ui/chart";
import type { PeriodizationData } from "@/lib/periodization";

// Periodisierungskurve der aktiven Journey, 1:1 aus V1 (charts.js
// drawJourneyChart). Zwei glatte Kurven ueber alle Wochen - Volumen (kraeftig
// gruen) und Intensitaet (feiner, gestrichelt) -, dahinter die Phasen als zarte
// Baender mit Namen, die Deload-Wochen orange aufleuchtend, und ein offener Ring
// mit "jetzt"-Tooltip an der aktuellen Woche. Die geteilte Mechanik (messen,
// scrollen, Stil) kommt aus dem Chart-Fundament; hier liegt nur das Journey-Eigene.

const MARGIN = { t: 14, r: 14, b: 40, l: 14 };
const HEIGHT = 260;
const PER_WEEK = 50; // Mindestbreite je Woche; darunter wird die Grafik scrollbar

interface ExtPoint {
  g: number;
  vol: number;
  intens: number;
}

export function PeriodizationChart({
  data,
}: {
  data: PeriodizationData;
}): React.ReactElement | null {
  const { weeks, bands, curG, vMin, vMax, iMin, iMax } = data;
  const N = weeks.length;

  const draw = useCallback(
    (svg: ChartSvg, dims: ChartDims) => {
      if (N === 0) return;
      const iw = dims.innerWidth;
      const ih = dims.innerHeight;

      // V1-Token-Mapping: accent->primary, accent-2->intensity, warn->warning.
      const ACC = readToken("--primary", "#0c9d77");
      const INT = readToken("--intensity", "#37a9c4");
      const WARN = readToken("--warning", "#d99a2b");
      const ORANGE = readToken("--deviation", "#f3b13a");
      const INK = readToken("--foreground", "#1c1c1e");
      const SUB = readToken("--muted-foreground", "#8a8a8e");
      const GRID = readToken("--border", "#e4e4e8");

      // Wertebereich auf 12%-90% der Plothoehe abbilden (liefert direkt Pixel).
      const ny = (v: number, lo: number, hi: number): number => {
        const t = hi > lo ? (v - lo) / (hi - lo) : 0.5;
        return ih - (0.12 + t * 0.78) * ih;
      };

      const defs = svg.append("defs");
      const rid = Math.random().toString(36).slice(2, 6);
      const volGid = appendAreaGradient(defs, "jvol" + rid, ACC, 0.22);
      const intGid = appendAreaGradient(defs, "jint" + rid, INT, 0.13);

      // Phasen-Band-Verlauf: oben transparent, unten grau (vertikal).
      const bandGid = "jband" + rid;
      const bgGrad = defs
        .append("linearGradient")
        .attr("id", bandGid)
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", 0)
        .attr("y2", 1);
      bgGrad
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#d7dade")
        .attr("stop-opacity", 0);
      bgGrad
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#d7dade")
        .attr("stop-opacity", 0.7);

      const g = svg
        .append("g")
        .attr("transform", `translate(${dims.margin.l},${dims.margin.t})`);

      // Domain mit halber Woche Rand auf beiden Seiten.
      const x = scaleLinear()
        .domain([-0.5, Math.max(0.5, N - 0.5)])
        .range([0, iw]);

      // Phasen-Baender: jedes zweite leicht hinterlegt, Trennlinien gestrichelt.
      bands.forEach((bd, bi) => {
        const x0 = Math.max(0, x(bd.start - 0.5));
        const x1 = Math.min(iw, x(bd.end + 0.5));
        if (bi % 2 === 1)
          g.append("rect")
            .attr("x", x0)
            .attr("y", 0)
            .attr("width", Math.max(0, x1 - x0))
            .attr("height", ih)
            .attr("fill", `url(#${bandGid})`);
        if (bi > 0)
          g.append("line")
            .attr("x1", x0)
            .attr("y1", 0)
            .attr("x2", x0)
            .attr("y2", ih)
            .attr("stroke", GRID)
            .attr("stroke-dasharray", "2 3");
      });
      g.append("line")
        .attr("x1", 0)
        .attr("y1", ih)
        .attr("x2", iw)
        .attr("y2", ih)
        .attr("stroke", GRID);

      // Wochennummern (1-basiert); Deload-Wochen orange + fett.
      weeks.forEach((d) => {
        g.append("text")
          .attr("x", x(d.g))
          .attr("y", ih + 14)
          .attr("text-anchor", "middle")
          .attr("fill", d.deload ? WARN : SUB)
          .attr("font-size", 11)
          .attr("font-weight", d.deload ? 700 : 600)
          .attr("font-family", CHART_MONO)
          .text(d.g + 1);
      });

      // Randverlaengerung (-0.5 / N-0.5), damit Linie UND Flaeche voll spannen.
      const first = weeks[0];
      const last = weeks[N - 1];
      const ext: ExtPoint[] = [
        { g: -0.5, vol: first.vol, intens: first.intens },
        ...weeks.map((w) => ({ g: w.g, vol: w.vol, intens: w.intens })),
        { g: N - 0.5, vol: last.vol, intens: last.intens },
      ];

      const volLine = smoothLine<ExtPoint>(
        (d) => x(d.g),
        (d) => ny(d.vol, vMin, vMax),
      );
      const intLine = smoothLine<ExtPoint>(
        (d) => x(d.g),
        (d) => ny(d.intens, iMin, iMax),
      );
      const volArea = smoothArea<ExtPoint>(
        (d) => x(d.g),
        ih,
        (d) => ny(d.vol, vMin, vMax),
      );
      const intArea = smoothArea<ExtPoint>(
        (d) => x(d.g),
        ih,
        (d) => ny(d.intens, iMin, iMax),
      );

      g.append("path").attr("d", intArea(ext)).attr("fill", `url(#${intGid})`);
      g.append("path").attr("d", volArea(ext)).attr("fill", `url(#${volGid})`);
      g.append("path")
        .attr("d", intLine(ext))
        .attr("fill", "none")
        .attr("stroke", INT)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4 3")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round");

      // Volumen-Linie: an Deload-Wochen orange aufleuchten, beidseitig in knapp
      // einer Woche zurueck zu Gruen rampen (horizontaler Stroke-Gradient).
      let volStroke = ACC;
      const deloadWeeks = weeks.filter((d) => d.deload);
      if (deloadWeeks.length) {
        const lgId = "jvolstroke" + rid;
        const lg = defs
          .append("linearGradient")
          .attr("id", lgId)
          .attr("gradientUnits", "userSpaceOnUse")
          .attr("x1", 0)
          .attr("y1", 0)
          .attr("x2", iw)
          .attr("y2", 0);
        const span = Math.max(1, iw);
        const ramp = Math.abs(x(0.85) - x(0));
        const stops: { o: number; c: string }[] = [{ o: 0, c: ACC }];
        deloadWeeks.forEach((d) => {
          const cxg = x(d.g);
          stops.push({ o: (cxg - ramp) / span, c: ACC });
          stops.push({ o: cxg / span, c: ORANGE });
          stops.push({ o: (cxg + ramp) / span, c: ACC });
        });
        stops.push({ o: 1, c: ACC });
        stops.sort((a, b) => a.o - b.o);
        stops.forEach((st) => {
          lg.append("stop")
            .attr(
              "offset",
              (Math.max(0, Math.min(1, st.o)) * 100).toFixed(2) + "%",
            )
            .attr("stop-color", st.c);
        });
        volStroke = `url(#${lgId})`;
      }
      g.append("path")
        .attr("d", volLine(ext))
        .attr("fill", "none")
        .attr("stroke", volStroke)
        .attr("stroke-width", 2.4)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round");

      // "jetzt"-Marker: offener Ring auf der Volumenkurve + haengender Tooltip.
      const cx = x(curG);
      const cy = ny(weeks[curG].vol, vMin, vMax);
      appendEndpointRing(g, cx, cy, ACC);
      appendTooltip(g, {
        cx,
        cy,
        innerWidth: iw,
        text: "jetzt",
        bg: INK,
        fontFamily: CHART_FONT,
        fontSize: 16,
        width: 70,
        height: 30,
        minTop: -dims.margin.t + 2,
      });

      // Phasen-Labels unter der Achse, an den Raendern verankert.
      bands.forEach((bd) => {
        const x0 = Math.max(0, x(bd.start - 0.5));
        const x1 = Math.min(iw, x(bd.end + 0.5));
        const lmid = (x0 + x1) / 2;
        let anc = "middle";
        let lx = lmid;
        if (lmid < 26) {
          anc = "start";
          lx = 0;
        } else if (lmid > iw - 26) {
          anc = "end";
          lx = iw;
        }
        g.append("text")
          .attr("x", lx)
          .attr("y", ih + 28)
          .attr("text-anchor", anc)
          .attr("fill", SUB)
          .attr("font-size", 10)
          .attr("font-family", CHART_FONT)
          .text(bd.name);
      });
    },
    [weeks, bands, curG, vMin, vMax, iMin, iMax, N],
  );

  if (N === 0) return null;

  return (
    <ChartCanvas
      height={HEIGHT}
      margin={MARGIN}
      minInnerWidth={N * PER_WEEK}
      draw={draw}
      ariaLabel="Periodisierung der Journey"
    />
  );
}
