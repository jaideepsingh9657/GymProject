import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const signedIn = req.cookies.has("lfg_rt");
  const { pathname } = req.nextUrl;
  if (pathname === "/login") return signedIn ? NextResponse.redirect(new URL("/today", req.url)) : NextResponse.next();
  if (!signedIn) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next|favicon.ico).*)"] };
