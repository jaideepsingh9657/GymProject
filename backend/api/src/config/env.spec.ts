import { validateEnv } from "./env";

const ok = { DATABASE_URL: "postgresql://x", JWT_ACCESS_SECRET: "a".repeat(32), OTP_SECRET: "b".repeat(32) };

describe("validateEnv", () => {
  it("applies defaults", () => {
    const e = validateEnv(ok);
    expect(e.PORT).toBe(4000); expect(e.ACCESS_TTL_SECONDS).toBe(900); expect(e.CORS_ORIGINS).toEqual([]);
  });
  it("splits CORS origins", () => { expect(validateEnv({ ...ok, CORS_ORIGINS: "http://a, http://b" }).CORS_ORIGINS).toEqual(["http://a", "http://b"]); });
  it("rejects missing or short secrets", () => {
    expect(() => validateEnv({ ...ok, JWT_ACCESS_SECRET: "short" })).toThrow(/32/);
    expect(() => validateEnv({ ...ok, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
  });
  it("rejects bad numbers and NODE_ENV", () => {
    expect(() => validateEnv({ ...ok, PORT: "abc" })).toThrow();
    expect(() => validateEnv({ ...ok, NODE_ENV: "staging" })).toThrow();
  });
});
