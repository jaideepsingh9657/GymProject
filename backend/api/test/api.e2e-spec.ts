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

  it("cancel works and audit log is complete and immutable", async () => {
    await http().post(`/v1/subscriptions/${subId}/cancel`).set(auth(admin)).send({ reason: "test" }).expect(200);
    const actions = (await db.auditLog.findMany({ select: { action: true } })).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(["member.create", "subscription.create", "payment.record", "subscription.cancel", "plan.create", "auth.staff_login_failed"]));
    await expect(db.auditLog.updateMany({ data: { action: "tampered" } })).rejects.toThrow(/append-only/);
    await expect(db.auditLog.deleteMany({})).rejects.toThrow(/append-only/);
  });
});
