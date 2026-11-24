import { cookies } from "next/headers";

export const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";
export const AT = "lfg_at";
export const RT = "lfg_rt";
const secure = process.env.NODE_ENV === "production";

export interface Tokens { accessToken: string; refreshToken: string; expiresIn: number }

/** Tokens live in httpOnly cookies: page JavaScript (and any XSS) can never read them. */
export async function setSession(t: Tokens) {
  const jar = await cookies();
  const base = { httpOnly: true, sameSite: "strict" as const, secure, path: "/" };
  jar.set(AT, t.accessToken, { ...base, maxAge: t.expiresIn });
  jar.set(RT, t.refreshToken, { ...base, maxAge: 30 * 86_400 });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(AT);
  jar.delete(RT);
}

// Parallel requests carrying the same expired session must share ONE refresh:
// rotating the token twice would look like token theft and revoke the session.
const inflight = new Map<string, Promise<Tokens | null>>();

export function refreshOnce(refreshToken: string): Promise<Tokens | null> {
  let p = inflight.get(refreshToken);
  if (!p) {
    p = fetch(`${BACKEND}/v1/auth/refresh`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ refreshToken }), cache: "no-store" })
      .then(async (r) => (r.ok ? ((await r.json()) as Tokens) : null))
      .catch(() => null);
    inflight.set(refreshToken, p);
    setTimeout(() => inflight.delete(refreshToken), 15_000);
  }
  return p;
}
