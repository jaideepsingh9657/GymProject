# Luxury Fitness Gym — Product Requirements Document (v0.1 DRAFT)

Status: awaiting owner approval. No code is written until this is approved.

## 1. Vision
A premium digital ecosystem for one existing gym (Chhatrapati Sambhajinagar, MH) that acquires members, runs daily operations, and retains members — architected so more branches can be added later.

## 2. Goals → measurable outcomes
| Business objective | Product answer | Success metric |
|---|---|---|
| Premium brand + visibility | Website, local SEO, structured data | Top-3 local pack for "gym near me" queries; Lighthouse ≥ 90 |
| New memberships | Trial booking, WhatsApp CTAs, enquiry CRM | Enquiry → member conversion tracked |
| Digitize operations | Admin dashboard | Zero paper registers after 60 days |
| Attendance / renewals | QR check-in, expiry reminders | Renewal rate, no-show tracking |
| Payments | Razorpay + manual cash/UPI ledger | 100% payments reconciled |
| Retention | Member app, workouts, progress | 90-day retention |
| Multi-branch ready | `branch_id` on all tenant data | Second branch onboarded with no schema change |

## 3. Roles
- **Owner** — everything, financial reports, settings, permissions.
- **Admin/Receptionist** — members, memberships, attendance, enquiries, payments (no financial reports/settings).
- **Trainer** — only assigned members; workouts, diet, progress.
- **Member** — own data only.
Enforced server-side (RBAC guards + row-level scoping by branch/assignment).

## 4. Feature breakdown (priority: P0 launch, P1 soon after, P2 later)
### Website (Phase 1)
P0: Home, About, Facilities, Membership (admin-managed pricing), Trainers, Gallery, Contact; enquiry + free-trial forms; WhatsApp CTA; Google Maps/hours/review link; SEO (metadata, sitemap, robots, JSON-LD `HealthClub`).
P1: Instagram gallery via official API/oEmbed with admin-managed fallback gallery.
### Admin (Phases 2–3)
P0: dashboard KPIs, members CRUD, plans, subscriptions (assign/renew/extend/freeze/cancel), payments (cash/UPI/card/online, partial, receipts, refunds), attendance (QR + manual + check-out), enquiries/trials pipeline, RBAC, audit log.
P1: trainers, workouts, diet, reports, notifications, announcements, settings.
P2: multi-branch UI, advanced analytics.
### Mobile (Phase 4)
P0: OTP login, home, membership + QR card, attendance history, renewal via Razorpay.
P1: workouts, progress (weight/measurements/photos/charts), trainer view, notifications.
### Trainer (Phase 5)
Assigned members, workout/diet builders, schedules, session completion, progress updates. Delivered inside admin dashboard (role-gated) and member app (trainer mode).

## 5. Critical workflows & rules
1. New member: Enquiry → Trial → Registration → Plan → Payment → Activation → Confirmation.
2. Renewal: Reminder → Renewal → Payment → Extension (starts at current expiry if still active) → Confirmation.
3. Attendance: QR → verify member → active subscription check → reject duplicate (same day window) → record.
4. Trainer: Assign → create workout → assign → track.
5. Payment: Initiate → **server-side Razorpay signature verification + webhook** → transaction record → receipt → activate/extend, all in one DB transaction. Idempotency keys prevent duplicates. Frontend success is never trusted.

## 6. Non-functional
Security (JWT access+refresh rotation, OTP hashing/expiry/attempt limits, rate limiting, validation, audit log, signed uploads, secrets in env), performance (LCP < 2.5s), accessibility (WCAG 2.1 AA), backups (daily PG dump + PITR), data privacy (India DPDP Act 2023: consent, minimization, deletion on request). No card data stored.

## 7. Out of scope (v1)
Multi-branch UI, POS/retail, biometric hardware, class booking, wearables, in-app chat.

## 8. Risks
- Real photos/branding unavailable → clearly labelled placeholders.
- Instagram API requires Business/Creator account + app review; may force fallback gallery.
- WhatsApp Business API costs/approval; v1 uses click-to-chat (`wa.me`) links only.
- OTP SMS in India requires DLT registration (lead time weeks).
- Apple Developer (₹8,000/yr) and Play ($25) accounts needed.
- Scope is very large for one person: strict phase gating.

## 9. Open questions for the owner
1. Official Instagram URL, Google Business Profile link, exact address, phone, WhatsApp number, hours.
2. Real photos/videos and logo? Any existing brand colours?
3. Actual facilities, trainer list + qualifications, plan names/prices.
4. Payment mix: how much is cash/UPI vs online? Razorpay account owner/KYC status?
5. GST applicable on memberships? Receipt/invoice format needed?
6. Hosting preference/budget (e.g. single VPS vs managed cloud)? Domain owned?
7. OTP vs email-only login for members; SMS provider preference (MSG91, etc.)?
8. Existing member data to import (Excel)?
9. Hindi/Marathi language support needed?
10. Is the "personal project" intended to become a commercial product (affects multi-tenancy rigor)?
