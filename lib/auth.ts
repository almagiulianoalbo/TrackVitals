import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { isUserRole, type SessionUser } from "./auth-types";

export const SESSION_COOKIE = "trackvitals_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

type SessionPayload = SessionUser & {
  exp: number;
};

export function signSession(user: SessionUser) {
  const payload: SessionPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createSignature(body);

  return `${body}.${signature}`;
}

export function verifySession(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [body, signature] = token.split(".");

  if (!body || !signature || !safeCompare(signature, createSignature(body))) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;

    if (!isUserRole(payload.role) || !payload.userId || !payload.email || !payload.name) {
      return null;
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      role: payload.role,
      userId: payload.userId,
      email: payload.email,
      name: payload.name
    } satisfies SessionUser;
  } catch {
    return null;
  }
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(SESSION_COOKIE)?.value);
}

function createSignature(body: string) {
  return createHmac("sha256", getAuthSecret()).update(body).digest("base64url");
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("Falta AUTH_SECRET en el entorno.");
  }

  return secret;
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
