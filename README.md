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

## Deployment
Docker-based deployment will be added in Phase 6.
