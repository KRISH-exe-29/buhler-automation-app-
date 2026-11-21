"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_SETTINGS, JB_SOURCE_COL, REQUIRED, processWorkbook, type Result, type Settings } from "@/lib/engine";
import { InputError, downloadTemplate, exportResult, readWorkbook, type WorkbookInput } from "@/lib/excel";
import { demoWorkbook } from "@/lib/demo";
import Dashboard from "./dashboard";
import DataGrid from "./data-grid";
import RulesPanel from "./rules-panel";
import { Panel, SeverityBadge, btnPrimary, btnSecondary } from "./ui";

const STORE = "feeder-planner:settings:v1";
const TABS = ["Overview", "Equipment", "I/O cards", "Issues", "Rules"] as const;
type Tab = (typeof TABS)[number];

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return DEFAULT_SETTINGS;
    const s = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...s, rules: { ...DEFAULT_SETTINGS.rules, ...s.rules } };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function Mark() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
      <rect x="1" y="1" width="22" height="22" rx="5" fill="var(--ink)" />
      <path d="M6 7h5v4H6zM13 7h5v4h-5zM6 13h5v4H6z" fill="var(--bg)" />
      <path d="M13 13h5v4h-5z" fill="var(--accent)" />
    </svg>
  );
}

function Dropzone({ onFile, busy }: { onFile: (f: File) => void; busy: boolean }) {
  const [over, setOver] = useState(false);
  return (
    <label
      onDragOver={(e) => (e.preventDefault(), setOver(true))}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-14 text-center transition-colors ${
        over ? "border-accent bg-accent-soft" : "border-line-strong bg-surface hover:bg-surface-2"
      }`}
    >
      <svg viewBox="0 0 24 24" className="size-8 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M12 16V4m0 0L7 9m5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
      </svg>
      <div>
        <div className="font-medium">{busy ? "Reading workbook…" : "Drop your equipment workbook here"}</div>
        <div className="mt-1 text-sm text-muted">or click to browse · .xlsx</div>
      </div>
      <input
        type="file"
        accept=".xlsx,.xlsm,.xls"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function Landing({ onFile, onDemo, busy, error }: { onFile: (f: File) => void; onDemo: () => void; busy: boolean; error: string | null }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-20">
      <div className="space-y-6">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">MCC &amp; PLC engineering</p>
        <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          From equipment list to feeder schedule and I/O card count in seconds.
        </h1>
        <p className="max-w-xl text-lg text-muted">
          Upload the project workbook. Every motor gets a starter type (DOL, reversing, soft starter or VFD) and a junction
          box, PLC I/O is totalled with spare, and rows that need an engineer&apos;s eye are flagged.
        </p>
        <ul className="grid max-w-xl gap-3 text-sm sm:grid-cols-3">
          {[
            ["Private", "Processed in your browser. No upload, no server."],
            ["Traceable", "Every issue points to its Excel row."],
            ["Configurable", "Thresholds and I/O rules match your standard."],
          ].map(([t, d]) => (
            <li key={t} className="border-l-2 border-accent pl-3">
              <div className="font-medium">{t}</div>
              <div className="text-muted">{d}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-4">
        <Dropzone onFile={onFile} busy={busy} />
        {error && (
          <div role="alert" className="rounded-md border border-err/30 bg-err-soft px-4 py-3 text-sm text-err">
            {error}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button className={btnPrimary} onClick={onDemo}>
            Try with demo data
          </button>
          <button className={btnSecondary} onClick={() => downloadTemplate(demoWorkbook())}>
            Download sample template
          </button>
        </div>
        <Panel title="Expected workbook">
          <dl className="divide-y divide-line text-sm">
            {(
              [
                ["Sheet1", "Starter table", REQUIRED.starters],
                ["Sheet2", "Equipment list", REQUIRED.data],
                ["Sheet3", "Junction boxes", ["Number", "Schrank Aufstellungsort…"]],
              ] as const
            ).map(([s, d, cols]) => (
              <div key={s} className="grid grid-cols-[5rem_1fr] gap-3 px-4 py-2.5">
                <dt className="font-mono text-xs leading-5">{s}</dt>
                <dd>
                  <div>{d}</div>
                  <div className="font-mono text-xs text-muted" title={s === "Sheet3" ? JB_SOURCE_COL : undefined}>
                    {cols.join(" · ")}
                  </div>
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
    </div>
  );
}

function IoCards({ result, sparePct }: { result: Result; sparePct: number }) {
  const cards = result.summary.reduce((s, x) => s + (x.cards ?? 0), 0);
  return (
    <Panel title="PLC I/O card summary" aside={<span className="text-xs text-muted tnum">{cards} cards total</span>}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs text-muted">
            <tr>
              {["Type", "Total", `Spare ${sparePct}%`, "Grand total", "Channels / card", "Cards"].map((h, i) => (
                <th key={h} className={`px-4 py-2 font-medium ${i ? "text-right" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line tnum">
            {result.summary.map((s) => (
              <tr key={s.col}>
                <td className="px-4 py-2.5">{s.label}</td>
                <td className="px-4 py-2.5 text-right">{s.total}</td>
                <td className="px-4 py-2.5 text-right text-muted">+{s.spare}</td>
                <td className="px-4 py-2.5 text-right font-medium">{s.grandTotal}</td>
                <td className="px-4 py-2.5 text-right text-muted">{s.channels ?? "—"}</td>
                <td className="px-4 py-2.5 text-right text-base font-semibold">{s.cards ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-line px-4 py-3 text-xs text-muted">
        Totals come from the per-item I/O rules (Rules tab), not fixed numbers.
      </p>
    </Panel>
  );
}

function Issues({ result }: { result: Result }) {
  const order = { error: 0, warning: 1, info: 2 };
  const list = [...result.issues].sort((a, b) => order[a.severity] - order[b.severity] || a.row - b.row);
  return (
    <Panel title="Validation" aside={<span className="text-xs text-muted tnum">{list.length} issues</span>}>
      {list.length ? (
        <ul className="divide-y divide-line text-sm">
          {list.map((i, k) => (
            <li key={k} className="grid grid-cols-[4.5rem_6rem_1fr] items-center gap-3 px-4 py-2.5 sm:grid-cols-[4.5rem_4rem_8rem_1fr]">
              <SeverityBadge severity={i.severity} />
              <span className="hidden font-mono text-xs text-faint tnum sm:block">{i.row ? `row ${i.row}` : "Sheet3"}</span>
              <span className="truncate font-mono text-xs">{i.number}</span>
              <span className="text-muted">{i.message}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-10 text-center text-sm text-muted">No issues. Every row was parsed and assigned.</p>
      )}
    </Panel>
  );
}

export default function Planner() {
  const [workbook, setWorkbook] = useState<WorkbookInput | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("Overview");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const loaded = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after hydration
    setSettings(loadSettings());
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORE, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const result = useMemo(() => (workbook ? processWorkbook(workbook, settings) : null), [workbook, settings]);

  async function onFile(f: File) {
    setBusy(true);
    setError(null);
    try {
      setWorkbook(readWorkbook(await f.arrayBuffer()));
      setFileName(f.name);
      setTab("Overview");
    } catch (e) {
      setError(e instanceof InputError ? e.message : "Something went wrong while reading this file.");
    } finally {
      setBusy(false);
    }
  }

  const errors = result?.issues.filter((i) => i.severity === "error").length ?? 0;

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <button className="flex items-center gap-2.5 text-left" onClick={() => setWorkbook(null)} aria-label="Home">
            <Mark />
            <span className="leading-tight">
              <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Bühler Automation Suite</span>
              <span className="block text-sm font-semibold">Feeder &amp; I/O Planner</span>
            </span>
          </button>
          {result && (
            <button
              className={btnPrimary}
              onClick={() => exportResult(result, settings, fileName.replace(/\.\w+$/, "") + "-processed.xlsx")}
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 4v12m0 0 5-5m-5 5-5-5M4 20h16" />
              </svg>
              <span className="hidden sm:inline">Export workbook</span>
              <span className="sm:hidden">Export</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1">
        {!workbook || !result ? (
          <Landing
            onFile={onFile}
            busy={busy}
            error={error}
            onDemo={() => {
              setWorkbook(demoWorkbook());
              setFileName("demo-mill-section.xlsx");
              setError(null);
            }}
          />
        ) : (
          <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="font-mono text-xs text-muted">{fileName}</div>
                <h1 className="text-xl font-semibold tracking-tight">
                  {result.totals.items} items · {result.totals.motors} motors
                </h1>
                <div className="text-xs text-muted">
                  DOL ≤ {result.thresholds.dolMaxKw} kW · SS ≥ {result.thresholds.ssMinKw} kW ·{" "}
                  {result.thresholds.source === "custom"
                    ? "custom thresholds"
                    : result.thresholds.source === "sheet"
                      ? "from Sheet1"
                      : "fallback thresholds"}
                </div>
              </div>
              <label className={`${btnSecondary} cursor-pointer`}>
                Load another file
                <input
                  type="file"
                  accept=".xlsx,.xlsm,.xls"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {error && (
              <div role="alert" className="rounded-md border border-err/30 bg-err-soft px-4 py-3 text-sm text-err">
                {error}
              </div>
            )}

            <nav className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0" aria-label="Sections">
              <div role="tablist" className="flex w-max gap-1 border-b border-line sm:w-full">
                {TABS.map((t) => (
                  <button
                    key={t}
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition-colors ${
                      tab === t ? "border-accent font-medium text-ink" : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    {t}
                    {t === "Issues" && result.issues.length > 0 && (
                      <span className={`rounded-full px-1.5 text-[11px] tnum ${errors ? "bg-err-soft text-err" : "bg-warn-soft text-warn"}`}>
                        {result.issues.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </nav>

            <div role="tabpanel">
              {tab === "Overview" && <Dashboard result={result} />}
              {tab === "Equipment" && <DataGrid result={result} />}
              {tab === "I/O cards" && <IoCards result={result} sparePct={settings.sparePct} />}
              {tab === "Issues" && <Issues result={result} />}
              {tab === "Rules" && <RulesPanel settings={settings} onChange={setSettings} workbook={workbook} />}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-5 text-xs text-faint sm:flex-row sm:justify-between sm:px-6">
          <span>Independent engineering tool built for Bühler automation projects. Not affiliated with or endorsed by Bühler AG.</span>
          <a className="hover:text-ink" href="https://github.com/KRISH-exe-29/buhler-automation-app-">
            Source on GitHub
          </a>
        </div>
      </footer>
    </>
  );
}
