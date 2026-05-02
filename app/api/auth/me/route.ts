import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { jsonError } from "@/lib/auth-responses";

export async function GET() {
  const user = await getCurrentSession();

  if (!user) {
    return jsonError("No hay una sesion activa.", 401);
  }

  return NextResponse.json({ user });
}
