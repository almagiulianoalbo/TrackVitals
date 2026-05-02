import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "./auth";
import type { SessionUser } from "./auth-types";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonSession(user: SessionUser, token: string) {
  const response = NextResponse.json({ user });

  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE
  });

  return response;
}
