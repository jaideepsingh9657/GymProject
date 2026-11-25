# PROJECT STATUS

Last updated: 2026-11-25

## Completed
- Phase 0: PRD, architecture, database, API docs, admin design (`docs/`).
- Phase 1 website (`apps/website`): all pages, motion system, dark/light theme, stock photos. Content is placeholder.
- Phase 2 backend (`backend/api`): NestJS + Prisma + PostgreSQL. Auth (staff password, phone OTP, rotating refresh tokens with reuse detection), RBAC, audit log, rate limiting, validation, request logging. Verified by 30 integration tests against a real database plus 24 unit tests.
- Backend business modules: plans, members, subscriptions (sell/renew/freeze/cancel), payments (offline: ledger, outstanding, receipts), attendance (manual check-in/out, day list, 30-day report), dashboard.
- Phase 3 admin (`apps/admin-dashboard`): httpOnly-cookie sessions via same-origin proxy. Screens: Today, Members, Memberships (plans), Payments (with printable receipts), Attendance, Enquiries (lead pipeline, trials, convert to member), Reports (owner-only: revenue, sales, renewals, growth, dues, CSV export).

## In progress
- Nothing active. Next candidates: Trainers, Settings, then the workout/diet modules.

## Pending
- Admin: Trainers, Settings screens.
- Backend: QR check-in, Razorpay online payments + webhook, refunds, workouts, diets, progress, notifications, file uploads.
- Phase 4 mobile apps (iOS SwiftUI, Android Flutter), Phase 5 trainer features, Phase 6 production hardening and deployment.

## Known issues / blockers
- Admin tested manually in a browser only; no automated UI tests. Receipt print output not verified.
- No production SMS provider: OTP uses a dev console sender and the API refuses to boot in production until a real `SmsSender` exists.
- Website enquiry/trial forms save to the API (`POST /v1/public/enquiries`, rate-limited, honeypot, de-duplicated). Set `NEXT_PUBLIC_API_URL` and add the site origin to the API `CORS_ORIGINS`. WhatsApp is only a fallback. No notification to staff on a new lead yet.
- Real business data not yet provided (Instagram, address, phone, WhatsApp, hours, photos, prices, trainers). All site content is placeholder, centralised in `apps/website/src/content/site.ts`.
- Dev database is `embedded-postgres` (dev/test only). Production needs a managed PostgreSQL.

## Technical decisions
Modular monolith NestJS; PostgreSQL + Prisma; JWT access + rotating refresh; money in paise; branch scoping on all tenant data; idempotency keys on sales and payments; DB constraints for overlapping memberships and append-only audit log; admin tokens in httpOnly cookies behind a proxy (never in page JavaScript).

## Next steps
1. Owner supplies real business data (`docs/PRD.md` section 9).
2. Choose next admin screen.
3. Decide SMS provider (DLT registration takes weeks) and Razorpay account.
