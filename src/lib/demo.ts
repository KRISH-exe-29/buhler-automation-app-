import { JB_SOURCE_COL, type Row } from "./engine";
import type { WorkbookInput } from "./excel";

// Fictional mill section used for the demo and the downloadable template.
// [number, machine, power, remarks, current, jb]
const ITEMS: [string, string, string | number, string, number | string, string][] = [
  ["0101MXZ01", "MDDA", "4.0", "", 8.2, "JB-01 / L1"],
  ["0101MXZ02", "MTRC", "2.2", "", 4.9, "JB-01 / L1"],
  ["0101MXZ03", "FAN", "5.5", "", 11.0, "JB-01 / L1"],
  ["0101MXZ04", "MTSD", "1.5", "", 3.4, "JB-01 / L1"],
  ["0101MXZ05", "MDDA", "750W", "", 1.9, "JB-01 / L1"],
  ["0101BPS01", "MVSL", "---", "", "", "JB-01 / L1"],
  ["0101SHE01", "SHEX", "---", "", "", "JB-01 / L1"],
  ["0101BST01", "BSTL", "24W", "", 0.1, "JB-01 / L1"],
  ["0102MXZ01", "MQRF", "3.0", "", 6.3, "JB-02 / L1"],
  ["0102MXZ02", "MDDA", "15", "", 28.5, "JB-02 / L1"],
  ["0102MXZ03", "MPAV", "1.1", "", 2.6, "JB-02 / L1"],
  ["0102MXZ04", "MDDA", "18.5", "SC-S-P=BA", 34.0, "JB-02 / L1"],
  ["0102MXZ05", "MDDA", "9.2", "", 17.8, "JB-02 / L1"],
  ["0102XCJ01", "MVSL", "---", "", "", "JB-02 / L1"],
  ["0102EXL01", "EXLS", "---", "", "", "JB-02 / L1"],
  ["0102KCU01", "KCUV", "---", "", "", "JB-02 / L1"],
  ["0201MXZ01", "MDDA", "30", "", 55.0, "JB-03 / L2"],
  ["0201MXZ02", "FAN", "37", "", 66.0, "JB-03 / L2"],
  ["0201MXZ03", "MDDA", "11", "SC-S-M=BM", 21.0, "JB-03 / L2"],
  ["0201MXZ04", "MTRA", "0.55", "", 1.5, "JB-03 / L2"],
  ["0201MXZ05", "MDDA", "5,5", "", 11.2, "JB-03 / L2"],
  ["0201BLH01", "BLHS", "---", "", "", "JB-03 / L2"],
  ["0201BZS01", "BZSM", "---", "", "", "JB-03 / L2"],
  ["0201QXV01", "MQRH", "---", "", "", "JB-03 / L2"],
  ["0202MXZ01", "MDDA", "2.2", "", 4.8, "JB-04 / L2"],
  ["0202MXZ02", "MPAW", "0.75", "", 1.9, "JB-04 / L2"],
  ["0202MXZ03", "MDDA", "45", "SC-S-P", 82.0, "JB-04 / L2"],
  ["0202MXZ04", "MDDA", "n/a", "", "", "JB-04 / L2"],
  ["0202BWE01", "BWEG", "---", "", "", "JB-04 / L2"],
  ["0202PAZ01", "PAZS", "---", "", "", "JB-04 / L2"],
  ["0202RIN01", "RING", "---", "", "", "JB-04 / L2"],
  ["0301MXZ01", "MDDA", "7.5", "", 14.5, "JB-05 / L3"],
  ["0301MXZ02", "FAN", "4.0", "", 8.1, "JB-05 / L3"],
  ["0301MXZ03", "MTRC", "1.1", "", 2.7, "JB-05 / L3"],
  ["0301BQS01", "BQSN", "---", "", "", "JB-05 / L3"],
  ["0301SCS01", "SCSW", "---", "", "", ""],
];

export function demoWorkbook(): WorkbookInput {
  const starters: Row[] = [
    { starters: "DOL", KW: 7.5 },
    { starters: "SS", KW: 11 },
    { starters: "VFD", KW: null },
  ];
  const data: Row[] = ITEMS.map(([Number, Machine, Power, Remarks, Current]) => ({
    Number,
    Machine,
    Power,
    Remarks: Remarks || null,
    Current: Current === "" ? null : Current,
  }));
  const jb: Row[] = ITEMS.filter((i) => i[5]).map(([Number, , , , , j]) => ({ Number, [JB_SOURCE_COL]: j }));
  return { starters, data, jb };
}
