# ⚙️ Bühler Automation Processing App

A Streamlit-based web application that automates the processing of Bühler electrical equipment data from Excel files, categorises motor starters, calculates power/current totals, and generates a downloadable processed output.

---

## 📋 Table of Contents

- [How to Push Your Local VS Code Project to GitHub](#how-to-push-your-local-vs-code-project-to-github)
- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Local Setup](#installation--local-setup)
- [Running the App](#running-the-app)
- [How to Use the App](#how-to-use-the-app)
- [Input File Format](#input-file-format)
- [Output](#output)
- [Development Container](#development-container)

---

## How to Push Your Local VS Code Project to GitHub

> **You have the project open in VS Code locally and want to upload the entire folder to GitHub.**  
> Follow the steps below — they cover both the Terminal approach and the built-in VS Code Source Control UI.

---

### Option A — Using the VS Code Terminal (recommended)

Open the integrated terminal in VS Code with `` Ctrl + ` `` (or **View → Terminal**) and run the commands below one at a time.

#### Step 1 — Create a new (empty) repository on GitHub

1. Go to [https://github.com/new](https://github.com/new).
2. Give it a name (e.g., `buhler-automation-app-`).
3. Leave it **completely empty** — no README, no `.gitignore`, no licence.
4. Click **Create repository** and keep the page open; you will need the URL.

#### Step 2 — Initialise Git in your project folder (if not already done)

```bash
# Make sure you are in the root of your project folder first
cd path/to/your/project

git init
```

#### Step 3 — Stage every file in the folder

```bash
git add .
```

`git add .` stages **all files and sub-folders** in the current directory so that everything gets included in the commit.

#### Step 4 — Create the first commit

```bash
git commit -m "Initial commit: Bühler Automation App"
```

#### Step 5 — Link your local repo to GitHub and push

```bash
# Replace <YOUR_USERNAME> and <REPO_NAME> with your actual values
git remote add origin https://github.com/<YOUR_USERNAME>/<REPO_NAME>.git
git branch -M main
git push -u origin main
```

After this, refresh the GitHub page — your entire project folder will be there. ✅

---

### Option B — Using the VS Code Source Control UI (no terminal needed)

1. Open the **Source Control** panel on the left sidebar (the branch icon, or `Ctrl+Shift+G`).
2. Click **Initialize Repository**.
3. In the text box at the top, type a commit message (e.g., `Initial commit`) and click the **✔ Commit** button.
4. Click **Publish Branch** (appears in the Source Control panel or the status bar at the bottom).
5. VS Code will ask you to sign in to GitHub if you have not already, then let you choose a repository name. Select **public** or **private** and click **OK**.

Your entire project folder is now on GitHub. ✅

---

### Pushing subsequent changes (after the first push)

Every time you make changes:

```bash
git add .
git commit -m "Brief description of what you changed"
git push
```

Or in VS Code: stage the changed files in the **Source Control** panel, write a commit message, click **Commit**, then click **Sync Changes**.

---

### Recommended: add a `.gitignore` file

Create a `.gitignore` in the project root so that VS Code settings, virtual environments, and compiled files are not uploaded:

```
# Python
__pycache__/
*.pyc
.venv/
venv/
*.egg-info/

# VS Code
.vscode/

# OS files
.DS_Store
Thumbs.db
```

> A full Python `.gitignore` template is available at [gitignore.io](https://www.toptal.com/developers/gitignore/api/python).

---

## Overview

The Bühler Automation Processing App reads an Excel workbook with three sheets containing starter configurations, equipment data, and junction box (JB) information. It:

- Merges JB location data into the equipment list.
- Parses motor power values (kW, W, A).
- Classifies each piece of equipment by type and feeder category (DOL, SS, VFD, etc.).
- Summarizes I/O card requirements with 10 % spare capacity.
- Produces a downloadable `.xlsx` report.

---

## Features

- 📤 Upload an `.xlsx` file directly in the browser.
- 🔗 Auto-merges junction box location data with equipment records.
- ⚡ Converts heterogeneous power units (kW / W / A) to a consistent kW value.
- 🏷️ Categorizes motors as `DOL`, `RDDOL`, `RDOL`, `DOL_F`, `SS`, or `VFD_VA`.
- 📊 Generates an I/O card summary table with spare 10 % and card count.
- 📥 One-click download of the processed Excel workbook (`processed_output.xlsx`).

---

## Project Structure

```
buhler-automation-app-/
├── .devcontainer/
│   └── devcontainer.json   # GitHub Codespaces / VS Code Dev Container config
├── streamlit_app.py         # Main Streamlit application
├── requirements.txt         # Python dependencies
└── README.md                # This file
```

---

## Prerequisites

- **Python 3.9+** (3.11 recommended)
- **pip** package manager

---

## Installation & Local Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/Itachi-ACA/buhler-automation-app-.git
   cd buhler-automation-app-
   ```

2. **Create and activate a virtual environment** (recommended)

   ```bash
   # macOS / Linux
   python3 -m venv .venv
   source .venv/bin/activate

   # Windows (Command Prompt)
   python -m venv .venv
   .venv\Scripts\activate
   ```

3. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

---

## Running the App

```bash
streamlit run streamlit_app.py
```

The app will open automatically in your default browser at `http://localhost:8501`.

---

## How to Use the App

1. Prepare your Excel workbook following the [Input File Format](#input-file-format) below.
2. Open the app and click **Browse files** (or drag-and-drop) to upload the `.xlsx` file.
3. The app processes the data instantly and shows a success message with total power (kW) and total current (A).
4. Click **📥 Download Processed Excel File** to save the output workbook.

---

## Input File Format

The uploaded `.xlsx` workbook **must** contain exactly these three sheets:

| Sheet | Required Columns | Description |
|-------|-----------------|-------------|
| **Sheet1** | `starters`, `KW` | Starter type configuration and kW range thresholds |
| **Sheet2** | `Number`, `Machine`, `Power`, `Current`, `Remarks` | Main equipment list |
| **Sheet3** | `Number`, `Schrank Aufstellungsort Feldkasten Stockwerk` | Junction box location data |

> **Tip:** The `Power` column in Sheet2 can contain values in the format `45kW`, `750W`, `3.2A`, or plain numeric kW values.

---

## Output

The downloaded `processed_output.xlsx` contains two sheets:

| Sheet | Description |
|-------|-------------|
| **Processed** | Full equipment list enriched with `JB`, `X` (power in kW), `Types`, `Feeders`, and placeholder I/O columns |
| **Summary** | I/O card summary with totals, 10 % spare, grand total, card count, and considered card count |

---

## Development Container

This project ships with a [Dev Container](https://containers.dev/) configuration (`.devcontainer/devcontainer.json`) for use with **GitHub Codespaces** or **VS Code Remote - Containers**.

When the container starts it automatically:
1. Installs all Python dependencies from `requirements.txt`.
2. Launches the Streamlit app on port **8501**.

To use it, open the repository in GitHub Codespaces or in VS Code with the **Dev Containers** extension installed and click **Reopen in Container**.

