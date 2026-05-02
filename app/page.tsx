import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentSession();

  redirect(user ? "/dashboard" : "/login");
}
