# PROJECT STATUS

Last updated: 2026-11-24

## Completed
- Monorepo scaffold; draft PRD, ARCHITECTURE, DATABASE, API docs (approved by owner to proceed).

## In progress
- Phase 1: website (homepage first) in `apps/website`.

## Pending
Phases 2–6 (backend, admin, mobile, trainer/advanced, testing/production).

## Completed (continued)
- Backend business modules: plans, members, subscriptions (sell/renew/freeze/cancel), payments (offline), attendance (manual check-in), dashboard. Admin app: httpOnly-cookie sessions via same-origin proxy, Today, Members with add/sell/renew/pay/freeze/cancel/check-in.

## Known issues / blockers
- Not built yet: enquiries, trainers, reports, settings, QR check-in, Razorpay online payments, refunds, mobile apps.
- Admin tested manually in one browser at desktop width only; no automated UI tests.
- No production SMS provider: OTP uses a dev console sender and the API refuses to boot in production until a real SmsSender exists.
- Real business data not yet provided (Instagram URL, address, phone, WhatsApp, hours, photos, prices, trainers). All such content in the site is **placeholder** and centralised in `apps/website/src/content/site.ts`, flagged `PLACEHOLDER`.
- No real photography: temporary neutral panels are used and labelled.

## Technical decisions
Modular monolith NestJS; PostgreSQL + Prisma; JWT + rotating refresh; server-side Razorpay verification; paise for money; OpenAPI contract. Website: Next.js App Router + TypeScript + Tailwind, design tokens in CSS variables.

## Next steps
1. Owner supplies real business data (see docs/PRD.md §9).
2. Finish remaining website pages.
3. Begin Phase 2 backend foundation.
