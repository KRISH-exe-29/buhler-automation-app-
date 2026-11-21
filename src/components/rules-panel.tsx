"use client";

import { DEFAULT_SETTINGS, IO_COLS, type Settings, thresholdsFromStarters } from "@/lib/engine";
import type { WorkbookInput } from "@/lib/excel";
import { FeederTag, Panel, btnSecondary, input } from "./ui";

const num = (v: string, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export default function RulesPanel({
  settings,
  onChange,
  workbook,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  workbook: WorkbookInput;
}) {
  const sheet = thresholdsFromStarters(workbook.starters);
  const t = settings.thresholds ?? sheet;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Starter thresholds">
          <div className="space-y-4 p-4 text-sm">
            <fieldset className="space-y-2">
              <legend className="sr-only">Threshold source</legend>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="tsrc"
                  className="mt-1 accent-[var(--accent)]"
                  checked={!settings.thresholds}
                  onChange={() => onChange({ ...settings, thresholds: null })}
                />
                <span>
                  From Sheet1
                  <span className="block text-xs text-muted">
                    {sheet.source === "sheet"
                      ? `First DOL/SD/SS rows give ${sheet.dolMaxKw} kW and ${sheet.ssMinKw} kW`
                      : "Fewer than two DOL/SD/SS rows found, so the fallback 0 / 10 kW is used"}
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="tsrc"
                  className="mt-1 accent-[var(--accent)]"
                  checked={!!settings.thresholds}
                  onChange={() => onChange({ ...settings, thresholds: { dolMaxKw: sheet.dolMaxKw, ssMinKw: sheet.ssMinKw } })}
                />
                Custom values
              </label>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["dolMaxKw", "DOL up to (kW)"],
                  ["ssMinKw", "Soft starter from (kW)"],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="space-y-1">
                  <span className="text-xs text-muted">{label}</span>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    disabled={!settings.thresholds}
                    className={`${input} w-full`}
                    value={t[k]}
                    onChange={(e) => onChange({ ...settings, thresholds: { ...t, [k]: num(e.target.value) } })}
                  />
                </label>
              ))}
            </div>
            {t.ssMinKw > t.dolMaxKw && (
              <p className="text-xs text-muted">
                Motors between {t.dolMaxKw} and {t.ssMinKw} kW get no feeder and show up under Issues.
              </p>
            )}
          </div>
        </Panel>

        <Panel title="Spare capacity">
          <div className="space-y-3 p-4 text-sm">
            <label className="space-y-1 block">
              <span className="block text-xs text-muted">Spare I/O added before card sizing (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                className={`${input} w-32`}
                value={settings.sparePct}
                onChange={(e) => onChange({ ...settings, sparePct: Math.min(100, num(e.target.value, 10)) })}
              />
            </label>
            <p className="text-xs text-muted">
              Grand total = ⌈total × (1 + spare)⌉. Cards = ⌈grand total ÷ channels per card⌉.
            </p>
          </div>
        </Panel>
      </div>

      <Panel
        title="I/O per feeder / device type"
        aside={
          <button className={btnSecondary} onClick={() => onChange({ ...settings, rules: DEFAULT_SETTINGS.rules })}>
            Reset to defaults
          </button>
        }
      >
        <p className="border-b border-line px-4 py-3 text-xs text-muted">
          Signals each item contributes to the PLC. The defaults are placeholders, so set them once to your project&apos;s
          standard. Changes are saved in this browser and written to the export&apos;s Settings sheet.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Rule</th>
                {IO_COLS.map((c) => (
                  <th key={c} className="px-2 py-2 font-medium whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {Object.entries(settings.rules).map(([key, counts]) => (
                <tr key={key}>
                  <td className="px-3 py-2">
                    {key.startsWith("Type ") ? <span className="font-mono text-xs">{key}</span> : <FeederTag feeder={key} />}
                  </td>
                  {IO_COLS.map((c) => (
                    <td key={c} className="px-2 py-1.5">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        aria-label={`${key} ${c}`}
                        className={`${input} w-16`}
                        value={counts[c]}
                        onChange={(e) =>
                          onChange({
                            ...settings,
                            rules: { ...settings.rules, [key]: { ...counts, [c]: Math.floor(num(e.target.value)) } },
                          })
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
