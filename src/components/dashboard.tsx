import type { Result } from "@/lib/engine";
import { FEEDER_COLORS, Panel, fmt } from "./ui";

function Kpi({ label, value, unit, note }: { label: string; value: string; unit?: string; note?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-3.5">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tnum tracking-tight">{value}</span>
        {unit && <span className="text-sm text-muted">{unit}</span>}
      </div>
      {note && <div className="mt-0.5 text-xs text-faint">{note}</div>}
    </div>
  );
}

function Bars({ items, unit }: { items: { label: string; value: number; color?: string; note?: string; display?: string }[]; unit: string }) {
  const max = Math.max(1e-9, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2.5 p-4">
      {items.map((i) => (
        <li key={i.label} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate font-mono text-xs" title={i.label}>
            {i.label}
          </span>
          <span className="h-2 rounded-full bg-surface-2" aria-hidden>
            <span
              className="block h-full rounded-full"
              style={{ width: `${(i.value / max) * 100}%`, background: i.color ?? "var(--accent)" }}
            />
          </span>
          <span className="tnum text-right text-xs text-muted min-w-16">
            {i.display ?? `${fmt(i.value)} ${unit}`}
            {i.note && <span className="block text-faint">{i.note}</span>}
          </span>
        </li>
      ))}
      {!items.length && <li className="text-sm text-muted">Nothing to show.</li>}
    </ul>
  );
}

export default function Dashboard({ result }: { result: Result }) {
  const { totals, rows, summary, issues } = result;

  const byFeeder = new Map<string, { n: number; kw: number }>();
  for (const r of rows) {
    if (r.type !== "M") continue;
    const e = byFeeder.get(r.feeder) ?? { n: 0, kw: 0 };
    e.n++;
    e.kw += r.kw ?? 0;
    byFeeder.set(r.feeder, e);
  }
  const feeders = [...byFeeder].sort((a, b) => b[1].n - a[1].n);
  const motorCount = feeders.reduce((s, [, v]) => s + v.n, 0);

  const byJb = new Map<string, number>();
  for (const r of rows) byJb.set(r.jb ?? "Unassigned", (byJb.get(r.jb ?? "Unassigned") ?? 0) + (r.kw ?? 0));

  const types = [
    { label: "Motors", value: rows.filter((r) => r.type === "M").length },
    { label: "Field devices", value: rows.filter((r) => r.type === "A").length },
    { label: "Mixed (MA)", value: rows.filter((r) => r.type === "MA").length },
    { label: "Unclassified", value: rows.filter((r) => r.type === "").length },
  ];

  const cards = summary.reduce((s, x) => s + (x.cards ?? 0), 0);
  const errors = issues.filter((i) => i.severity === "error").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Connected power" value={fmt(totals.powerKw)} unit="kW" />
        <Kpi label="Total current" value={fmt(totals.currentA)} unit="A" />
        <Kpi label="Motors" value={String(totals.motors)} note={`of ${totals.items} items`} />
        <Kpi label="Junction boxes" value={String(totals.jbs)} />
        <Kpi label="PLC I/O cards" value={String(cards)} note="incl. spare" />
        <Kpi
          label="Issues"
          value={String(issues.length)}
          note={errors ? `${errors} need attention` : issues.length ? "warnings only" : "all rows clean"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Feeder mix" aside={<span className="text-xs text-muted">{motorCount} motors</span>}>
          <div className="px-4 pt-4">
            <div className="flex h-3 overflow-hidden rounded-full bg-surface-2" role="img" aria-label="Feeder distribution">
              {feeders.map(([f, v]) => (
                <span key={f} style={{ width: `${(v.n / Math.max(1, motorCount)) * 100}%`, background: FEEDER_COLORS[f] }} title={`${f}: ${v.n}`} />
              ))}
            </div>
          </div>
          <Bars
            unit="motors"
            items={feeders.map(([f, v]) => ({ label: f, value: v.n, color: FEEDER_COLORS[f], note: `${fmt(v.kw)} kW`, display: `${v.n} motor${v.n === 1 ? "" : "s"}` }))}
          />
        </Panel>

        <Panel title="Power by junction box">
          <Bars unit="kW" items={[...byJb].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))} />
        </Panel>

        <Panel title="Equipment types">
          <Bars unit="" items={types.map((t) => ({ ...t, color: "var(--ink)" }))} />
        </Panel>

        <Panel title="I/O points (incl. spare)">
          <Bars
            unit="pts"
            items={summary.filter((s) => s.grandTotal).map((s) => ({ label: s.label, value: s.grandTotal, note: s.cards ? `${s.cards} card${s.cards === 1 ? "" : "s"}` : undefined }))}
          />
        </Panel>
      </div>
    </div>
  );
}
