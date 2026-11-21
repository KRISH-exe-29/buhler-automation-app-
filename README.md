# Feeder & I/O Planner · Bühler Automation Suite

Turns a project equipment workbook into an MCC feeder schedule, a junction-box mapping and a PLC I/O card count. It started as a Streamlit script written for Bühler automation projects and has been rebuilt as a static web app that runs entirely in the browser.

> Independent engineering tool. Not affiliated with or endorsed by Bühler AG.

## What it does

- **Feeder assignment**: each motor (`…MXZ..`) gets DOL, DOL_F, RDOL, RDDOL, SS or VFD from its power, machine code and remarks. These are the same rules as the original tool.
- **Junction boxes**: equipment is joined to Sheet3 by `Number`.
- **PLC I/O cards**: I/O points per feeder or device type come from an editable rules table. Spare is added (10 % by default) and cards are rounded up per channel count.
- **Validation**: unparseable power, motors that fall between the DOL and soft-starter thresholds, missing junction boxes and duplicate JB rows are each reported with their Excel row.
- **Dashboard**: shows connected power, current, feeder mix, power per JB and I/O points.
- **Export**: downloads a workbook with four sheets: Processed, IO Summary, Issues and Settings.
- **Privacy**: files are parsed in the browser with SheetJS and never uploaded.

## Input workbook

| Sheet  | Required columns |
|--------|------------------|
| Sheet1 | `starters`, `KW`. The first two DOL/SD/SS rows set the DOL max and SS min thresholds. |
| Sheet2 | `Number`, `Machine`, `Power`, `Remarks`, `Current` |
| Sheet3 | `Number`, `Schrank Aufstellungsort Feldkasten Stockwerk` |

`Power` accepts `7.5`, `7,5`, `7.5kW`, `750W`, `750VA` and `---`. Use **Download sample template** in the app for an example file.

## Changes from the original Streamlit app

- I/O totals are calculated from rules. The original summary used fixed numbers.
- Cards are sized on the total including spare, and the grand total is rounded up.
- `kW` suffixes and decimal commas parse correctly. The original read them as NaN.
- Motors that end up with no feeder are flagged instead of silently showing `NA`.

## Development

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # engine rules (Vitest)
npm run build
```

Built with Next.js, React, Tailwind CSS and SheetJS, and deployed on Vercel as a static site.
