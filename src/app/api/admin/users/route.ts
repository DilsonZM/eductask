import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  return (data as { role?: string } | null)?.role === "admin";
}

export async function GET() {
  const supabase = await createClient();
  const isAdmin = await checkAdmin(supabase);

  if (!isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { data } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const isAdmin = await checkAdmin(supabase);

  if (!isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, email, role, action } = body;

    if (action === "reset_password") {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceRoleKey) {
        return NextResponse.json({ error: "Server not configured" }, { status: 500 });
      }

      const admin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey
      );
      const { error } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
      });

      if (error) throw error;
      return NextResponse.json({ message: "Correo de recuperación enviado" });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const admin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: "demo123",
      user_metadata: { name, role },
      email_confirm: true,
    });

    if (error) throw error;

    return NextResponse.json({ user: data.user, message: "Usuario creado" });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const isAdmin = await checkAdmin(supabase);

  if (!isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id, name, role, status } = await request.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("users")
      .update({ name, role, status })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ message: "Usuario actualizado" });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const isAdmin = await checkAdmin(supabase);

  if (!isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await request.json();

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const admin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );
    const { error } = await admin.auth.admin.deleteUser(id);

    if (error) throw error;

    return NextResponse.json({ message: "Usuario eliminado" });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}