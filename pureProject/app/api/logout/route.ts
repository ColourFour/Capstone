import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { DEMO_USER_COOKIE } from "@/lib/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete(DEMO_USER_COOKIE);

  return NextResponse.redirect(new URL("/login", request.url));
}
