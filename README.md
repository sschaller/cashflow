# Finance

A personal finance tracker built with React, TypeScript, and IndexedDB (via Dexie). All data stays local in the browser — no server required.

## Features

- **Import transactions** from CSV files (bank exports)
- **Categorize** transactions manually or via auto-matching rules
- **Dashboard** with spending overview and account balances
- **Charts** for visualizing spending patterns over time
- **Categories** with parent/child hierarchy and color coding
- **Rules engine** to automatically categorize future imports
- **Multi-account** support with per-account currency
- **Google Drive sync** for backup and cross-device persistence

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) for dev server and bundling
- [Tailwind CSS v4](https://tailwindcss.com/) for styling
- [Dexie](https://dexie.org/) (IndexedDB wrapper) for local storage
- [Chart.js](https://www.chartjs.org/) + [D3](https://d3js.org/) for visualizations
- [TanStack Table](https://tanstack.com/table) for data grids
- [Zustand](https://zustand-demo.pmnd.rs/) for state management
- [Vitest](https://vitest.dev/) + Testing Library for tests

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Google Drive Sync

Sync is optional. Without it the app works fully offline with data stored in IndexedDB.

To enable Google Drive backup/sync:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the **Google Drive API** under *APIs & Services > Library*
4. Configure the **OAuth consent screen** (*APIs & Services > OAuth consent screen*)
   - Choose "External" user type
   - Add the scope `https://www.googleapis.com/auth/drive.appdata`
   - This scope only grants access to a hidden app-specific folder — it cannot read your personal Drive files
5. Create an **OAuth 2.0 Client ID** (*APIs & Services > Credentials > Create Credentials > OAuth client ID*)
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:5173` (and your production URL if deployed)
   - Authorized redirect URIs: `http://localhost:5173` (same)
6. Copy the Client ID and add it to a `.env` file in the project root:

```bash
cp .env.example .env
```

```env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

The sync file (`finance-sync.enc`) is stored encrypted in your Google Drive's hidden app data folder.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |

## TODO

- [ ] Optimize category popularity query in `CategoryPicker` — currently iterates all transactions on every render via `useLiveQuery`; should run once on mount or use a pre-aggregated count
- [ ] **Replace snapshot-based sync with operation-based sync using UUIDs.** The current sync merges full DB snapshots using auto-increment IDs and last-write-wins on `updatedAt`. This breaks when two devices independently create records (e.g. categories, rules) — they get colliding auto-increment IDs, and one silently overwrites the other on merge. Deletes and renames on one device can clobber unrelated records on another. Fix: switch to UUIDs for all primary keys and implement an operation log (create/update/delete ops with timestamps) so each mutation is synced individually rather than diffing entire table snapshots.
