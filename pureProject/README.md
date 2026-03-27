# Branching Classroom MVP

A production-minded MVP for branching math lessons built with Next.js App Router, TypeScript, Tailwind, and Supabase.

## What is included

- Data-driven lesson engine based on `lesson_nodes` and `node_transitions`
- Fixed published unit versions so assignments always point at stable content
- Separate current progress state and event history tables
- Protected server-side submission engine in [app/api/engine/submit/route.ts](/Users/sbrooker/repos/pureProject/app/api/engine/submit/route.ts)
- Student dashboard and focused lesson experience
- Teacher dashboard, class view, and assignment bottleneck analytics
- SQL schema, example RLS policies, analytics RPC, and demo seed data
- Demo login flow backed by a cookie so you can explore seeded users before wiring full Supabase auth

## Project structure

```text
app/
  api/engine/submit/route.ts    # server-side grading + progression
  login/                        # demo + future Supabase auth entry
  student/                      # student dashboard and assignment flow
  teacher/                      # teacher dashboard and analytics
components/                     # reusable UI blocks
lib/engine/                     # answer evaluation, misconception tagging, transition logic
lib/supabase/                   # browser, server, and admin clients
supabase/migrations/            # schema + RLS
supabase/seed.sql               # demo class, users, unit graph, progress
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

4. Apply the database schema and seed:

```bash
supabase db push
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

If you prefer Supabase CLI seeds, you can also adapt `supabase/seed.sql` into your local workflow.

5. Start the app:

```bash
npm run dev
```

6. Open `/login` and use one of the demo accounts.

## Notes

- The demo mode uses a secure HTTP-only cookie and server-side admin client reads so the seeded experience works even before real auth users are provisioned.
- In a production rollout, replace the demo login buttons with Supabase Auth and progressively move more server reads to the regular server client so RLS is enforced end-to-end at runtime.
- Extend grading in [lib/engine/evaluateAnswer.ts](/Users/sbrooker/repos/pureProject/lib/engine/evaluateAnswer.ts) and branching in [lib/engine/selectNextNode.ts](/Users/sbrooker/repos/pureProject/lib/engine/selectNextNode.ts).
- The example seed includes first-try correct branching, repeated incorrect branching, and misconception-based remediation for a sign error.

## Demo users

- Teacher: `teacher.demo@example.com`
- Student A: `ava.demo@example.com`
- Student B: `noah.demo@example.com`
- Student C: `mia.demo@example.com`
