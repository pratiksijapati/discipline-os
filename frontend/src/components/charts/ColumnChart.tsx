import { useState } from "react";
import styles from "./Chart.module.css";
import { useElementWidth } from "./useElementWidth";

export interface Column {
  key: string;
  label: string;
  value: number;
  /** Tooltip text, e.g. "Week of Oct 4: 3 workouts". */
  tooltip: string;
}

interface ColumnChartProps {
  columns: Column[];
  target?: { value: number; label: string };
  ariaLabel: string;
  height?: number;
  /** Fixed top of the scale (e.g. 100 for scores); otherwise fits the data. */
  max?: number;
}

const M = { top: 14, right: 34, bottom: 26, left: 30 };
const MAX_BAR = 24;
const RADIUS = 4;

function niceMax(value: number): number {
  if (value <= 5) return Math.max(1, Math.ceil(value));
  const step = value <= 20 ? 5 : 10;
  return Math.ceil(value / step) * step;
}

/** Path for a column with 4px rounded top corners and a square base. */
function columnPath(x: number, y: number, w: number, base: number): string {
  const r = Math.min(RADIUS, w / 2, base - y);
  return `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${base}Z`;
}

/** Single-series columns, each its own hover/focus target. */
export function ColumnChart({ columns, target, ariaLabel, height = 170, max }: ColumnChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const top = max ?? niceMax(Math.max(target?.value ?? 0, ...columns.map((c) => c.value), 1));
  const innerW = Math.max(0, width - M.left - M.right);
  const innerH = height - M.top - M.bottom;
  const slot = columns.length ? innerW / columns.length : 0;
  const barW = Math.min(MAX_BAR, slot * 0.6);
  const y = (v: number) => M.top + innerH * (1 - v / top);
  const base = y(0);
  const ticks = [0, Math.round(top / 2), top].filter((t, i, all) => all.indexOf(t) === i);
  const labelEvery = Math.max(1, Math.ceil(columns.length / 8));

  const hovered = hover !== null ? columns[hover] : null;
  const tipLeft = hover !== null ? Math.min(Math.max(M.left + slot * (hover + 0.5), 80), width - 80) : 0;

  return (
    <div ref={ref} className={styles.frame} style={{ height }} role="group" aria-label={ariaLabel}>
      {width > 0 && (
        <svg width={width} height={height}>
          {ticks.map((t) => (
            <g key={t} aria-hidden>
              <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} className={styles.grid} />
              <text x={M.left - 8} y={y(t)} className={styles.yTick}>
                {t}
              </text>
            </g>
          ))}
          {columns.map((c, i) => {
            const cx = M.left + slot * i + (slot - barW) / 2;
            return (
              <g key={c.key}>
                {c.value > 0 && (
                  <path
                    d={columnPath(cx, y(c.value), barW, base)}
                    className={hover === i ? `${styles.column} ${styles.columnHover}` : styles.column}
                    aria-hidden
                  />
                )}
                {i % labelEvery === 0 && (
                  <text x={M.left + slot * (i + 0.5)} y={height - 6} className={styles.xTick} aria-hidden>
                    {c.label}
                  </text>
                )}
                <rect
                  x={M.left + slot * i}
                  y={M.top}
                  width={slot}
                  height={innerH}
                  className={styles.hit}
                  tabIndex={0}
                  role="img"
                  aria-label={c.tooltip}
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                />
              </g>
            );
          })}
          {target && (
            <g aria-hidden>
              <line x1={M.left} x2={width - M.right} y1={y(target.value)} y2={y(target.value)} className={styles.reference} />
              <text x={width - M.right + 4} y={y(target.value)} className={styles.referenceLabel}>
                {target.label}
              </text>
            </g>
          )}
        </svg>
      )}
      {hovered && (
        <div className={styles.tooltip} style={{ left: tipLeft }} role="status">
          <strong>{hovered.value}</strong>
          <span>{hovered.tooltip}</span>
        </div>
      )}
    </div>
  );
}
