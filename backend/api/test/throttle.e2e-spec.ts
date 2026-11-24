import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { TEST_DB_URL } from "./helpers";

let app: INestApplication;
beforeAll(async () => {
  process.env.DATABASE_URL = TEST_DB_URL; process.env.NODE_ENV = "test"; delete process.env.DISABLE_THROTTLE;
  process.env.JWT_ACCESS_SECRET = "e2e-access-secret-e2e-access-secret-1234"; process.env.OTP_SECRET = "e2e-otp-secret-e2e-otp-secret-123456";
  const { AppModule } = await import("../src/app.module");
  const { configureApp } = await import("../src/app.setup");
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = mod.createNestApplication<NestExpressApplication>({ logger: false });
  configureApp(app as NestExpressApplication);
  await app.init();
});
afterAll(() => app.close());

it("rate-limits staff login after 5 attempts a minute", async () => {
  const codes: number[] = [];
  for (let i = 0; i < 7; i++) codes.push((await request(app.getHttpServer()).post("/v1/auth/staff/login").send({ email: "x@test.local", password: "wrong-password-1" })).status);
  expect(codes.slice(0, 5).every((c) => c === 401)).toBe(true);
  expect(codes.slice(5)).toEqual([429, 429]);
});
