import { NextRequest, NextResponse } from "next/server";
import { BACKEND, setSession, Tokens } from "@/lib/server";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-requested-with") !== "lfg") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const r = await fetch(`${BACKEND}/v1/auth/staff/login`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": req.headers.get("x-forwarded-for") ?? "" }, body: await req.text(), cache: "no-store" }).catch(() => null);
  if (!r) return NextResponse.json({ message: "Can't reach the server. Try again." }, { status: 502 });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return NextResponse.json({ message: r.status === 429 ? "Too many attempts. Wait a minute." : r.status === 401 ? "Invalid email or password" : "Couldn't sign in" }, { status: r.status });
  await setSession(data as Tokens);
  return NextResponse.json({ ok: true });
}
