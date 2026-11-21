import * as XLSX from "xlsx";
import { IO_COLS, REQUIRED, missingColumns, type Result, type Row, type Settings } from "./engine";

export type WorkbookInput = { starters: Row[]; data: Row[]; jb: Row[] };

const SHEETS = { starters: "Sheet1", data: "Sheet2", jb: "Sheet3" } as const;

export class InputError extends Error {}

export function readWorkbook(buf: ArrayBuffer): WorkbookInput {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buf, { type: "array" });
  } catch {
    throw new InputError("This file could not be read as an Excel workbook.");
  }
  const out = {} as WorkbookInput;
  for (const [key, name] of Object.entries(SHEETS) as [keyof WorkbookInput, string][]) {
    const ws = wb.Sheets[name];
    if (!ws) throw new InputError(`Sheet "${name}" is missing. Found: ${wb.SheetNames.join(", ") || "none"}.`);
    const rows = XLSX.utils.sheet_to_json<Row>(ws, { defval: null });
    const missing = missingColumns(rows, REQUIRED[key]);
    if (missing.length) throw new InputError(`Sheet "${name}" is missing column(s): ${missing.join(", ")}.`);
    out[key] = rows;
  }
  return out;
}

const sheet = (rows: object[]) => XLSX.utils.json_to_sheet(rows);

export function exportResult(result: Result, settings: Settings, fileName: string) {
  const wb = XLSX.utils.book_new();
  const processed = result.rows.map((r) => ({
    ...r.source,
    JB: r.jb ?? "",
    "Power (kW)": r.kw ?? "",
    Types: r.type,
    Feeders: r.feeder,
    ...r.io,
  }));
  XLSX.utils.book_append_sheet(wb, sheet(processed), "Processed");
  XLSX.utils.book_append_sheet(
    wb,
    sheet(
      result.summary.map((s) => ({
        Type: s.label,
        Total: s.total,
        [`Spare ${settings.sparePct}%`]: s.spare,
        "Grand Total": s.grandTotal,
        Channels: s.channels ?? "",
        Cards: s.cards ?? "",
      })),
    ),
    "IO Summary",
  );
  XLSX.utils.book_append_sheet(
    wb,
    sheet(result.issues.map((i) => ({ Row: i.row || "", Number: i.number, Severity: i.severity, Issue: i.message }))),
    "Issues",
  );
  XLSX.utils.book_append_sheet(
    wb,
    sheet([
      { Setting: "DOL max (kW)", Value: result.thresholds.dolMaxKw, Source: result.thresholds.source },
      { Setting: "SS min (kW)", Value: result.thresholds.ssMinKw, Source: result.thresholds.source },
      { Setting: "Spare (%)", Value: settings.sparePct, Source: "" },
      ...Object.entries(settings.rules).map(([k, v]) => ({
        Setting: `I/O rule: ${k}`,
        Value: IO_COLS.filter((c) => v[c]).map((c) => `${c}=${v[c]}`).join(", ") || "none",
        Source: "",
      })),
    ]),
    "Settings",
  );
  XLSX.writeFile(wb, fileName);
}

export function downloadTemplate(input: WorkbookInput) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet(input.starters), SHEETS.starters);
  XLSX.utils.book_append_sheet(wb, sheet(input.data), SHEETS.data);
  XLSX.utils.book_append_sheet(wb, sheet(input.jb), SHEETS.jb);
  XLSX.writeFile(wb, "feeder-planner-sample.xlsx");
}
