# API architecture (REST, `/v1`) — v0.1 DRAFT

OpenAPI is the source of truth (generated, published to `packages/api-contracts`). Standard envelope for errors: `{ code, message, details?, requestId }`. Pagination: `?page&limit`. All write endpoints validate with class-validator DTOs; rate limits per IP/user (stricter on `/auth/*`, `/public/*`).

| Module | Endpoints (representative) | Access |
|---|---|---|
| public | GET /public/plans, /public/trainers, /public/gallery, /public/settings; POST /public/enquiries, /public/trial-bookings | anonymous (rate-limited, captcha) |
| auth | POST /auth/staff/login, /auth/otp/request, /auth/otp/verify, /auth/refresh, /auth/logout | public |
| users / roles | CRUD /users, GET /roles, PUT /roles/:id/permissions | OWNER |
| members | CRUD /members, GET /members/:id/{subscriptions,payments,attendance}, GET /me | ADMIN+, member (self) |
| plans | CRUD /plans | OWNER (read: all) |
| subscriptions | POST /subscriptions, /:id/renew, /:id/extend, /:id/freeze, /:id/cancel | ADMIN+ |
| payments | POST /payments/orders, POST /payments/verify, POST /payments/cash, POST /payments/:id/refund, POST /webhooks/razorpay, GET /payments/:id/receipt | ADMIN+, member (own) |
| attendance | POST /attendance/check-in (QR or manual), /check-out; GET /attendance, /attendance/reports | ADMIN+, member (own) |
| enquiries | CRUD /enquiries, POST /:id/convert, /trial-bookings | ADMIN+ |
| trainers | CRUD /trainers, POST /trainers/:id/assignments | OWNER/ADMIN; trainer self |
| exercises / workouts | CRUD /exercises, /workout-plans, POST /workout-assignments, POST /workout-sessions | TRAINER+, member (own) |
| diets | CRUD /diet-plans, POST /diet-assignments | TRAINER+, member (own) |
| progress | GET/POST /members/:id/measurements, photo upload URLs | trainer (assigned), member (own) |
| notifications | GET /notifications, POST /announcements, POST /devices | ADMIN+, authenticated |
| reports | GET /reports/{revenue,sales,renewals,attendance,outstanding,growth} | OWNER (some ADMIN) |
| uploads | POST /uploads/sign | authenticated |
| audit | GET /audit-logs | OWNER |
| settings | GET/PUT /settings, /branches | OWNER |

Notes: QR payloads are short-lived signed tokens (not the raw member id). Webhook endpoint verifies `X-Razorpay-Signature` against raw body.
