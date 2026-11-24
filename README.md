# Luxury Fitness Gym

Monorepo: website, admin dashboard, iOS/Android apps, NestJS API. See `docs/` and `PROJECT_STATUS.md`.

## Layout
`apps/website` · `apps/admin-dashboard` · `apps/ios` · `apps/android` · `backend/api` · `packages/{api-contracts,shared-types}`

## Website (apps/website)
```bash
cd apps/website
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```
Set `NEXT_PUBLIC_SITE_URL` for canonical URLs/sitemap. Business details live in `src/content/site.ts` (currently placeholders).

## Run everything locally (no Docker, no system Postgres)
Four terminals, in this order:

```bash
# 1. Database (project-local PostgreSQL, data in backend/api/.pgdata)
cd backend/api && npm install && npm run db:dev
```
```bash
# 2. API, first time only: create .env, migrate, seed
cd backend/api
cp .env.example .env   # set DATABASE_URL port to 5433 and two secrets: openssl rand -base64 48
npx prisma migrate deploy
SEED_OWNER_EMAIL=owner@lfg.local SEED_OWNER_PASSWORD='choose-12+chars' npm run seed
npm run seed:sample    # optional, dev only: sample plans and 5 sample members
npm run dev            # http://localhost:4000/v1/health, API docs at /docs
```
```bash
# 3. Admin dashboard
cd apps/admin-dashboard && npm install && npm run dev   # http://localhost:3001, sign in with the seed owner account
```
```bash
# 4. Website
cd apps/website && npm install && npm run dev           # http://localhost:3000
```

Tests: `cd backend/api && npm test` (unit) and `npm run test:e2e` (needs the database from step 1).
Re-run `npm run seed` after pulling changes that add permissions (it is idempotent).
Production uses a managed PostgreSQL and `docker-compose.yml`/`Dockerfile`; the embedded database is dev and test only.

## Deployment
Docker-based deployment will be added in Phase 6.
