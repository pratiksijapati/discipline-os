import { useState, type KeyboardEvent, type PointerEvent } from "react";
import styles from "./Chart.module.css";
import { useElementWidth } from "./useElementWidth";

export interface LinePoint {
  key: string;
  /** Short axis label, e.g. "Oct 4". */
  label: string;
  /** Long label for the tooltip, e.g. "Sunday, Oct 4". */
  longLabel: string;
  value: number | null;
  /** e.g. today's score, which can still change. */
  provisional?: boolean;
}

interface LineChartProps {
  points: LinePoint[];
  max?: number;
  reference?: { value: number; label: string };
  ariaLabel: string;
  height?: number;
}

const M = { top: 14, right: 34, bottom: 26, left: 30 };
const TICKS = [0, 50, 100];

/** Single-series line with area wash, reference line, crosshair tooltip and keyboard support. */
export function LineChart({ points, max = 100, reference, ariaLabel, height = 200 }: LineChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const innerW = Math.max(0, width - M.left - M.right);
  const innerH = height - M.top - M.bottom;
  const step = points.length > 1 ? innerW / (points.length - 1) : 0;
  const x = (i: number) => M.left + (points.length > 1 ? i * step : innerW / 2);
  const y = (v: number) => M.top + innerH * (1 - v / max);
  const baseline = y(0);

  // Split into runs of consecutive values so gaps (untracked days) stay gaps.
  const runs: Array<Array<{ i: number; v: number }>> = [];
  points.forEach((p, i) => {
    if (p.value === null) return;
    const last = runs.at(-1);
    if (last && last.at(-1)!.i === i - 1) last.push({ i, v: p.value });
    else runs.push([{ i, v: p.value }]);
  });
  const linePath = runs.map((run) => run.map((pt, k) => `${k ? "L" : "M"}${x(pt.i)},${y(pt.v)}`).join("")).join("");
  const areaPath = runs
    .map((run) => {
      const top = run.map((pt, k) => `${k ? "L" : "M"}${x(pt.i)},${y(pt.v)}`).join("");
      return `${top}L${x(run.at(-1)!.i)},${baseline}L${x(run[0].i)},${baseline}Z`;
    })
    .join("");

  const lastIndex = points.reduce((acc, p, i) => (p.value !== null ? i : acc), -1);
  const tickEvery = Math.max(1, Math.ceil(points.length / 4));
  const xTicks = points.map((_, i) => i).filter((i) => i % tickEvery === 0 || i === points.length - 1);

  function pick(event: PointerEvent<SVGRectElement>) {
    if (!points.length) return;
    const box = event.currentTarget.getBoundingClientRect();
    const i = step ? Math.round((event.clientX - box.left) / step) : 0;
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    if (!points.length) return;
    const current = hover ?? lastIndex;
    if (event.key === "ArrowLeft") setHover(Math.max(0, current - 1));
    else if (event.key === "ArrowRight") setHover(Math.min(points.length - 1, current + 1));
    else if (event.key === "Escape") setHover(null);
    else return;
    event.preventDefault();
  }

  const hovered = hover !== null ? points[hover] : null;
  const tipLeft = hover !== null ? Math.min(Math.max(x(hover), 70), width - 70) : 0;

  return (
    <div
      ref={ref}
      className={styles.frame}
      style={{ height }}
      tabIndex={0}
      role="group"
      aria-label={`${ariaLabel}. Use left and right arrow keys to read values.`}
      onKeyDown={onKey}
      onBlur={() => setHover(null)}
    >
      {width > 0 && (
        <svg width={width} height={height} aria-hidden>
          {TICKS.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} className={styles.grid} />
              <text x={M.left - 8} y={y(t)} className={styles.yTick}>
                {t}
              </text>
            </g>
          ))}
          {reference && (
            <g>
              <line x1={M.left} x2={width - M.right} y1={y(reference.value)} y2={y(reference.value)} className={styles.reference} />
              <text x={width - M.right + 4} y={y(reference.value)} className={styles.referenceLabel}>
                {reference.label}
              </text>
            </g>
          )}
          <path d={areaPath} className={styles.area} />
          <path d={linePath} className={styles.line} />
          {xTicks.map((i) => (
            <text key={points[i].key} x={x(i)} y={height - 6} className={styles.xTick}>
              {points[i].label}
            </text>
          ))}
          {lastIndex >= 0 && (
            <>
              <circle
                cx={x(lastIndex)}
                cy={y(points[lastIndex].value!)}
                r={5}
                className={points[lastIndex].provisional ? styles.dotOpen : styles.dot}
              />
              {hover === null && (
                <text x={x(lastIndex)} y={y(points[lastIndex].value!) - 12} className={styles.endLabel}>
                  {points[lastIndex].value}
                </text>
              )}
            </>
          )}
          {hovered && hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={baseline} className={styles.crosshair} />
              {hovered.value !== null && <circle cx={x(hover)} cy={y(hovered.value)} r={5} className={styles.dot} />}
            </g>
          )}
          <rect
            x={M.left - step / 2}
            y={M.top}
            width={innerW + step}
            height={innerH}
            className={styles.hit}
            onPointerMove={pick}
            onPointerDown={pick}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
      )}
      {hovered && (
        <div className={styles.tooltip} style={{ left: tipLeft }} role="status">
          <strong>{hovered.value === null ? "No score" : hovered.value}</strong>
          <span>
            {hovered.longLabel}
            {hovered.provisional && " · in progress"}
          </span>
        </div>
      )}
    </div>
  );
}
