# Finance Tracker — AGENTS.md

## Project Overview
Local-first personal finance web app. Import bank/credit card transactions (CSV/JSON), auto-categorize via user-editable rules, visualize with pie charts, bar charts, and Sankey diagrams. All data stored in browser IndexedDB via Dexie.js. Architecture prepared for future encrypted Google Cloud sync.

## Tech Stack
- **Framework:** React 19 + Vite + TypeScript
- **Styling:** Tailwind CSS v4
- **Storage:** Dexie.js (IndexedDB), reactive queries via `useLiveQuery`
- **State:** Zustand (selector-based subscriptions)
- **Charts:** Chart.js + react-chartjs-2 (pie/bar), d3-sankey + d3-shape (Sankey diagrams)
- **CSV:** PapaParse
- **Tables:** @tanstack/react-table (headless)
- **Dates:** date-fns
- **Routing:** react-router-dom v7
- **Testing:** Vitest + @testing-library/react + fake-indexeddb

## Architecture Principles
1. **Repository pattern** — All data access goes through interfaces in `src/repositories/interfaces.ts`. Components never call Dexie directly. This enables swapping the storage backend (e.g., synced cloud) without touching UI or business logic.
2. **Pure business logic** — `src/services/` and `src/utils/` have zero dependencies on React, Dexie, or the DOM. The categorization engine is a pure function: `(transaction, rules[]) => categoryId`.
3. **Zustand for UI state** — Stores in `src/stores/` hold UI state and cached query results. Source of truth is always IndexedDB.
4. **Pluggable parsers** — `src/parsers/` is a registry. Add a new format by creating a parser file and registering it.
5. **Sync-ready** — Every entity has `_syncVersion?: number` for future optimistic concurrency. The `RepositoryProvider` in `src/repositories/provider.ts` is the only place that needs to change when sync is added.

## Key Directories
- `src/db/` — Dexie database definition, schema, migrations, seed data
- `src/types/` — TypeScript interfaces for all entities (Account, Transaction, Category, Rule, ImportProfile)
- `src/repositories/` — Data access layer (interfaces + Dexie implementations)
- `src/services/` — Business logic (categorization engine, import orchestration, export)
- `src/parsers/` — File format parsers (CSV, JSON) + column mapper
- `src/stores/` — Zustand stores for UI/filter/transaction state
- `src/hooks/` — Custom React hooks for data loading and aggregation
- `src/utils/` — Pure utility functions (rule evaluation, aggregation, date/currency formatting)
- `src/components/` — React components organized by feature (layout, ui, transactions, import, categories, dashboard, charts, settings)
- `src/pages/` — Route-level page components (thin wrappers composing feature components)

## Data Model
- **Account** — Bank account or credit card (name, type, institution, currency)
- **Transaction** — Single financial entry (date, amount [+income/-expense], description, categoryId, hash for dedup)
- **Category** — Hierarchical (parentId for subcategories), with color and icon
- **Rule** — Categorization rule with AND conditions (field + operator + value), priority ordering, first-match-wins
- **ImportProfile** — Saved column mapping config per bank/format

## Categorization Engine
- Located in `src/services/categorizationEngine.ts` and `src/utils/ruleEvaluator.ts`
- Pure functions, no side effects, independently testable
- Rules evaluated in priority order (lower number = higher priority), first match wins
- Conditions within a rule use AND logic
- `isManualCategory` flag on transactions prevents auto-overwrite of user assignments
- `normalizedDescription` (lowercase, trimmed) computed once at import, used for all rule matching

## Commands
- `npm run dev` — Start dev server (Vite)
- `npm run build` — Production build
- `npm run preview` — Preview production build
- `npm run test` — Run tests (Vitest)
- `npm run lint` — Lint (ESLint)

## Conventions
- Path alias: `@/` maps to `src/`
- Pages are thin route-level components that compose feature components
- All dates stored as ISO 8601 strings
- Amounts: positive = income, negative = expense
- Colors: hex strings (e.g., `#4CAF50`)
- IDs: auto-incremented numbers (Dexie `++id`)
