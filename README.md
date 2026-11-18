<div align="center">

<img src="client/public/favicon.png" alt="LifeLedger logo" width="96" height="96" />

# LifeLedger

**A premium, PIN-protected personal finance tracker — expenses, income, budgets, analytics and PDF reports in one clean, responsive app.**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![npm](https://img.shields.io/badge/npm-CB3837?logo=npm&logoColor=white)](https://www.npmjs.com/)

[Features](#-features) • [Screenshots](#-screenshots) • [Tech Stack](#-tech-stack) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [API](#-api-reference) • [Deployment](#-deployment) • [Roadmap](#-roadmap)

</div>

---

## 📖 Overview

**LifeLedger** is a full-stack personal finance application that helps you record every transaction, set monthly budgets, understand your spending through rich analytics, and export professional PDF reports — all behind secure authentication and an optional PIN lock.

It is split into two folders: a React + Vite **client** and an Express 5 REST **server** backed by PostgreSQL through Drizzle ORM.

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
- An amber **Near limit** warning at 90% of a budget, and a **daily allowance** on each card ("You can spend X per day for the rest of the month")
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
- **Duplicate-safe re-imports** — rows that match an existing transaction (same date, amount and category) are skipped by default, with a one-click *Include / Skip duplicates* toggle and a "duplicates skipped" count in the result
- Covered by unit tests

### 📄 PDF Reports

- Generate polished PDF reports with **jsPDF** + **jspdf-autotable**
- Choose a period: **day, week, month, year or all time** (visual calendar picker; weeks start on Saturday)
- Includes a balance overview, full transaction table and budget summary
- One-click download (`lifeledger_<period>_<date>.pdf`)

### 🔐 Security & Privacy

- **Email + password authentication** with bcrypt hashing (cost factor 12) and **JWT** sessions (30-day expiry) kept in an **httpOnly cookie** — never in `localStorage`, so injected scripts cannot read or steal it
- Optional **4- or 6-digit PIN lock**, **enforced by the server**: a logged-in session alone cannot read transactions, budgets or categories until the PIN is verified
- **CSRF protection** — requests that change data must come from the app's own origin
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

## 🛠 Tech Stack

| Layer            | Technologies                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Frontend**     | React 19, TypeScript, Vite 7, Tailwind CSS 4, wouter (routing), TanStack Query, Axios, Framer Motion, Recharts, date-fns, react-hook-form, Radix UI / shadcn/ui, Sonner, lucide-react |
| **Reports**      | jsPDF, jspdf-autotable                                                                                                                                                         |
| **Backend**      | Node.js 24, Express 5, JSON Web Tokens (httpOnly cookies), bcryptjs, CORS, pino / pino-http (structured logging)                                                                   |
| **Database**     | PostgreSQL 16, Drizzle ORM, drizzle-kit, drizzle-zod                                                                                                                           |
| **Validation**   | Zod                                                                                                                                                                            |
| **Tooling**      | npm, esbuild, tsx, Node test runner                                                                                                                                |
| **Hosting**      | Vercel (client), Render (server)                                                                                                                             |

---

## 🏗 Architecture

```
life-ledger/
├── client/                    # React + Vite front end
│   ├── public/
│   └── src/
│       ├── pages/             # landing, login, register, dashboard, transactions,
│       │                      # analytics, budgets, settings
│       ├── components/
│       │   ├── ui/            # shadcn/ui primitives
│       │   ├── layout/        # app shell, sidebar, mobile nav
│       │   ├── charts/        # income / spending trend charts
│       │   ├── modals/        # transaction, CSV import, PDF report, confirm
│       │   ├── pickers/       # date and month pickers
│       │   ├── pin/           # PIN entry and unlock screen
│       │   └── categories/    # category manager
│       ├── contexts/          # auth, data, theme, pin-lock providers
│       ├── hooks/
│       ├── lib/               # API helper, CSV import engine, month comparison, utils
│       └── types/
└── server/                    # Express 5 REST API
    ├── drizzle.config.ts
    └── src/
        ├── config/            # environment loading and validation
        ├── db/                # Drizzle client + schema
        ├── middleware/        # JWT auth guard
        ├── routes/            # auth, transactions, budgets, categories, prefs, pin, data, health
        ├── utils/             # JWT helpers, logger, default categories
        ├── validators/        # Zod request/response schemas
        ├── app.ts             # Express app setup
        └── server.ts          # entry point
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

- **Node.js** 22+
- **PostgreSQL** 14+ (local or hosted, e.g. Neon, Supabase, Render)

### 1. Clone the repository

```bash
git clone https://github.com/SarfarazAkram17/Life-Ledger.git
cd Life-Ledger
```

### 2. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 3. Configure environment variables

Copy the example files and fill them in (the real `.env` files are git-ignored).

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

**`server/.env`**

```env
PORT=8080
NODE_ENV=development
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/lifeledger
JWT_SECRET=replace-with-a-long-random-string
# Full URL of the client (used for CORS and the CSRF origin check)
CLIENT_URL=http://localhost:5173
# Optional: lax | strict | none. Defaults to lax in development and none in production
# (needed when the client and API are on different sites). See Deployment.
# COOKIE_SAME_SITE=lax
```

**`client/.env`**

```env
# Base URL of the API (include /api)
VITE_API_URL=http://localhost:8080/api
```

> ⚠️ Always set a strong, unique `JWT_SECRET` in production (the server refuses to start without one). Generate one with:
> `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### 4. Create the database tables

```bash
cd server
npm run db:push
```

### 5. Run the app

Open two terminals:

```bash
# Terminal 1 — API server (http://localhost:8080)
cd server && npm run dev

# Terminal 2 — Client (http://localhost:5173)
cd client && npm run dev
```

Visit **http://localhost:5173**, create an account, and start tracking.

---

## 📜 Available Scripts

| Folder    | Command                | Description                                    |
| --------- | ---------------------- | ---------------------------------------------- |
| `client/` | `npm run dev`          | Start the Vite dev server                      |
|           | `npm run build`        | Production build to `dist/`                    |
|           | `npm run preview`      | Preview the production build                   |
|           | `npm run typecheck`    | Type-check the client                          |
|           | `npm test`             | Unit tests (CSV import, month comparison, budget pace) |
| `server/` | `npm run dev`          | Start the API with auto-reload                 |
|           | `npm run build`        | Bundle with esbuild into `dist/`               |
|           | `npm start`            | Run the built server                           |
|           | `npm run typecheck`    | Type-check the server                          |
|           | `npm run db:push`      | Push the Drizzle schema to the database        |

---

## 🔌 API Reference

All routes are prefixed with `/api`. The login session is an httpOnly cookie, so browser requests must send credentials (`withCredentials: true`). Everything except `register`, `login`, `logout` and `healthz` requires a session. `transactions`, `budgets`, `categories` and `data` additionally require the PIN to be verified when the account has one; otherwise they answer `423` with `code: "PIN_REQUIRED"`.

| Resource         | Method   | Endpoint             | Description                                          |
| ---------------- | -------- | -------------------- | ---------------------------------------------------- |
| **Health**       | `GET`    | `/healthz`           | Service health check                                 |
| **Auth**         | `POST`   | `/auth/register`     | Create an account (seeds default categories & prefs) |
|                  | `POST`   | `/auth/login`        | Log in (sets the session cookie)                     |
|                  | `POST`   | `/auth/logout`       | Clear the session cookie                             |
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
|                  | `POST`   | `/pin/verify`        | Verify a PIN and unlock data (rate-limited)          |
|                  | `POST`   | `/pin/lock`          | Lock again (clears the unlock cookie)                |
|                  | `DELETE` | `/pin`               | Remove the PIN                                       |
|                  | `POST`   | `/pin/recover`       | Remove the PIN using the account password            |
| **Data**         | `DELETE` | `/data`              | Delete all transactions and budgets                  |

---

## ☁️ Deployment

The app is set up for a split deployment:

- **Client → Vercel** — set the root directory to `client/`. Set `VITE_API_URL` to your hosted API (e.g. `https://your-api.onrender.com/api`). `client/vercel.json` falls back to `index.html` for client-side routing.
- **Server → Render** — set the root directory to `server/`, build with `npm install && npm run build`, start with `npm start`, and set `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL` (your Vercel URL) and `PORT`.
- **Cookies across sites** — if the client and API are on different sites (for example `*.vercel.app` and `*.onrender.com`), the session cookie is a third-party cookie. It works with `SameSite=None; Secure` (the production default), but **Safari and some privacy settings block third-party cookies**, which breaks login. The reliable fix is to make the API same-site: use a custom domain for both (`app.example.com` and `api.example.com`) or proxy `/api` through the client's domain, and then set `COOKIE_SAME_SITE=lax`.

---

## 🔒 Security Notes

- Passwords and PINs are hashed with **bcrypt** (cost 12) — never stored in plain text.
- The session JWT lives only in an **httpOnly, Secure cookie** and expires after 30 days; always provide your own `JWT_SECRET` in production.
- The PIN is **verified and enforced on the server**: after `/pin/verify` the server issues a separate short-lived (30 minutes, renewed while you use the app) httpOnly unlock cookie, and data routes refuse to answer without it. The app also locks it immediately when you leave the tab.
- State-changing requests are rejected unless their `Origin` matches `CLIENT_URL` (CSRF protection), and API responses are sent with `Cache-Control: no-store`.
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