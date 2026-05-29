import { jsonError } from "@/lib/auth-responses";
import { getCurrentSession } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentSession();

  if (!user) {
    return jsonError("No autenticado.", 401);
  }

  return Response.json({ user });
}
