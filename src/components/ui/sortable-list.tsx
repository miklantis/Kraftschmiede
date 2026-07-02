import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Domaenenfreies Sortier-Primitive: eine vertikale Liste, deren Eintraege sich
// per Ziehen an einem Griff umordnen lassen (Maus und Touch, ohne Zusatz-
// Bibliothek). Nur der Griff loest das Ziehen aus – die uebrige Flaeche bleibt
// normal bedienbar und die Seite scrollt weiter. Der gezogene Eintrag folgt dem
// Zeiger und hebt sich ab, die anderen weichen aus. Umgeordnet wird erst beim
// Loslassen ueber `onReorder(from, to)`; der Aufrufer haelt die Datenordnung.

// Eigenschaften, die der Aufrufer an sein Griff-Element haengt.
export interface SortableHandleProps {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
  style: CSSProperties;
}

export interface SortableRenderArgs {
  /** An das Griff-Element haengen (nur dieses startet das Ziehen). */
  handleProps: SortableHandleProps;
  /** true, solange genau dieser Eintrag gezogen wird. */
  isDragging: boolean;
}

export interface SortableListProps<T> {
  items: readonly T[];
  /** Stabiler Schluessel je Eintrag (kein Index). */
  getKey: (item: T, index: number) => string;
  /** Verschiebt den Eintrag von `from` auf Position `to`. */
  onReorder: (from: number, to: number) => void;
  renderItem: (item: T, index: number, args: SortableRenderArgs) => ReactNode;
  className?: string;
}

interface Geometry {
  centers: number[];
  step: number;
}

export function SortableList<T>({
  items,
  getKey,
  onReorder,
  renderItem,
  className,
}: SortableListProps<T>): React.ReactElement {
  // Refs auf die aeusseren Zeilen-Container fuer die Geometrie-Messung.
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Startzustand des Ziehens (in Refs, damit Handler stabil bleiben).
  const dragRef = useRef<{
    index: number;
    startY: number;
    geom: Geometry;
  } | null>(null);

  // Auf State abgebildet, damit die Ansicht mitzieht.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [deltaY, setDeltaY] = useState(0);

  // Zielposition aus der aktuellen Verschiebung ableiten.
  const targetIndex = (): number => {
    const d = dragRef.current;
    if (d === null) return -1;
    const { index, geom } = d;
    const now = geom.centers[index] + deltaY;
    let target = index;
    if (deltaY > 0) {
      for (let j = index + 1; j < geom.centers.length; j++) {
        if (now > geom.centers[j]) target = j;
        else break;
      }
    } else if (deltaY < 0) {
      for (let j = index - 1; j >= 0; j--) {
        if (now < geom.centers[j]) target = j;
        else break;
      }
    }
    return target;
  };

  const beginDrag = (index: number, e: React.PointerEvent): void => {
    const nodes = rowRefs.current;
    const rects = nodes.map((n) => n?.getBoundingClientRect() ?? null);
    const valid = rects.filter((r): r is DOMRect => r !== null);
    if (valid.length !== items.length || items.length < 2) return;
    const centers = rects.map((r) => (r as DOMRect).top + (r as DOMRect).height / 2);
    const gap =
      rects.length > 1
        ? (rects[1] as DOMRect).top -
          (rects[0] as DOMRect).top -
          (rects[0] as DOMRect).height
        : 0;
    const step = (rects[index] as DOMRect).height + Math.max(gap, 0);
    dragRef.current = { index, startY: e.clientY, geom: { centers, step } };
    setDragIndex(index);
    setDeltaY(0);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const moveDrag = (e: React.PointerEvent): void => {
    if (dragRef.current === null) return;
    setDeltaY(e.clientY - dragRef.current.startY);
  };

  const endDrag = (): void => {
    const d = dragRef.current;
    if (d !== null) {
      const to = targetIndex();
      if (to !== d.index && to >= 0) onReorder(d.index, to);
    }
    dragRef.current = null;
    setDragIndex(null);
    setDeltaY(0);
  };

  const target = targetIndex();
  const activeStep = dragRef.current?.geom.step ?? 0;

  // Verschiebung einer nicht gezogenen Zeile, damit die Luecke aufgeht.
  const shiftFor = (i: number): number => {
    if (dragIndex === null || i === dragIndex || target < 0) return 0;
    if (target > dragIndex && i > dragIndex && i <= target) return -activeStep;
    if (target < dragIndex && i >= target && i < dragIndex) return activeStep;
    return 0;
  };

  const handlePropsFor = (index: number): SortableHandleProps => ({
    onPointerDown: (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      beginDrag(index, e);
    },
    onPointerMove: moveDrag,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    style: {
      touchAction: "none",
      cursor: dragIndex === index ? "grabbing" : "grab",
    },
  });

  return (
    <div
      className={cn("flex flex-col gap-2.5", className)}
      style={dragIndex !== null ? { userSelect: "none" } : undefined}
    >
      {items.map((item, i) => {
        const isDragging = dragIndex === i;
        const translate = isDragging ? deltaY : shiftFor(i);
        const style: CSSProperties = {
          transform: `translateY(${translate}px)`,
          transition: isDragging ? "none" : "transform 160ms ease",
          zIndex: isDragging ? 10 : undefined,
          position: "relative",
        };
        return (
          <div
            key={getKey(item, i)}
            ref={(el) => {
              rowRefs.current[i] = el;
            }}
            style={style}
            className={isDragging ? "shadow-hi" : undefined}
          >
            {renderItem(item, i, {
              handleProps: handlePropsFor(i),
              isDragging,
            })}
          </div>
        );
      })}
    </div>
  );
}
