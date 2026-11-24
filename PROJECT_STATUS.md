# PROJECT STATUS

Last updated: 2026-11-24

## Completed
- Monorepo scaffold; draft PRD, ARCHITECTURE, DATABASE, API docs (approved by owner to proceed).

## In progress
- Phase 1: website (homepage first) in `apps/website`.

## Pending
Phases 2–6 (backend, admin, mobile, trainer/advanced, testing/production).

## Known issues / blockers
- Real business data not yet provided (Instagram URL, address, phone, WhatsApp, hours, photos, prices, trainers). All such content in the site is **placeholder** and centralised in `apps/website/src/content/site.ts`, flagged `PLACEHOLDER`.
- No real photography: temporary neutral panels are used and labelled.

## Technical decisions
Modular monolith NestJS; PostgreSQL + Prisma; JWT + rotating refresh; server-side Razorpay verification; paise for money; OpenAPI contract. Website: Next.js App Router + TypeScript + Tailwind, design tokens in CSS variables.

## Next steps
1. Owner supplies real business data (see docs/PRD.md §9).
2. Finish remaining website pages.
3. Begin Phase 2 backend foundation.
