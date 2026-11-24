import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { execSync } from "child_process";
import request from "supertest";
import { seed } from "../prisma/seed";

export const OWNER = { email: "owner@test.local", password: "owner-password-123" };
export const ADMIN = { email: "admin@test.local", password: "admin-password-123" };
export const TRAINER = { email: "trainer@test.local", password: "trainer-password-123" };

export const TEST_DB_URL = process.env.TEST_DATABASE_URL ?? "postgresql://lfg:lfg@localhost:5433/lfg_test?schema=public";

export async function bootstrap() {
  process.env.DATABASE_URL = TEST_DB_URL;
  process.env.NODE_ENV = "test";
  process.env.DISABLE_THROTTLE = "1"; // real limits are covered in throttle.e2e-spec.ts
  process.env.JWT_ACCESS_SECRET = "e2e-access-secret-e2e-access-secret-1234";
  process.env.OTP_SECRET = "e2e-otp-secret-e2e-otp-secret-123456";
  execSync("npx prisma migrate deploy", { env: process.env, stdio: "pipe" });

  const db = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  const { branch } = await seed(db, OWNER.email, OWNER.password);
  for (const [u, role] of [[ADMIN, "ADMIN"], [TRAINER, "TRAINER"]] as const) {
    const user = await db.user.create({ data: { email: u.email, passwordHash: await argon2.hash(u.password), branchId: branch.id } });
    const r = await db.role.findUniqueOrThrow({ where: { key: role } });
    await db.userRole.create({ data: { userId: user.id, roleId: r.id } });
  }

  const { AppModule } = await import("../src/app.module");
  const { configureApp } = await import("../src/app.setup");
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = mod.createNestApplication<NestExpressApplication>({ logger: false });
  configureApp(app);
  await app.init();
  return { app: app as INestApplication, db, http: () => request(app.getHttpServer()) };
}

export async function login(http: () => request.Agent | any, creds: { email: string; password: string }) {
  const res = await http().post("/v1/auth/staff/login").send(creds).expect(200);
  return res.body.accessToken as string;
}
