// Pure processing engine — a faithful port of the original Streamlit rules
// (power parsing, Types, Feeders), plus real I/O totals and row validation.

export type Cell = string | number | boolean | null | undefined;
export type Row = Record<string, Cell>;

export const JB_SOURCE_COL = "Schrank Aufstellungsort Feldkasten Stockwerk";
export const REQUIRED = {
  starters: ["starters", "KW"],
  data: ["Number", "Machine", "Power", "Remarks", "Current"],
  jb: ["Number", JB_SOURCE_COL],
} as const;

export const IO_COLS = ["8 DI", "8 DO", "4 DI", "4 DO", "AI", "AO", "c/o", "S/S"] as const;
export type IoCol = (typeof IO_COLS)[number];
export type IoCounts = Record<IoCol, number>;
export type IoRules = Record<string, IoCounts>;

const VFD_REMARKS = ["SC-S-P=BA", "SC-S-P", "SC-S-M=BM", "SC-S-P=BM"];
const A_CODES = ["BPS", "SHE", "PAZ", "BLH", "BQS", "SCS", "EXL", "BFT", "BSA", "BZS", "QXV", "BLL", "XCJ"];
const MA_OVERRIDE_CODES = ["XCJ", "EXL", "QXV"];
const MA_OVERRIDE_MACHINES = ["MVSL", "MQRH", "MVRT", "MQRF"];
const MA_CODES = ["QYS", "SHC", "PWC", "BZA", "KCU", "BST", "BTT", "BRE", "KCL", "KFC", "RIN", "BWE"];

export const FEEDERS = ["DOL", "DOL_F", "RDOL", "RDDOL", "SS", "VFD_VA=BA", "VFD_VA=GB"] as const;

const io = (p: Partial<IoCounts> = {}): IoCounts =>
  Object.fromEntries(IO_COLS.map((c) => [c, p[c] ?? 0])) as IoCounts;

// Placeholder defaults — meant to be set once to the project's I/O standard in the Rules tab.
export const DEFAULT_RULES: IoRules = {
  DOL: io({ "8 DI": 2, "8 DO": 1 }),
  DOL_F: io({ "8 DI": 2, "8 DO": 1 }),
  RDOL: io({ "8 DI": 3, "8 DO": 2 }),
  RDDOL: io({ "8 DI": 3, "8 DO": 2 }),
  SS: io({ "4 DI": 3, "4 DO": 2, AI: 1 }),
  "VFD_VA=BA": io({ "4 DI": 3, "4 DO": 2, AI: 1, AO: 1 }),
  "VFD_VA=GB": io({ "4 DI": 3, "4 DO": 2, AI: 1, AO: 1 }),
  "Type A": io({ "4 DI": 2, "4 DO": 1 }),
  "Type MA": io({ "4 DI": 2, "4 DO": 2 }),
};

export const SUMMARY_LABELS: Record<IoCol, { label: string; channels: number | null }> = {
  "8 DI": { label: "DI · 8-channel", channels: 8 },
  "8 DO": { label: "DO · 8-channel", channels: 8 },
  "4 DI": { label: "DI · 4-channel", channels: 4 },
  "4 DO": { label: "DO · 4-channel", channels: 4 },
  AI: { label: "AI · 4-channel", channels: 4 },
  AO: { label: "AO · 4-channel", channels: 4 },
  "c/o": { label: "1 C/O relay", channels: null },
  "S/S": { label: "S/S", channels: null },
};

export interface Settings {
  /** null = take thresholds from Sheet1, like the original app */
  thresholds: { dolMaxKw: number; ssMinKw: number } | null;
  sparePct: number;
  rules: IoRules;
}

export const DEFAULT_SETTINGS: Settings = { thresholds: null, sparePct: 10, rules: DEFAULT_RULES };

export type Severity = "error" | "warning" | "info";
export interface Issue {
  row: number; // 1-based Excel row in Sheet2 (header is row 1)
  number: string;
  severity: Severity;
  message: string;
}

export interface ProcessedRow {
  source: Row;
  jb: string | null;
  kw: number | null;
  type: "" | "M" | "A" | "MA";
  feeder: string;
  ruleKey: string | null;
  io: IoCounts;
}

export interface SummaryRow {
  col: IoCol;
  label: string;
  total: number;
  spare: number;
  grandTotal: number;
  channels: number | null;
  cards: number | null;
}

export interface Result {
  rows: ProcessedRow[];
  issues: Issue[];
  thresholds: { dolMaxKw: number; ssMinKw: number; source: "sheet" | "default" | "custom" };
  totals: { powerKw: number; currentA: number; items: number; motors: number; jbs: number };
  summary: SummaryRow[];
  columns: string[];
}

const str = (v: Cell) => (v == null ? "" : String(v).trim());

/** Python-style s[start:end] with negative indices (clamped like CPython). */
export function pySlice(s: string, start: number, end: number): string {
  const n = s.length;
  const a = start < 0 ? Math.max(0, n + start) : Math.min(start, n);
  const b = end < 0 ? Math.max(0, n + end) : Math.min(end, n);
  return a < b ? s.slice(a, b) : "";
}

const toNum = (s: string): number | null => {
  const t = s.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/** Power cell → kW. "---"/"" → 0, "750W" → 0.75, "750VA" → 0.75, "7.5kW" → 7.5, "7.5" → 7.5. Empty cell → null. */
export function parsePowerKw(v: Cell): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const k = String(v).trim();
  if (k === "---" || k === "") return 0;
  if (/kw$/i.test(k)) return toNum(k.slice(0, -2));
  if (k.endsWith("W")) {
    const n = toNum(k.slice(0, -1));
    return n == null ? null : n / 1000;
  }
  if (k.endsWith("A")) {
    const n = toNum(k.slice(0, -2));
    return n == null ? null : n / 1000;
  }
  return toNum(k);
}

export const codeOf = (number: string) => pySlice(number, -5, -2);

export function classifyType(number: string, machine: string): ProcessedRow["type"] {
  const code = codeOf(number);
  if (code === "MXZ") return "M";
  if (A_CODES.includes(code))
    return MA_OVERRIDE_CODES.includes(code) && MA_OVERRIDE_MACHINES.includes(machine.slice(0, 4)) ? "MA" : "A";
  if (MA_CODES.includes(code)) return "MA";
  return "";
}

export function classifyFeeder(
  kw: number | null,
  number: string,
  machine: string,
  remarks: string,
  t: { dolMaxKw: number; ssMinKw: number },
): string {
  const isMotor = codeOf(number) === "MXZ";
  const isVfd = VFD_REMARKS.includes(remarks);
  if (isMotor && !isVfd && kw != null && kw <= t.dolMaxKw) {
    const p = machine.slice(0, 4);
    if (["MTRC", "MTRA", "MQRH", "MQRF"].includes(p)) return "RDDOL";
    if (["MTSD", "MPAV", "MPAW", "MPAU"].includes(p)) return "RDOL";
    if (machine === "FAN") return "DOL_F";
    return "DOL";
  }
  if (isMotor && !isVfd && kw != null && kw >= t.ssMinKw) return "SS";
  if (isMotor && isVfd) return remarks === "SC-S-P=BA" ? "VFD_VA=BA" : "VFD_VA=GB";
  return "NA";
}

/** Original rule: KW of the first two Sheet1 rows whose starter is DOL/SD/SS, else [0, 10]. */
export function thresholdsFromStarters(starters: Row[]) {
  const kws = starters
    .filter((r) => ["DOL", "SD", "SS"].includes(str(r.starters)))
    .map((r) => parsePowerKw(r.KW));
  if (kws.length >= 2 && kws[0] != null && kws[1] != null)
    return { dolMaxKw: kws[0], ssMinKw: kws[1], source: "sheet" as const };
  return { dolMaxKw: 0, ssMinKw: 10, source: "default" as const };
}

export function missingColumns(rows: Row[], required: readonly string[]): string[] {
  const present = new Set(rows.flatMap((r) => Object.keys(r)));
  return required.filter((c) => !present.has(c));
}

export function processWorkbook(
  input: { starters: Row[]; data: Row[]; jb: Row[] },
  settings: Settings,
): Result {
  const thresholds = settings.thresholds
    ? { ...settings.thresholds, source: "custom" as const }
    : thresholdsFromStarters(input.starters);
  const issues: Issue[] = [];

  const jbMap = new Map<string, string>();
  for (const r of input.jb) {
    const key = str(r.Number);
    if (!key) continue;
    if (jbMap.has(key)) {
      issues.push({ row: 0, number: key, severity: "info", message: "Duplicate Number in Sheet3 — first JB entry used" });
      continue;
    }
    jbMap.set(key, str(r[JB_SOURCE_COL]));
  }

  let powerKw = 0;
  let currentA = 0;
  const rows: ProcessedRow[] = input.data.map((source, i) => {
    const row = i + 2;
    const number = str(source.Number);
    const machine = str(source.Machine);
    const remarks = str(source.Remarks);
    const kw = parsePowerKw(source.Power);
    const type = classifyType(number, machine);
    const feeder = classifyFeeder(kw, number, machine, remarks, thresholds);
    const jb = jbMap.get(number) || null;

    if (kw == null)
      issues.push({
        row,
        number,
        severity: type === "M" ? "error" : "warning",
        message: source.Power == null ? "Power is empty" : `Power "${str(source.Power)}" could not be parsed`,
      });
    else powerKw += kw;

    const cur = source.Current;
    const curN = typeof cur === "number" ? cur : toNum(str(cur));
    if (curN != null) currentA += curN;
    else if (str(cur) !== "") issues.push({ row, number, severity: "info", message: `Current "${str(cur)}" is not numeric — counted as 0` });

    if (!jb && number) issues.push({ row, number, severity: "warning", message: "No junction box found in Sheet3" });
    if (type === "M" && feeder === "NA" && kw != null)
      issues.push({
        row,
        number,
        severity: "warning",
        message: `${kw} kW is between the DOL max (${thresholds.dolMaxKw} kW) and SS min (${thresholds.ssMinKw} kW) — no feeder assigned`,
      });

    const ruleKey = feeder !== "NA" ? feeder : type === "A" || type === "MA" ? `Type ${type}` : null;
    const counts = io((ruleKey && settings.rules[ruleKey]) || {});
    return { source, jb, kw, type, feeder, ruleKey, io: counts };
  });

  const spareF = settings.sparePct / 100;
  const summary: SummaryRow[] = IO_COLS.map((col) => {
    const total = rows.reduce((s, r) => s + r.io[col], 0);
    const grandTotal = Math.ceil(total * (1 + spareF));
    const { label, channels } = SUMMARY_LABELS[col];
    return {
      col,
      label,
      total,
      spare: grandTotal - total,
      grandTotal,
      channels,
      cards: channels ? Math.ceil(grandTotal / channels) : null,
    };
  });

  const columns = [...new Set(input.data.flatMap((r) => Object.keys(r)))];
  return {
    rows,
    issues,
    thresholds,
    totals: {
      powerKw,
      currentA,
      items: rows.length,
      motors: rows.filter((r) => r.type === "M").length,
      jbs: new Set(rows.map((r) => r.jb).filter(Boolean)).size,
    },
    summary,
    columns,
  };
}
