import { DEMO_USERS } from "@/lib/constants";

const demoAccounts = [
  {
    id: DEMO_USERS.teacher,
    label: "Demo teacher",
    description: "View class progress, bottlenecks, and assignment analytics."
  },
  {
    id: DEMO_USERS.studentA,
    label: "Demo student A",
    description: "Starts the algebra branching unit from the beginning."
  },
  {
    id: DEMO_USERS.studentB,
    label: "Demo student B",
    description: "Already encountered a misconception branch in the demo data."
  }
];

export default function LoginPage() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-[2rem] bg-slate-950 p-10 text-white shadow-card">
        <p className="text-sm uppercase tracking-[0.25em] text-sky-300">Math learning platform</p>
        <h1 className="mt-4 max-w-xl text-5xl font-semibold tracking-tight">
          Branch lessons based on what each student actually understands.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-200">
          This MVP uses a graph-based lesson engine, fixed published unit versions, and server-side
          progression logic through Next.js route handlers.
        </p>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-card">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Sign in</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          For a real Supabase deployment, connect this screen to magic-link, password, or SSO auth.
          The buttons below set a demo cookie so you can explore the seeded data right away.
        </p>

        <div className="mt-8 space-y-4">
          {demoAccounts.map((account) => (
            <form key={account.id} action="/api/demo-login" method="post" className="rounded-2xl border border-slate-200 p-4">
              <input type="hidden" name="userId" value={account.id} />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900">{account.label}</h3>
                  <p className="mt-1 text-sm text-slate-600">{account.description}</p>
                </div>
                <button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                  Enter
                </button>
              </div>
            </form>
          ))}
        </div>

        <div className="mt-8 rounded-2xl bg-sky-50 p-4 text-sm leading-6 text-sky-900">
          Environment variables expected:
          <code className="ml-2 rounded bg-white px-2 py-1">
            NEXT_PUBLIC_SUPABASE_URL
          </code>
          <code className="ml-2 rounded bg-white px-2 py-1">
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
          </code>
          <code className="ml-2 rounded bg-white px-2 py-1">
            SUPABASE_SERVICE_ROLE_KEY
          </code>
        </div>
      </section>
    </div>
  );
}
