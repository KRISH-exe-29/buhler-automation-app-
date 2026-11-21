import type { ReactNode } from "react";
import type { Severity } from "@/lib/engine";

export const FEEDER_COLORS: Record<string, string> = {
  DOL: "#2563eb",
  DOL_F: "#0891b2",
  RDOL: "#7c3aed",
  RDDOL: "#c026d3",
  SS: "#ea580c",
  "VFD_VA=BA": "#16a34a",
  "VFD_VA=GB": "#65a30d",
  NA: "#9ca3af",
};

export const fmt = (n: number, digits = 1) => n.toLocaleString("en", { maximumFractionDigits: digits });

export function Panel({ title, aside, children, className = "" }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-line bg-surface ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}

export function FeederTag({ feeder }: { feeder: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs whitespace-nowrap">
      <span className="size-2 rounded-sm" style={{ background: FEEDER_COLORS[feeder] ?? FEEDER_COLORS.NA }} aria-hidden />
      {feeder}
    </span>
  );
}

const SEV: Record<Severity, string> = {
  error: "bg-err-soft text-err",
  warning: "bg-warn-soft text-warn",
  info: "bg-info-soft text-info",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${SEV[severity]}`}>{severity}</span>;
}

export const btn =
  "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";
export const btnPrimary = `${btn} bg-ink text-bg hover:opacity-90`;
export const btnSecondary = `${btn} border border-line-strong bg-surface hover:bg-surface-2`;
export const input =
  "rounded-md border border-line-strong bg-surface px-2.5 py-1.5 text-sm tnum focus:border-accent focus:outline-none";
