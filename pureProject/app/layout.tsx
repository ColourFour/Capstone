import type { Metadata } from "next";
import Link from "next/link";

import "@/app/globals.css";

import { getAuthContext } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Branching Classroom MVP",
  description: "A production-minded MVP for branching math lessons."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auth = await getAuthContext();

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-sky-200/80 bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
              <Link href="/" className="text-lg font-semibold tracking-tight">
                Branching Classroom
              </Link>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                {auth ? (
                  <>
                    <span>{auth.profile.display_name}</span>
                    <span className="rounded-full bg-sky-100 px-3 py-1 font-medium text-sky-700">
                      {auth.role}
                    </span>
                    <form action="/api/logout" method="post">
                      <button className="rounded-full border border-slate-200 px-3 py-1.5 font-medium hover:border-slate-300">
                        Sign out
                      </button>
                    </form>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="rounded-full border border-slate-200 px-3 py-1.5 font-medium hover:border-slate-300"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
