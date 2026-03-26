import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/auth";

export default async function HomePage() {
  const auth = await getAuthContext();

  if (!auth) {
    redirect("/login");
  }

  redirect(auth.role === "student" ? "/student/dashboard" : "/teacher/dashboard");
}
