import { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { localToday, iso } from "../src/common/dates";
import { ADMIN, OWNER, TRAINER, bootstrap, login } from "./helpers";

let app: INestApplication, db: PrismaClient, http: () => any;
let owner: string, admin: string, trainer: string;
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
const key = () => randomUUID();

beforeAll(async () => {
  ({ app, db, http } = await bootstrap());
  owner = await login(http, OWNER); admin = await login(http, ADMIN); trainer = await login(http, TRAINER);
});
afterAll(async () => { await app.close(); await db.$disconnect(); });

describe("auth & RBAC", () => {
  it("health is public", () => http().get("/v1/health").expect(200));
  it("rejects missing token and bad credentials", async () => {
    await http().get("/v1/members").expect(401);
    await http().post("/v1/auth/staff/login").send({ email: OWNER.email, password: "wrong-password-1" }).expect(401);
    await http().post("/v1/auth/staff/login").send({ email: "nobody@test.local", password: "wrong-password-1" }).expect(401);
  });
  it("enforces permissions on the server", async () => {
    await http().get("/v1/members").set(auth(trainer)).expect(403);
    await http().get("/v1/members").set(auth(admin)).expect(200);
    await http().post("/v1/plans").set(auth(admin)).send({ name: "X", durationDays: 30, pricePaise: 100 }).expect(403);
    await http().get("/v1/dashboard/today").set(auth(trainer)).expect(403);
  });
  it("validates input and strips nothing silently", async () => {
    const r = await http().post("/v1/plans").set(auth(owner)).send({ name: "", durationDays: 0, evil: true }).expect(400);
    expect(r.body.code).toBe("BAD_REQUEST");
  });
  it("detects refresh token reuse", async () => {
    const first = (await http().post("/v1/auth/staff/login").send(OWNER).expect(200)).body;
    const second = (await http().post("/v1/auth/refresh").send({ refreshToken: first.refreshToken }).expect(200)).body;
    await http().post("/v1/auth/refresh").send({ refreshToken: first.refreshToken }).expect(401);
    await http().post("/v1/auth/refresh").send({ refreshToken: second.refreshToken }).expect(401); // family revoked
  });
  it("suspended users lose access immediately", async () => {
    const u = await db.user.findUniqueOrThrow({ where: { email: TRAINER.email } });
    await db.user.update({ where: { id: u.id }, data: { status: "SUSPENDED" } });
    await http().get("/v1/auth/me").set(auth(trainer)).expect(401);
    await db.user.update({ where: { id: u.id }, data: { status: "ACTIVE" } });
  });
});

describe("membership lifecycle", () => {
  let planId: string, memberId: string, memberCode: string, subId: string, endDate: string, paymentId: string;

  it("creates plan and member", async () => {
    planId = (await http().post("/v1/plans").set(auth(owner)).send({ name: "Monthly", durationDays: 30, pricePaise: 300000 }).expect(201)).body.id;
    const m = (await http().post("/v1/members").set(auth(admin)).send({ name: "Test Member", phone: "9876543210" }).expect(201)).body;
    memberId = m.id; memberCode = m.memberCode;
    expect(memberCode).toBe("GYM-0001");
    await http().post("/v1/members").set(auth(admin)).send({ name: "Dup", phone: "+91 98765 43210" }).expect(409);
  });

  it("refuses check-in without a membership", async () => {
    await http().post("/v1/attendance/check-in").set(auth(admin)).send({ memberCode }).expect(403);
  });

  it("sells a membership with a part payment, idempotently", async () => {
    const k = key();
    const body = { memberId, planId, payment: { method: "CASH", amountPaise: 100000 } };
    const a = await http().post("/v1/subscriptions").set(auth(admin)).set("Idempotency-Key", k).send(body).expect(201);
    expect(a.body.status).toBe("ACTIVE");
    subId = a.body.id; endDate = a.body.endDate; paymentId = a.body.payments[0].id;
    expect(a.body.payments[0]).toMatchObject({ amountDuePaise: 300000, amountPaidPaise: 100000, status: "PARTIAL" });
    expect(a.body.payments[0].receiptNo).toMatch(/^LFG-\d{4}-\d{6}$/);

    const b = await http().post("/v1/subscriptions").set(auth(admin)).set("Idempotency-Key", k).send(body).expect(201);
    expect(b.body.id).toBe(subId);
    expect(b.body.replayed).toBe(true);
    expect(await db.memberSubscription.count({ where: { memberId } })).toBe(1);
    expect(await db.paymentTransaction.count()).toBe(1);
    await http().post("/v1/subscriptions").set(auth(admin)).send(body).expect(400); // key required
  });

  it("rejects overpayment and completes the balance with a receipt", async () => {
    await http().post("/v1/payments").set(auth(admin)).set("Idempotency-Key", key()).send({ paymentId, method: "UPI", amountPaise: 200001 }).expect(400);
    await http().post("/v1/payments").set(auth(admin)).set("Idempotency-Key", key()).send({ paymentId, method: "ONLINE", amountPaise: 100 }).expect(400);
    const k = key();
    const r = await http().post("/v1/payments").set(auth(admin)).set("Idempotency-Key", k).send({ paymentId, method: "UPI", amountPaise: 200000 }).expect(201);
    expect(r.body).toMatchObject({ amountPaidPaise: 300000, status: "PAID" });
    const again = await http().post("/v1/payments").set(auth(admin)).set("Idempotency-Key", k).send({ paymentId, method: "UPI", amountPaise: 200000 }).expect(201);
    expect(again.body.replayed).toBe(true);
    expect(await db.paymentTransaction.count({ where: { paymentId } })).toBe(2);
  });

  it("renewal while active starts the day after the current plan ends", async () => {
    const r = await http().post("/v1/subscriptions").set(auth(admin)).set("Idempotency-Key", key()).send({ memberId, planId }).expect(201);
    const expectedStart = new Date(new Date(endDate).getTime() + 86_400_000).toISOString().slice(0, 10);
    expect(r.body.startDate.slice(0, 10)).toBe(expectedStart);
    expect(r.body.status).toBe("PENDING");
    expect(r.body.parentSubscriptionId).toBe(subId);
    expect(r.body.payments[0].status).toBe("PENDING"); // unpaid shows up as dues
  });

  it("database blocks overlapping live memberships", async () => {
    // Via the API: a start date inside the current membership is a clean 409, not a 500.
    await http().post("/v1/subscriptions").set(auth(admin)).set("Idempotency-Key", key()).send({ memberId, planId, startDate: iso(localToday()) }).expect(409);
    // Directly in the DB: the constraint itself holds even if application code is bypassed.
    const live = await db.memberSubscription.findFirstOrThrow({ where: { id: subId } });
    await expect(db.memberSubscription.create({ data: { memberId, planId, startDate: live.startDate, endDate: live.endDate, status: "ACTIVE", pricePaiseSnapshot: 1 } })).rejects.toThrow(/no_overlapping_live_subscription/);
  });

  it("checks in once per day", async () => {
    const r = await http().post("/v1/attendance/check-in").set(auth(admin)).send({ memberCode }).expect(201);
    expect(r.body.member.name).toBe("Test Member");
    await http().post("/v1/attendance/check-in").set(auth(admin)).send({ memberCode }).expect(409);
    await http().post("/v1/attendance/check-in").set(auth(admin)).send({ memberCode: "GYM-9999" }).expect(404);
    await http().post(`/v1/attendance/${r.body.id}/check-out`).set(auth(admin)).expect(200);
  });

  it("attendance day list and report", async () => {
    await http().get("/v1/attendance").set(auth(trainer)).expect(403);
    const day = (await http().get("/v1/attendance").set(auth(admin)).expect(200)).body;
    expect(day.items).toHaveLength(1);
    expect(day.items[0].member.memberCode).toBe(memberCode);
    expect(day.items[0].checkOutAt).not.toBeNull(); // checked out in the previous test
    expect(day.insideNow).toBe(0);
    const other = (await http().get("/v1/attendance?date=2020-01-01").set(auth(admin)).expect(200)).body;
    expect(other.items).toHaveLength(0);
    await http().get("/v1/attendance?date=yesterday").set(auth(admin)).expect(400);
    const rep = (await http().get("/v1/attendance/report?days=7").set(auth(admin)).expect(200)).body;
    expect(rep).toMatchObject({ days: 7, totalVisits: 1, uniqueMembers: 1 });
    expect(rep.daily).toHaveLength(7);
    expect(rep.byHour).toHaveLength(24);
    expect(rep.byHour.reduce((a: number, h: any) => a + h.count, 0)).toBe(1);
    await http().get("/v1/attendance/report?days=1000").set(auth(admin)).expect(400);
  });

  it("freeze blocks entry; unfreeze keeps the days", async () => {
    await http().post(`/v1/subscriptions/${subId}/freeze`).set(auth(admin)).send({ days: 10 }).expect(200);
    await db.attendance.deleteMany({});
    await http().post("/v1/attendance/check-in").set(auth(admin)).send({ memberCode }).expect(403);
    const r = await http().post(`/v1/subscriptions/${subId}/unfreeze`).set(auth(admin)).expect(200);
    expect(r.body.status).toBe("ACTIVE");
  });

  it("members list and detail never leak the QR secret", async () => {
    const list = await http().get("/v1/members?filter=ACTIVE").set(auth(admin)).expect(200);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0]).toMatchObject({ memberCode, state: expect.stringMatching(/ACTIVE|EXPIRING/) });
    const d = await http().get(`/v1/members/${memberId}`).set(auth(admin)).expect(200);
    expect(JSON.stringify(d.body)).not.toContain("qrSecret");
    const dues = await http().get("/v1/members?filter=DUES").set(auth(admin)).expect(200);
    expect(dues.body.items[0].duesPaise).toBeGreaterThan(0);
  });

  it("dashboard reflects the activity", async () => {
    const d = (await http().get("/v1/dashboard/today").set(auth(admin)).expect(200)).body;
    expect(d.activeMembers).toBe(1);
    expect(d.revenueMonthPaise).toBe(300000);
    expect(d.pendingDuesPaise).toBeGreaterThanOrEqual(300000);
    expect(d.revenueByDay).toHaveLength(14);
  });

  it("payments ledger, summary and receipt detail", async () => {
    await http().get("/v1/payments").set(auth(trainer)).expect(403);
    const all = (await http().get("/v1/payments").set(auth(admin)).expect(200)).body;
    expect(all.total).toBe(2); // the first sale (paid in full) and the queued renewal; the rejected overlap created nothing
    expect(all.summary.collectedMonthPaise).toBe(300000);
    expect(all.summary.outstandingPaise).toBeGreaterThanOrEqual(300000);
    const due = (await http().get("/v1/payments?status=DUE").set(auth(admin)).expect(200)).body;
    expect(due.items.every((p: any) => p.amountPaidPaise < p.amountDuePaise)).toBe(true);
    const paid = (await http().get("/v1/payments?status=PAID").set(auth(admin)).expect(200)).body;
    expect(paid.total).toBe(1);
    const byName = (await http().get("/v1/payments?search=test%20member").set(auth(admin)).expect(200)).body;
    expect(byName.total).toBe(2);
    await http().get("/v1/payments?status=BOGUS").set(auth(admin)).expect(400);
    const detail = (await http().get(`/v1/payments/${paid.items[0].id}`).set(auth(admin)).expect(200)).body;
    expect(detail.receiptNo).toMatch(/^LFG-/);
    expect(detail.transactions).toHaveLength(2);
    expect(detail.member.memberCode).toBe("GYM-0001");
    await http().get("/v1/payments/not-a-uuid").set(auth(admin)).expect(400);
  });

  it("cancel works and audit log is complete and immutable", async () => {
    await http().post(`/v1/subscriptions/${subId}/cancel`).set(auth(admin)).send({ reason: "test" }).expect(200);
    const actions = (await db.auditLog.findMany({ select: { action: true } })).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(["member.create", "subscription.create", "payment.record", "subscription.cancel", "plan.create", "auth.staff_login_failed"]));
    await expect(db.auditLog.updateMany({ data: { action: "tampered" } })).rejects.toThrow(/append-only/);
    await expect(db.auditLog.deleteMany({})).rejects.toThrow(/append-only/);
  });
});

describe("enquiries", () => {
  const pub = { name: "Web Lead", phone: "90000 00001", kind: "TRIAL", goal: "Lose fat", preferredTime: "Evening", message: "Hi" };
  let id: string;

  it("public form saves a lead without logging in, and de-duplicates", async () => {
    await http().post("/v1/public/enquiries").send(pub).expect(202);
    await http().post("/v1/public/enquiries").send({ ...pub, name: "Web Lead Again" }).expect(202); // same number inside 24h
    expect(await db.enquiry.count({ where: { phone: "+919000000001" } })).toBe(1);
    const row = await db.enquiry.findFirstOrThrow({ where: { phone: "+919000000001" } });
    expect(row).toMatchObject({ source: "WEBSITE", isTrialRequest: true, goal: "Lose fat", status: "NEW" });
  });

  it("public form validates and ignores bots", async () => {
    await http().post("/v1/public/enquiries").send({ name: "X", phone: "123" }).expect(400);
    await http().post("/v1/public/enquiries").send({ ...pub, phone: "9000000002", extra: 1 }).expect(400); // unknown field
    await http().post("/v1/public/enquiries").send({ ...pub, phone: "9000000003", company: "spam inc" }).expect(202);
    expect(await db.enquiry.count({ where: { phone: "+919000000003" } })).toBe(0); // honeypot: accepted but not stored
  });

  it("staff list it with counts; trainers can't", async () => {
    await http().get("/v1/enquiries").set(auth(trainer)).expect(403);
    const r = (await http().get("/v1/enquiries").set(auth(admin)).expect(200)).body;
    expect(r.total).toBe(1); expect(r.counts.NEW).toBe(1); expect(r.summary.followUpsDue).toBe(1);
    id = r.items[0].id;
    const none = (await http().get("/v1/enquiries?search=nobody").set(auth(admin)).expect(200)).body;
    expect(none.total).toBe(0);
    await http().get("/v1/enquiries?status=BOGUS").set(auth(admin)).expect(400);
  });

  it("updates status, follow-up and notes; cannot mark converted directly", async () => {
    const r = (await http().patch(`/v1/enquiries/${id}`).set(auth(admin)).send({ status: "CONTACTED", notes: "Called, wants evening", followUpAt: new Date(Date.now() + 86_400_000 * 3).toISOString() }).expect(200)).body;
    expect(r).toMatchObject({ status: "CONTACTED", notes: "Called, wants evening" });
    await http().patch(`/v1/enquiries/${id}`).set(auth(admin)).send({ status: "CONVERTED" }).expect(400);
  });

  it("schedules a trial (not in the past) and updates it", async () => {
    await http().post(`/v1/enquiries/${id}/trial`).set(auth(admin)).send({ scheduledAt: "2020-01-01T10:00:00Z" }).expect(400);
    const r = (await http().post(`/v1/enquiries/${id}/trial`).set(auth(admin)).send({ scheduledAt: new Date(Date.now() + 86_400_000).toISOString() }).expect(201)).body;
    expect(r.status).toBe("TRIAL_BOOKED");
    expect(r.trials).toHaveLength(1);
    const t = (await http().patch(`/v1/enquiries/${id}/trials/${r.trials[0].id}`).set(auth(admin)).send({ status: "ATTENDED" }).expect(200)).body;
    expect(t.trials[0].status).toBe("ATTENDED");
  });

  it("converts to a member once; an existing phone is a clean conflict", async () => {
    const r = (await http().post(`/v1/enquiries/${id}/convert`).set(auth(admin)).send({}).expect(200)).body;
    expect(r.enquiry.status).toBe("CONVERTED");
    const m = await db.member.findUniqueOrThrow({ where: { id: r.memberId } });
    expect(m).toMatchObject({ name: "Web Lead", memberCode: "GYM-0002" });
    await http().post(`/v1/enquiries/${id}/convert`).set(auth(admin)).send({}).expect(409);
    await http().patch(`/v1/enquiries/${id}`).set(auth(admin)).send({ status: "LOST" }).expect(409);

    const dup = (await http().post("/v1/enquiries").set(auth(admin)).send({ name: "Already Member", phone: "9876543210", source: "WALKIN" }).expect(201)).body;
    await http().post(`/v1/enquiries/${dup.id}/convert`).set(auth(admin)).send({}).expect(409);
    const existing = await db.member.findFirstOrThrow({ where: { memberCode: "GYM-0001" } });
    const linked = (await http().post(`/v1/enquiries/${dup.id}/convert`).set(auth(admin)).send({ memberId: existing.id }).expect(200)).body;
    expect(linked.memberId).toBe(existing.id);
  });
});

describe("reports", () => {
  it("are owner-only", async () => {
    await http().get("/v1/reports/summary").set(auth(admin)).expect(403);
    await http().get("/v1/reports/summary").set(auth(trainer)).expect(403);
    await http().get("/v1/reports/export?type=sales").set(auth(admin)).expect(403);
  });

  it("summarises revenue, sales, members and dues from the lifecycle above", async () => {
    const r = (await http().get("/v1/reports/summary").set(auth(owner)).expect(200)).body;
    expect(r.days).toBe(30);
    expect(r.revenuePaise).toBe(300000);
    expect(r.revenueByMethod).toEqual([{ method: "UPI", paise: 200000 }, { method: "CASH", paise: 100000 }]);
    expect(r.revenueByDay).toHaveLength(30);
    expect(r.revenueByDay.reduce((a: number, d: any) => a + d.paise, 0)).toBe(300000);
    expect(r.sales).toEqual({ total: 2, new: 1, renewals: 1, cancelled: 1 });
    expect(r.salesByPlan).toEqual([{ plan: "Monthly", count: 2, revenuePaise: 600000 }]);
    expect(r.newMembers).toBe(2);
    expect(r.outstanding).toMatchObject({ totalPaise: 300000, members: 1 });
    expect(r.outstanding.top[0].member.memberCode).toBe("GYM-0001");
    expect(r.renewal).toEqual({ expiring: 0, renewed: 0, ratePercent: null });
    expect(r.memberGrowth).toHaveLength(12);
    expect(r.memberGrowth[11].joins).toBe(2);
  });

  it("honours a custom range and rejects bad ones", async () => {
    const past = (await http().get("/v1/reports/summary?from=2020-01-01&to=2020-01-31").set(auth(owner)).expect(200)).body;
    expect(past).toMatchObject({ days: 31, revenuePaise: 0, newMembers: 0 });
    expect(past.sales.total).toBe(0);
    await http().get("/v1/reports/summary?from=2026-02-01&to=2026-01-01").set(auth(owner)).expect(400);
    await http().get("/v1/reports/summary?from=2020-01-01&to=2022-01-01").set(auth(owner)).expect(400); // over a year
    await http().get("/v1/reports/summary?from=nope").set(auth(owner)).expect(400);
  });

  it("exports CSV and logs the export", async () => {
    const sales = await http().get("/v1/reports/export?type=sales").set(auth(owner)).expect(200);
    expect(sales.headers["content-type"]).toMatch(/text\/csv/);
    const lines = sales.text.trim().split("\r\n");
    expect(lines[0]).toBe("Sold on,Member code,Member,Plan,Type,Starts,Ends,Status,Price (INR),Paid (INR),Receipt");
    expect(lines).toHaveLength(3);
    expect(sales.text).toContain("Renewal");
    expect(sales.text).toContain("3000.00");
    const pay = await http().get("/v1/reports/export?type=payments").set(auth(owner)).expect(200);
    expect(pay.text.trim().split("\r\n")).toHaveLength(3);
    await http().get("/v1/reports/export?type=members").set(auth(owner)).expect(400);
    expect(await db.auditLog.count({ where: { action: "report.export" } })).toBe(2);
  });
});

describe("trainers", () => {
  const body = { name: "Coach Amit", email: "Amit@Test.Local", password: "trainer-pass-12345", qualifications: "NASM-CPT", specializations: ["Strength", "  Fat loss ", ""], experienceYears: 6, bio: "Coach bio", availability: "Mon-Sat 6am-12pm", isPublic: true };
  let tid: string, m1: string, m2: string;

  it("only the owner can create; validates input; emails are unique", async () => {
    await http().post("/v1/trainers").set(auth(admin)).send(body).expect(403);
    await http().post("/v1/trainers").set(auth(owner)).send({ ...body, password: "short" }).expect(400);
    await http().post("/v1/trainers").set(auth(owner)).send({ ...body, email: "not-an-email" }).expect(400);
    const t = (await http().post("/v1/trainers").set(auth(owner)).send(body).expect(201)).body;
    tid = t.id;
    expect(t).toMatchObject({ name: "Coach Amit", email: "amit@test.local", isActive: true, memberCount: 0, availability: "Mon-Sat 6am-12pm" });
    expect(t.specializations).toEqual(["Strength", "Fat loss"]); // trimmed, blanks dropped
    expect(JSON.stringify(t)).not.toMatch(/passwordHash|argon2/);
    await http().post("/v1/trainers").set(auth(owner)).send(body).expect(409);
  });

  it("the new trainer can sign in but has no access to member or money data", async () => {
    const tok = await login(http, { email: "amit@test.local", password: body.password });
    await http().get("/v1/members").set(auth(tok)).expect(403);
    await http().get("/v1/payments").set(auth(tok)).expect(403);
    await http().get("/v1/trainers").set(auth(tok)).expect(403); // staff directory is for owner/admin
    await http().get("/v1/auth/me").set(auth(tok)).expect(200);
  });

  it("admins can read and assign; a member has one trainer at a time", async () => {
    m1 = (await db.member.findFirstOrThrow({ where: { memberCode: "GYM-0001" } })).id;
    m2 = (await db.member.findFirstOrThrow({ where: { memberCode: "GYM-0002" } })).id;
    const other = (await http().post("/v1/trainers").set(auth(owner)).send({ ...body, name: "Coach Rita", email: "rita@test.local" }).expect(201)).body.id;

    const a = (await http().post(`/v1/trainers/${tid}/assignments`).set(auth(admin)).send({ memberId: m1 }).expect(200)).body;
    expect(a.members).toHaveLength(1); expect(a.memberCount).toBe(1);
    await http().post(`/v1/trainers/${tid}/assignments`).set(auth(admin)).send({ memberId: m1 }).expect(409);
    await http().post(`/v1/trainers/${tid}/assignments`).set(auth(admin)).send({ memberId: randomUUID() }).expect(404);

    const moved = (await http().post(`/v1/trainers/${other}/assignments`).set(auth(admin)).send({ memberId: m1 }).expect(200)).body;
    expect(moved.members[0].member.memberCode).toBe("GYM-0001");
    expect((await http().get(`/v1/trainers/${tid}`).set(auth(admin)).expect(200)).body.members).toHaveLength(0);

    const list = (await http().get("/v1/trainers").set(auth(admin)).expect(200)).body;
    expect(list.find((t: any) => t.id === other).memberCount).toBe(1);
    expect(list.find((t: any) => t.id === tid).memberCount).toBe(0);

    await http().post(`/v1/trainers/${tid}/assignments`).set(auth(admin)).send({ memberId: m2 }).expect(200);
    const end = (await http().post(`/v1/trainers/${tid}/assignments/${(await http().get(`/v1/trainers/${tid}`).set(auth(admin))).body.members[0].id}/end`).set(auth(admin)).expect(200)).body;
    expect(end.members).toHaveLength(0);
    await http().patch(`/v1/trainers/${tid}`).set(auth(admin)).send({ bio: "x" }).expect(403);
  });

  it("blank optional fields are stored as null", async () => {
    const r = (await http().patch(`/v1/trainers/${tid}`).set(auth(owner)).send({ bio: "  ", qualifications: "" }).expect(200)).body;
    expect(r.bio).toBeNull(); expect(r.qualifications).toBeNull();
    await http().patch(`/v1/trainers/${tid}`).set(auth(owner)).send({ bio: "Coach bio", qualifications: "NASM-CPT" }).expect(200);
  });

  it("members screen shows who their trainer is", async () => {
    const d = (await http().get(`/v1/members/${m1}`).set(auth(admin)).expect(200)).body;
    expect(d.assignments[0].trainer.name).toBe("Coach Rita");
  });

  it("public list shows only opted-in active trainers, with no contact details", async () => {
    let r = (await http().get("/v1/public/trainers").expect(200)).body;
    expect(r.map((t: any) => t.name)).toEqual(["Coach Amit", "Coach Rita"]);
    expect(Object.keys(r[0]).sort()).toEqual(["bio", "experienceYears", "name", "qualifications", "specializations"]);
    await http().patch(`/v1/trainers/${tid}`).set(auth(owner)).send({ isPublic: false }).expect(200);
    r = (await http().get("/v1/public/trainers").expect(200)).body;
    expect(r.map((t: any) => t.name)).toEqual(["Coach Rita"]);
  });

  it("deactivating signs the trainer out and blocks login; reactivating restores", async () => {
    const before = await http().post("/v1/auth/staff/login").send({ email: "amit@test.local", password: body.password }).expect(200);
    await http().patch(`/v1/trainers/${tid}`).set(auth(owner)).send({ isActive: false }).expect(200);
    await http().get("/v1/auth/me").set(auth(before.body.accessToken)).expect(401); // immediate, not at token expiry
    await http().post("/v1/auth/refresh").send({ refreshToken: before.body.refreshToken }).expect(401);
    await http().post("/v1/auth/staff/login").send({ email: "amit@test.local", password: body.password }).expect(401);
    await http().post(`/v1/trainers/${tid}/assignments`).set(auth(admin)).send({ memberId: m2 }).expect(409); // can't assign to inactive
    await http().patch(`/v1/trainers/${tid}`).set(auth(owner)).send({ isActive: true, newPassword: "brand-new-pass-123" }).expect(200);
    await http().post("/v1/auth/staff/login").send({ email: "amit@test.local", password: body.password }).expect(401); // old password dead
    await http().post("/v1/auth/staff/login").send({ email: "amit@test.local", password: "brand-new-pass-123" }).expect(200);
  });
});
