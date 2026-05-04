# Demo CRM

A fully functional demo CRM built with **Next.js 14**, **Prisma**, **PostgreSQL**, **Tailwind CSS**, and **Recharts**. It ships with seeded mock data for a fictional sales team and is ready to deploy to Railway in a few clicks.

## Features

- **Dashboard** — pipeline value, customer counts, recent contacts and deals
- **Contacts** — full CRUD with search, status filter, and company linking
- **Companies** — full CRUD with industry filter, deal counts, contact counts
- **Analytics** — pipeline-by-stage bar chart, contact status pie, monthly contact growth, revenue-by-industry chart, top accounts table
- **PostgreSQL** persistence via Prisma ORM
- **Mock data seeder** — 12 companies, 60 contacts, 80 deals

## Tech Stack

| Layer       | Choice                                  |
| ----------- | --------------------------------------- |
| Framework   | Next.js 14 (App Router, Server Comp.)   |
| Database    | PostgreSQL                              |
| ORM         | Prisma 5                                |
| Styling     | Tailwind CSS                            |
| Charts      | Recharts                                |
| Hosting     | Railway (auto-detected via Nixpacks)    |

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure your database

Copy the env template and point `DATABASE_URL` at a Postgres instance.

```bash
cp .env.example .env
```

The fastest local Postgres is Docker:

```bash
docker run --name demo-crm-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
```

Then in `.env`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
```

### 3. Push schema and seed mock data

```bash
npm run db:push
npm run db:seed
```

### 4. Start the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Deploying to GitHub + Railway

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial CRM app"
git branch -M main
git remote add origin https://github.com/<your-username>/demo-crm.git
git push -u origin main
```

### Step 2 — Create the Railway project

1. Go to [railway.app](https://railway.app) and click **New Project → Deploy from GitHub repo**.
2. Select your `demo-crm` repository. Railway will auto-detect Next.js and start building.
3. From the project canvas, click **+ New → Database → Add PostgreSQL**. Railway will provision Postgres and inject `DATABASE_URL` automatically into the web service.
4. (Optional) Open the web service → **Variables** tab and confirm `DATABASE_URL` is referenced (e.g. `${{Postgres.DATABASE_URL}}`).
5. Trigger a redeploy. The included `railway.json` runs `prisma db push` on every start, so the schema is created automatically.

### Step 3 — Seed mock data on Railway

After the first successful deploy, run the seed script using the Railway CLI:

```bash
npm i -g @railway/cli
railway login
railway link              # select your project
railway run npm run db:seed
```

This connects to your Railway Postgres using the project env vars and populates 12 companies, 60 contacts, and 80 deals.

### Step 4 — Add a public domain

In the Railway service → **Settings** → **Networking** → **Generate Domain**. Your CRM is now live on the internet.

## Project Structure

```
prisma/
  schema.prisma          # Company, Contact, Deal models
  seed.ts                # Mock data generator
src/
  app/
    page.tsx             # Dashboard
    contacts/            # Contacts page + CRUD modal
    companies/           # Companies page + CRUD modal
    analytics/           # Charts + KPIs
    api/
      contacts/          # GET, POST, PATCH, DELETE
      companies/         # GET, POST, PATCH, DELETE
  components/            # Sidebar, Modal, StatCard, PageHeader
  lib/
    prisma.ts            # Singleton Prisma client
    format.ts            # Currency / date / status helpers
railway.json             # Railway deploy config
```

## Useful Commands

| Command              | What it does                                   |
| -------------------- | ---------------------------------------------- |
| `npm run dev`        | Start Next.js in dev mode                      |
| `npm run build`      | Generate Prisma client + build for production  |
| `npm run start`      | Start the production server                    |
| `npm run db:push`    | Sync `schema.prisma` to the database           |
| `npm run db:seed`    | Insert mock companies, contacts, and deals     |
| `npm run db:reset`   | Wipe and re-create the database (dev only)     |

## Notes

- This is a demo without authentication. Before exposing to real users, gate the routes (e.g. with [NextAuth](https://next-auth.js.org/)) or restrict access at the network layer.
- Prisma Decimal fields are serialized to plain numbers at the page boundary, so `Decimal` objects don't leak into client components.
- The seed script is idempotent — running it again wipes all data first, then re-inserts a fresh dataset.

### Windows + Node 24 install note

If `npm install` fails with a Prisma `preinstall-entry.js` "Cannot find module" error (a known interaction between Node 24, npm scripts, and the OneDrive folder layout), run:

```bash
npm install --ignore-scripts
node ./node_modules/prisma/build/index.js generate
```

Then use the direct binary paths during local dev:

```bash
node ./node_modules/prisma/build/index.js db push
node ./node_modules/.bin/tsx prisma/seed.ts
node ./node_modules/next/dist/bin/next dev
```

Linux containers (including Railway) are unaffected — the standard `npm` scripts work there.
