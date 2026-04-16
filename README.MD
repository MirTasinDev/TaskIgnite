# TaskIgnite

TaskIgnite is a lightweight, offline‑first task manager built as a Windows desktop app (Electron). It runs fully on your machine with zero backend and saves everything to local storage: tasks, activity log, briefings, reports, schedule, theme, and language.

## What it does
- Live dashboard with clock, year progress, dot calendar, workload trend chart, and activity feed
- Task creation, status tracking, and deletion
- Auto‑generated briefings and on‑demand briefings
- Action Briefing (remaining tasks) and Completion Briefing (completed tasks) on dedicated pages
- Weekly, monthly, and annual reports with PDF download and print
- Dark/light theme, six‑language support, RTL for Arabic
- First‑run name capture with time‑based greetings

## Project structure
```
TASK MANAGE/
├── main.js            # Electron main process
├── preload.js         # Secure renderer bridge
├── package.json       # App scripts + build settings
├── renderer/
│   └── index.html     # UI + styles + logic (single file)
└── README.MD
```

## How to run (development)
1) Install Node.js from https://nodejs.org
2) Open a terminal in `TASK MANAGE`
3) Install dependencies:
```
npm install
```
4) Start the app:
```
npm start
```

## Build a Windows installer (.exe)
```
npm run build
```
The installer will be generated in `dist/`.

## App icon
The Windows icon is located at `assets/icon.ico` and is used automatically during packaging.

## Startup behavior
- After installation, TaskIgnite is configured to **start with Windows**.
- This is enabled only in the packaged app (not during `npm start`).

## How to use
1) Launch the app and enter your name (first run only).
2) Add tasks in the Tasks tab.
3) Check items on the Dashboard to mark them Completed.
4) Use the Briefings tab to generate Action or Completion briefings.
5) Generate Reports and download/print PDFs as needed.

## Notes
- All data is stored locally using `localStorage`.
- No internet connection is required.
- If you delete a task, it is removed from storage and will not appear in briefings.

---
TaskIgnite — fast, focused, and offline.
