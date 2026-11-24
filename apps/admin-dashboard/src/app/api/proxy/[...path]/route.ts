import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { AT, BACKEND, clearSession, refreshOnce, RT, setSession } from "@/lib/server";

type Ctx = { params: Promise<{ path: string[] }> };

/**
 * Same-origin gateway to the API. Attaches the bearer token from the httpOnly cookie,
 * refreshes it transparently, and refuses cross-site writes (custom header + SameSite=Strict).
 * Auth endpoints are not reachable through here.
 */
async function handle(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  if (path[0] !== "v1" || path[1] === "auth") return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (req.method !== "GET" && req.headers.get("x-requested-with") !== "lfg") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();
  const url = `${BACKEND}/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
  const call = (token: string) => fetch(url, {
    method: req.method, body, cache: "no-store",
    headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}), ...(req.headers.get("idempotency-key") ? { "idempotency-key": req.headers.get("idempotency-key")! } : {}) },
  });

  const jar = await cookies();
  let res = jar.get(AT)?.value ? await call(jar.get(AT)!.value) : null;
  if (!res || res.status === 401) {
    const rt = jar.get(RT)?.value;
    const t = rt ? await refreshOnce(rt) : null;
    if (!t) { await clearSession(); return NextResponse.json({ message: "Session expired" }, { status: 401 }); }
    await setSession(t);
    res = await call(t.accessToken);
  }
  return new NextResponse(res.status === 204 ? null : await res.text(), { status: res.status, headers: { "content-type": res.headers.get("content-type") ?? "application/json" } });
}

export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
