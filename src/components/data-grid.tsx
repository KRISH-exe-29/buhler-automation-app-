"use client";

import { useMemo, useState } from "react";
import { IO_COLS, type Result } from "@/lib/engine";
import { FeederTag, Panel, btnSecondary, fmt, input } from "./ui";

const PAGE = 50;

export default function DataGrid({ result }: { result: Result }) {
  const [q, setQ] = useState("");
  const [feeder, setFeeder] = useState("");
  const [jb, setJb] = useState("");
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [page, setPage] = useState(0);

  const issueRows = useMemo(() => {
    const m = new Map<number, string[]>();
    for (const i of result.issues) if (i.row) m.set(i.row, [...(m.get(i.row) ?? []), i.message]);
    return m;
  }, [result.issues]);

  const feeders = useMemo(() => [...new Set(result.rows.map((r) => r.feeder))].sort(), [result.rows]);
  const jbs = useMemo(() => [...new Set(result.rows.map((r) => r.jb ?? ""))].sort(), [result.rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return result.rows
      .map((r, i) => ({ r, row: i + 2 }))
      .filter(({ r, row }) => {
        if (feeder && r.feeder !== feeder) return false;
        if (jb && (r.jb ?? "") !== jb) return false;
        if (issuesOnly && !issueRows.has(row)) return false;
        if (!needle) return true;
        return [r.source.Number, r.source.Machine, r.source.Remarks, r.jb, r.feeder].some((v) => String(v ?? "").toLowerCase().includes(needle));
      });
  }, [result.rows, q, feeder, jb, issuesOnly, issueRows]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const p = Math.min(page, pages - 1);
  const shown = filtered.slice(p * PAGE, p * PAGE + PAGE);
  const reset = <T,>(set: (v: T) => void) => (v: T) => (set(v), setPage(0));

  return (
    <Panel
      title="Processed equipment"
      aside={
        <span className="text-xs text-muted tnum">
          {filtered.length} of {result.rows.length} rows
        </span>
      }
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <input
          type="search"
          placeholder="Search number, machine, JB…"
          aria-label="Search rows"
          className={`${input} w-full sm:w-64`}
          value={q}
          onChange={(e) => reset(setQ)(e.target.value)}
        />
        <select aria-label="Filter by feeder" className={input} value={feeder} onChange={(e) => reset(setFeeder)(e.target.value)}>
          <option value="">All feeders</option>
          {feeders.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <select aria-label="Filter by junction box" className={input} value={jb} onChange={(e) => reset(setJb)(e.target.value)}>
          <option value="">All JBs</option>
          {jbs.map((j) => (
            <option key={j} value={j}>
              {j || "Unassigned"}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={issuesOnly} onChange={(e) => reset(setIssuesOnly)(e.target.checked)} className="accent-[var(--accent)]" />
          Rows with issues
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs text-muted">
            <tr>
              {["Row", "Number", "Machine", "Power", "kW", "Remarks", "Current", "JB", "Type", "Feeder", "I/O"].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map(({ r, row }) => {
              const iss = issueRows.get(row);
              const ioStr = IO_COLS.filter((c) => r.io[c]).map((c) => `${c}:${r.io[c]}`).join("  ");
              return (
                <tr key={row} className={iss ? "bg-warn-soft/50" : "hover:bg-surface-2"}>
                  <td className="px-3 py-2 tnum text-faint">
                    {iss ? (
                      <span title={iss.join("\n")} className="text-warn">
                        ● {row}
                      </span>
                    ) : (
                      row
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{String(r.source.Number ?? "")}</td>
                  <td className="px-3 py-2 font-mono text-xs">{String(r.source.Machine ?? "")}</td>
                  <td className="px-3 py-2 tnum text-muted">{String(r.source.Power ?? "—")}</td>
                  <td className="px-3 py-2 tnum">{r.kw == null ? <span className="text-err">—</span> : fmt(r.kw, 3)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted">{String(r.source.Remarks ?? "")}</td>
                  <td className="px-3 py-2 tnum text-muted">{String(r.source.Current ?? "")}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.jb ?? <span className="text-warn">—</span>}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.type || "—"}</td>
                  <td className="px-3 py-2">
                    <FeederTag feeder={r.feeder} />
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted whitespace-nowrap">{ioStr || "—"}</td>
                </tr>
              );
            })}
            {!shown.length && (
              <tr>
                <td colSpan={11} className="px-3 py-10 text-center text-muted">
                  No rows match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 border-t border-line px-4 py-3 text-sm">
          <span className="text-muted tnum">
            Page {p + 1} / {pages}
          </span>
          <button className={btnSecondary} disabled={p === 0} onClick={() => setPage(p - 1)}>
            Previous
          </button>
          <button className={btnSecondary} disabled={p >= pages - 1} onClick={() => setPage(p + 1)}>
            Next
          </button>
        </div>
      )}
    </Panel>
  );
}
