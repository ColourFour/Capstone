import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DEMO_USER_COOKIE } from "@/lib/constants";
import type { Profile, UserRole } from "@/lib/engine/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface AuthContext {
  userId: string;
  role: UserRole;
  profile: Profile;
  authMode: "supabase" | "demo";
}

async function loadProfile(profileId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, display_name, email, role, created_at")
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Profile | null;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    const profile = await loadProfile(user.id);
    if (!profile) {
      return null;
    }

    return {
      userId: user.id,
      role: profile.role,
      profile,
      authMode: "supabase"
    };
  }

  const cookieStore = await cookies();
  const demoUserId = cookieStore.get(DEMO_USER_COOKIE)?.value;

  if (!demoUserId) {
    return null;
  }

  const profile = await loadProfile(demoUserId);
  if (!profile) {
    return null;
  }

  return {
    userId: profile.id,
    role: profile.role,
    profile,
    authMode: "demo"
  };
}

export async function requireAuth(allowedRoles?: UserRole[]) {
  const auth = await getAuthContext();

  if (!auth) {
    redirect("/login");
  }

  if (allowedRoles && !allowedRoles.includes(auth.role)) {
    redirect(auth.role === "student" ? "/student/dashboard" : "/teacher/dashboard");
  }

  return auth;
}
