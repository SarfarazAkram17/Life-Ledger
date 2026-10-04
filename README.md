<div align="center">

<img src="artifacts/life-ledger/public/favicon.png" alt="LifeLedger logo" width="96" height="96" />

# LifeLedger

**A premium, PIN-protected personal finance tracker — expenses, income, budgets, analytics and PDF reports in one clean, responsive app.**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)

[Features](#-features) • [Screenshots](#-screenshots) • [Tech Stack](#-tech-stack) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [API](#-api-reference) • [Deployment](#-deployment) • [Roadmap](#-roadmap)

</div>

---

## 📖 Overview

**LifeLedger** is a full-stack personal finance application that helps you record every transaction, set monthly budgets, understand your spending through rich analytics, and export professional PDF reports — all behind secure authentication and an optional PIN lock.

It is built as a **pnpm monorepo** with a React + Vite front end, an Express 5 REST API, a PostgreSQL database managed with Drizzle ORM, and an **OpenAPI-first** contract that generates type-safe clients and validators.

---

## ✨ Features

### 💸 Transaction Management

- Add, edit, **duplicate** and delete income and expense transactions
- Per-transaction category, date, amount and note
- Powerful filtering: by **type**, **category**, **month**, **year** and free-text **search**
- Live totals and a **category breakdown** of whatever is currently filtered
- Custom date picker and month picker components

### 📊 Dashboard

- At-a-glance **Total Balance**, **Income** and **Expense** cards
- **Month-over-month comparison** — pick any two months and see income and spending change with percentage up/down indicators
- Recent transactions with quick edit, duplicate and delete actions
- Personalised greeting using your display name and avatar

### 📈 Analytics

- Daily income vs. expense chart for the selected month
- **Top earning sources** and **top spending categories** with clickable drill-down to the underlying transactions
- **Yearly trends** — pick any income source or spending category and see its month-by-month trend for a given year
- Fully accessible charts with descriptive `aria-label`s

### 🎯 Budgets

- Set a **monthly budget per category**
- Visual progress bars with status labels (e.g. _Over budget_) and an overall monthly overview with % used
- **Copy previous month's budgets** in one click
- Navigate between months to review past and plan future budgets

### 🗂️ Custom Categories

- Ships with **16 expense** and **13 income** default categories (🍔 Food & Dining, 🚌 Transport, 💰 Salary, 💼 Freelance, 📊 Dividends, and more)
- Create your own categories with an emoji icon picker
- Rename and **archive / restore** categories without losing historical data
- Case-insensitive unique names enforced per user and type at the database level

### 📥 Smart CSV Import

- Import **transactions** and **budgets** from CSV files
- Robust CSV parser with automatic **header detection**
- **Column-mapping** UI with intelligent auto-guessing
- Map unknown source categories to your own categories
- **Preview step** with per-row validation — invalid rows are blocked with clear error messages
- **Possible duplicate detection** against your existing data
- Covered by unit tests

### 📄 PDF Reports

- Generate polished PDF reports with **jsPDF** + **jspdf-autotable**
- Choose a period: **day, week, month, year or all time** (visual calendar picker; weeks start on Saturday)
- Includes a balance overview, full transaction table and budget summary
- One-click download (`lifeledger_<period>_<date>.pdf`)

### 🔐 Security & Privacy

- **Email + password authentication** with bcrypt hashing (cost factor 12) and **JWT** sessions (30-day expiry)
- Optional **4- or 6-digit PIN lock** protecting the app per browser tab
- **Brute-force protection** — 5 wrong PINs trigger a 5-minute lockout
- **PIN recovery** using your account password
- PINs are stored **hashed** (bcrypt) server-side; migration helper for legacy local PINs
- All data is scoped to the authenticated user with cascading deletes
- Danger-zone **Clear All Data** action behind a confirmation modal

### 🎨 Personalisation

- **3 colour themes** — Emerald, Ocean and Violet
- **20 currencies** (USD, EUR, GBP, JPY, INR, BDT, AED, SGD and more) with searchable picker
- Custom avatar and editable display name
- Preferences persisted per-user in the database

### 📤 Data Portability

- **Export** your data to CSV at any time
- **Import** it back (or from another tool) via the CSV import wizard

### 📱 Responsive & Polished UI

- Fully responsive — desktop sidebar, mobile bottom navigation with a floating _Add transaction_ button
- Smooth animations powered by **Framer Motion**
- Accessible components built on **Radix UI / shadcn/ui**
- Toast notifications via **Sonner**

---

## 📸 Screenshots

> 💡 Add your screenshots to `docs/screenshots/` using the file names below and they will render automatically.

|               Landing Page               |                  Dashboard                   |
| :--------------------------------------: | :------------------------------------------: |
| ![Landing](docs/screenshots/landing.png) | ![Dashboard](docs/screenshots/dashboard.png) |

|                    Transactions                    |                  Analytics                   |
| :------------------------------------------------: | :------------------------------------------: |
| ![Transactions](docs/screenshots/transactions.png) | ![Analytics](docs/screenshots/analytics.png) |

|                 Budgets                  |             Settings & Themes              |
| :--------------------------------------: | :----------------------------------------: |
| ![Budgets](docs/screenshots/budgets.png) | ![Settings](docs/screenshots/settings.png) |

|                   CSV Import                   |                   PDF Report                   |
| :--------------------------------------------: | :--------------------------------------------: |
| ![CSV Import](docs/screenshots/csv-import.png) | ![PDF Report](docs/screenshots/pdf-report.png) |

|                  PIN Lock                  |              Mobile View               |
| :----------------------------------------: | :------------------------------------: |
| ![PIN Lock](docs/screenshots/pin-lock.png) | ![Mobile](docs/screenshots/mobile.png) |

---

## 🛠 Tech Stack

| Layer            | Technologies                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Frontend**     | React 19, TypeScript, Vite 7, Tailwind CSS 4, wouter (routing), TanStack Query, Framer Motion, Recharts, date-fns, react-hook-form, Radix UI / shadcn/ui, Sonner, lucide-react |
| **Reports**      | jsPDF, jspdf-autotable                                                                                                                                                         |
| **Backend**      | Node.js 24, Express 5, JSON Web Tokens, bcryptjs, cookie-parser, CORS, pino / pino-http (structured logging)                                                                   |
| **Database**     | PostgreSQL 16, Drizzle ORM, drizzle-kit, drizzle-zod                                                                                                                           |
| **API Contract** | OpenAPI 3 spec → [Orval](https://orval.dev/) → generated Zod schemas + React Query client                                                                                      |
| **Tooling**      | pnpm workspaces, esbuild, tsx, Node test runner                                                                                                                                |
| **Hosting**      | Vercel (frontend), Render (API), Replit-compatible                                                                                                                             |

---

## 🏗 Architecture

```
Life-Ledger/
├── artifacts/
│   ├── life-ledger/          # React + Vite front end
│   │   └── src/
│   │       ├── pages/        # landing, login, register, dashboard, transactions,
│   │       │                 # analytics, budgets, settings
│   │       ├── components/   # modals, charts, pickers, PIN screen, category manager
│   │       ├── contexts/     # auth, data, theme, pin-lock providers
│   │       └── lib/          # api client, CSV import engine, month comparison, utils
│   ├── api-server/           # Express 5 REST API
│   │   └── src/
│   │       ├── routes/       # auth, transactions, budgets, categories, prefs, pin, data, health
│   │       ├── middleware/   # JWT auth guard
│   │       └── lib/          # auth helpers, logger, default categories
│   └── mockup-sandbox/       # Vite sandbox for UI prototyping
├── lib/
│   ├── db/                   # Drizzle schema + database client
│   ├── api-spec/             # openapi.yaml + Orval config
│   ├── api-zod/              # Generated Zod validators & types
│   └── api-client-react/     # Generated React Query hooks + custom fetch
├── scripts/                  # Workspace utility scripts
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

### Database Schema

| Table             | Purpose                                                       |
| ----------------- | ------------------------------------------------------------- |
| `ll_users`        | Accounts (email, display name, bcrypt password hash)          |
| `ll_transactions` | Income / expense records (amount, category, date, note)       |
| `ll_budgets`      | Monthly per-category budget limits (`YYYY-MM`)                |
| `ll_categories`   | Per-user categories with icon, type and archive flag          |
| `ll_user_prefs`   | Theme, currency and avatar                                    |
| `ll_user_pins`    | Hashed PIN, PIN length, failed attempts and lockout timestamp |

All user-owned tables reference `ll_users` with `ON DELETE CASCADE`.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ (24 recommended)
- **pnpm** 9+ (`npm install -g pnpm`)
- **PostgreSQL** 14+ (local or hosted, e.g. Neon, Supabase, Render)

### 1. Clone the repository

```bash
git clone https://github.com/SarfarazAkram17/Life-Ledger.git
cd Life-Ledger
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

Create the following `.env` files (they are git-ignored).

**`lib/db/.env`**

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/lifeledger
```

**`artifacts/api-server/.env`**

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/lifeledger
JWT_SECRET=replace-with-a-long-random-string
PORT=8080
NODE_ENV=development
```

**`artifacts/life-ledger/.env`**

```env
PORT=5173
BASE_PATH=/
# Optional — only needed if the API is hosted on a different origin.
# In development, Vite proxies /api to http://localhost:8080
VITE_API_BASE_URL=
```

> ⚠️ Always set a strong, unique `JWT_SECRET` in production. Generate one with:
> `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### 4. Create the database tables

```bash
pnpm --filter @workspace/db push
```

### 5. Run the app

Open two terminals:

```bash
# Terminal 1 — API server (http://localhost:8080)
pnpm --filter @workspace/api-server dev

# Terminal 2 — Front end (http://localhost:5173)
pnpm --filter @workspace/life-ledger dev
```

Visit **http://localhost:5173**, create an account, and start tracking.

---

## 📜 Available Scripts

| Package                  | Command                                    | Description                                              |
| ------------------------ | ------------------------------------------ | -------------------------------------------------------- |
| `@workspace/life-ledger` | `pnpm --filter @workspace/life-ledger dev` | Start Vite dev server                                    |
|                          | `... build`                                | Production build to `dist/public`                        |
|                          | `... serve`                                | Preview the production build                             |
|                          | `... typecheck`                            | Type-check the front end                                 |
|                          | `... test`                                 | Run unit tests (CSV import & month comparison)           |
| `@workspace/api-server`  | `... dev`                                  | Build and start API in development                       |
|                          | `... build`                                | Bundle with esbuild                                      |
|                          | `... start`                                | Run the built server                                     |
|                          | `... typecheck`                            | Type-check the API                                       |
| `@workspace/db`          | `... push`                                 | Push Drizzle schema to the database                      |
| `@workspace/api-spec`    | `... codegen`                              | Regenerate Zod + React Query clients from `openapi.yaml` |

---

## 🔌 API Reference

All routes are prefixed with `/api`. Everything except `register`, `login` and `healthz` requires an `Authorization: Bearer <token>` header.

| Resource         | Method   | Endpoint             | Description                                          |
| ---------------- | -------- | -------------------- | ---------------------------------------------------- |
| **Health**       | `GET`    | `/healthz`           | Service health check                                 |
| **Auth**         | `POST`   | `/auth/register`     | Create an account (seeds default categories & prefs) |
|                  | `POST`   | `/auth/login`        | Log in and receive a JWT                             |
|                  | `GET`    | `/auth/me`           | Current user                                         |
|                  | `PUT`    | `/auth/display-name` | Update display name                                  |
| **Transactions** | `GET`    | `/transactions`      | List transactions                                    |
|                  | `POST`   | `/transactions`      | Create a transaction                                 |
|                  | `PUT`    | `/transactions/:id`  | Update a transaction                                 |
|                  | `DELETE` | `/transactions/:id`  | Delete a transaction                                 |
| **Budgets**      | `GET`    | `/budgets`           | List budgets                                         |
|                  | `POST`   | `/budgets`           | Create / set a budget                                |
|                  | `PUT`    | `/budgets/:id`       | Update a budget                                      |
|                  | `DELETE` | `/budgets/:id`       | Delete a budget                                      |
| **Categories**   | `GET`    | `/categories`        | List categories                                      |
|                  | `POST`   | `/categories`        | Create a category                                    |
|                  | `PATCH`  | `/categories/:id`    | Rename / archive / restore                           |
| **Preferences**  | `GET`    | `/prefs`             | Get theme, currency, avatar                          |
|                  | `PUT`    | `/prefs`             | Update preferences                                   |
| **PIN**          | `GET`    | `/pin`               | PIN status (enabled + length)                        |
|                  | `PUT`    | `/pin`               | Set or change the PIN                                |
|                  | `POST`   | `/pin/verify`        | Verify a PIN (rate-limited)                          |
|                  | `DELETE` | `/pin`               | Remove the PIN                                       |
|                  | `POST`   | `/pin/recover`       | Remove the PIN using the account password            |
| **Data**         | `DELETE` | `/data`              | Delete all transactions and budgets                  |

The full contract lives in [`lib/api-spec/openapi.yaml`](lib/api-spec/openapi.yaml).

---

## ☁️ Deployment

The repository is pre-configured for a split deployment:

- **Frontend → Vercel** — `artifacts/life-ledger/vercel.json` rewrites `/api/*` to your hosted API and falls back to `index.html` for client-side routing. Update the rewrite destination to your own API URL.
- **API → Render** — build with `pnpm --filter @workspace/api-server build`, start with `pnpm --filter @workspace/api-server start`, and set `DATABASE_URL`, `JWT_SECRET` and `PORT`.
- **Replit** — a `.replit` configuration (Node 24 + PostgreSQL 16) is included.

---

## 🔒 Security Notes

- Passwords and PINs are hashed with **bcrypt** (cost 12) — never stored in plain text.
- JWTs expire after 30 days; always provide your own `JWT_SECRET` in production.
- PIN verification is rate-limited with a temporary lockout to prevent brute-forcing.
- Never commit `.env` files — they are already listed in `.gitignore`.

---

## 👤 Author

**Sarfaraz Akram**

- GitHub: [@SarfarazAkram17](https://github.com/SarfarazAkram17)

---

<div align="center">

⭐ If you find LifeLedger useful, please consider giving it a star!

</div>