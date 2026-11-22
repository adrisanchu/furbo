import { formatLevel } from "@/lib/domain/level";

const dayFmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" });

type Point = { at: Date; rating: number; isAssessment: boolean };

/**
 * Level over time (profile sketch): the self-assessment, then one point per
 * match. Plain SVG, themed with CSS variables.
 */
export function LevelChart({ points }: { points: Point[] }) {
  if (points.length < 2) {
    return (
      <p className="rounded-2xl border border-dashed bg-card p-4 text-sm text-muted-foreground">
        Tu gráfica aparecerá cuando juegues tu primer partido con acta.
      </p>
    );
  }
  const W = 320;
  const H = 128;
  const padX = 8;
  const top = 22;
  const bottom = 30;
  const values = points.map((p) => p.rating);
  const min = Math.min(...values) - 0.2;
  const max = Math.max(...values) + 0.2;
  const x = (i: number) => padX + (i * (W - padX * 2)) / (points.length - 1);
  const y = (v: number) => top + ((max - v) / (max - min)) * (H - top - bottom);
  const path = points.map((p, i) => `${x(i).toFixed(1)},${y(p.rating).toFixed(1)}`).join(" ");
  const last = points[points.length - 1]!;
  const label = `Nivel: ${points.map((p) => formatLevel(p.rating)).join(", ")}`;
  const ticks = points.length <= 5 ? points.map((_, i) => i) : [0, Math.floor((points.length - 1) / 2), points.length - 1];

  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
      <line x1={padX} x2={W - padX} y1={y(max - 0.2)} y2={y(max - 0.2)} stroke="var(--border)" strokeDasharray="3 4" />
      <line x1={padX} x2={W - padX} y1={y(min + 0.2)} y2={y(min + 0.2)} stroke="var(--border)" strokeDasharray="3 4" />
      <polyline points={path} fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) =>
        p.isAssessment ? (
          <circle key={i} cx={x(i)} cy={y(p.rating)} r={4} fill="var(--background)" stroke="var(--muted-foreground)" strokeWidth={2} />
        ) : (
          <circle key={i} cx={x(i)} cy={y(p.rating)} r={i === points.length - 1 ? 5 : 3.5} fill="var(--primary)" />
        ),
      )}
      <text x={W - padX} y={Math.max(12, y(last.rating) - 10)} textAnchor="end" fontSize={12} fontWeight={700} fill="var(--foreground)">
        {last.rating.toFixed(2)}
      </text>
      {ticks.map((i) => (
        <text
          key={i}
          x={x(i)}
          y={H - 8}
          fontSize={11}
          textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
          fill="var(--muted-foreground)"
        >
          {points[i]!.isAssessment ? "Autoev." : dayFmt.format(points[i]!.at).replace(".", "")}
        </text>
      ))}
    </svg>
  );
}
