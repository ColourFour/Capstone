import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { DEMO_USER_COOKIE } from "@/lib/constants";

export async function POST(request: Request) {
  const formData = await request.formData();
  const userId = formData.get("userId");

  if (typeof userId !== "string" || !userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const cookieStore = await cookies();
  cookieStore.set(DEMO_USER_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/"
  });

  return NextResponse.redirect(new URL("/", request.url));
}
