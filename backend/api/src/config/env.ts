export interface Env {
  NODE_ENV: "development" | "test" | "production";
  PORT: number;
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  ACCESS_TTL_SECONDS: number;
  REFRESH_TTL_DAYS: number;
  OTP_SECRET: string;
  OTP_TTL_SECONDS: number;
  CORS_ORIGINS: string[];
}

const required = (raw: Record<string, unknown>, key: string): string => {
  const v = raw[key];
  if (typeof v !== "string" || v.trim() === "") throw new Error(`Missing required env var ${key}`);
  return v;
};

const secret = (raw: Record<string, unknown>, key: string): string => {
  const v = required(raw, key);
  if (v.length < 32) throw new Error(`${key} must be at least 32 characters`);
  return v;
};

const int = (raw: Record<string, unknown>, key: string, def: number): number => {
  const v = raw[key];
  if (v === undefined || v === "") return def;
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${key} must be a positive integer`);
  return n;
};

/** Fail fast at boot: a misconfigured API must not start. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const nodeEnv = (raw.NODE_ENV as string) ?? "development";
  if (!["development", "test", "production"].includes(nodeEnv)) throw new Error("NODE_ENV invalid");
  return {
    NODE_ENV: nodeEnv as Env["NODE_ENV"],
    PORT: int(raw, "PORT", 4000),
    DATABASE_URL: required(raw, "DATABASE_URL"),
    JWT_ACCESS_SECRET: secret(raw, "JWT_ACCESS_SECRET"),
    ACCESS_TTL_SECONDS: int(raw, "ACCESS_TTL_SECONDS", 900),
    REFRESH_TTL_DAYS: int(raw, "REFRESH_TTL_DAYS", 30),
    OTP_SECRET: secret(raw, "OTP_SECRET"),
    OTP_TTL_SECONDS: int(raw, "OTP_TTL_SECONDS", 300),
    CORS_ORIGINS: String(raw.CORS_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  };
}
