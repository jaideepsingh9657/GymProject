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

## Backend (backend/api)
```bash
docker compose up -d db            # PostgreSQL (needs Docker), or point DATABASE_URL at any Postgres 16
cd backend/api
cp .env.example .env               # then set the two secrets: openssl rand -base64 48
npm install
npx prisma migrate deploy
SEED_OWNER_EMAIL=you@example.com SEED_OWNER_PASSWORD='at-least-12-chars' npm run seed
npm run dev                        # http://localhost:4000/v1/health, docs at /docs
npm test
```

## Deployment
Docker-based deployment will be added in Phase 6.
