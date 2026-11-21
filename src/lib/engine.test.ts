import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  classifyFeeder,
  classifyType,
  parsePowerKw,
  processWorkbook,
  pySlice,
  thresholdsFromStarters,
} from "./engine";
import { demoWorkbook } from "./demo";

const T = { dolMaxKw: 7.5, ssMinKw: 11 };

describe("pySlice matches Python s[-5:-2]", () => {
  it.each([
    ["0101MXZ01", "MXZ"],
    ["MXZ01", "MXZ"],
    ["XZ01", "XZ"],
    ["01", ""],
    ["", ""],
  ])("%s → %s", (s, out) => expect(pySlice(s, -5, -2)).toBe(out));
});

describe("parsePowerKw (original pow())", () => {
  it.each<[unknown, number | null]>([
    ["---", 0],
    ["", 0],
    ["750W", 0.75],
    ["750VA", 0.75],
    ["7.5", 7.5],
    [7.5, 7.5],
    ["5,5", 5.5],
    ["7.5kW", 7.5],
    ["n/a", null],
    [null, null],
  ])("%s → %s", (v, out) => expect(parsePowerKw(v as never)).toBe(out));
});

describe("classifyType (original cat())", () => {
  it("MXZ is a motor", () => expect(classifyType("0101MXZ01", "MDDA")).toBe("M"));
  it("A codes", () => expect(classifyType("0101BPS01", "MVSL")).toBe("A"));
  it("XCJ + MVSL machine → MA override", () => expect(classifyType("0102XCJ01", "MVSL")).toBe("MA"));
  it("XCJ + other machine → A", () => expect(classifyType("0102XCJ01", "ABCD")).toBe("A"));
  it("MA codes", () => expect(classifyType("0102KCU01", "KCUV")).toBe("MA"));
  it("unknown → empty", () => expect(classifyType("0102ZZZ01", "X")).toBe(""));
});

describe("classifyFeeder (original cat1())", () => {
  const m = "0101MXZ01";
  it("reversing DOL machines", () => expect(classifyFeeder(2, m, "MTRC", "", T)).toBe("RDDOL"));
  it("RDOL machines", () => expect(classifyFeeder(2, m, "MPAV", "", T)).toBe("RDOL"));
  it("fan", () => expect(classifyFeeder(2, m, "FAN", "", T)).toBe("DOL_F"));
  it("plain DOL at the threshold", () => expect(classifyFeeder(7.5, m, "MDDA", "", T)).toBe("DOL"));
  it("soft starter at SS min", () => expect(classifyFeeder(11, m, "MDDA", "", T)).toBe("SS"));
  it("gap between thresholds → NA", () => expect(classifyFeeder(9.2, m, "MDDA", "", T)).toBe("NA"));
  it("VFD =BA", () => expect(classifyFeeder(2, m, "MDDA", "SC-S-P=BA", T)).toBe("VFD_VA=BA"));
  it("VFD other remark → GB", () => expect(classifyFeeder(45, m, "MDDA", "SC-S-M=BM", T)).toBe("VFD_VA=GB"));
  it("unparsed power, no VFD → NA", () => expect(classifyFeeder(null, m, "MDDA", "", T)).toBe("NA"));
  it("non-motor → NA", () => expect(classifyFeeder(2, "0101BPS01", "MDDA", "", T)).toBe("NA"));
});

describe("thresholdsFromStarters", () => {
  it("first two DOL/SD/SS rows", () =>
    expect(thresholdsFromStarters([{ starters: "VFD", KW: 1 }, { starters: "DOL", KW: 5.5 }, { starters: "SD", KW: 15 }])).toEqual({
      dolMaxKw: 5.5,
      ssMinKw: 15,
      source: "sheet",
    }));
  it("falls back to [0, 10]", () =>
    expect(thresholdsFromStarters([{ starters: "DOL", KW: 5 }])).toEqual({ dolMaxKw: 0, ssMinKw: 10, source: "default" }));
});

describe("processWorkbook on the demo dataset", () => {
  const r = processWorkbook(demoWorkbook(), DEFAULT_SETTINGS);
  it("uses Sheet1 thresholds", () => expect(r.thresholds).toMatchObject({ dolMaxKw: 7.5, ssMinKw: 11, source: "sheet" }));
  it("flags the gap motor, bad power and missing JB", () => {
    const msgs = r.issues.map((i) => `${i.number}:${i.severity}`);
    expect(msgs).toContain("0102MXZ05:warning");
    expect(msgs).toContain("0202MXZ04:error");
    expect(r.issues.some((i) => i.number === "0301SCS01" && /junction box/.test(i.message))).toBe(true);
  });
  it("I/O totals = rule × count, cards rounded up with spare", () => {
    const dol = r.rows.filter((x) => x.feeder === "DOL").length;
    const fan = r.rows.filter((x) => x.feeder === "DOL_F").length;
    const rev = r.rows.filter((x) => x.feeder === "RDOL" || x.feeder === "RDDOL").length;
    const di8 = r.summary.find((s) => s.col === "8 DI")!;
    expect(di8.total).toBe(2 * dol + 2 * fan + 3 * rev);
    expect(di8.grandTotal).toBe(Math.ceil(di8.total * 1.1));
    expect(di8.cards).toBe(Math.ceil(di8.grandTotal / 8));
  });
});
