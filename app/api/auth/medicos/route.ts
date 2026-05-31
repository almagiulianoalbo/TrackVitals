import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("medicos")
      .select("id_medico,nombre,apellido")
      .order("apellido", { ascending: true })
      .order("nombre", { ascending: true });

    if (error) {
      console.error("No se pudo listar médicos para el registro.", error);
      return NextResponse.json({ error: "No se pudo cargar la lista de médicos." }, { status: 500 });
    }

    return NextResponse.json({ medicos: data ?? [] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo cargar la lista de médicos." }, { status: 500 });
  }
}
