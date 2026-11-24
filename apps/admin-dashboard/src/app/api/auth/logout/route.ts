import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { BACKEND, clearSession, RT } from "@/lib/server";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-requested-with") !== "lfg") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const rt = (await cookies()).get(RT)?.value;
  if (rt) await fetch(`${BACKEND}/v1/auth/logout`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ refreshToken: rt }), cache: "no-store" }).catch(() => null);
  await clearSession();
  return NextResponse.json({ ok: true });
}
