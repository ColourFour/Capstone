create extension if not exists "pgcrypto";

create type public.app_role as enum ('student', 'teacher', 'admin');
create type public.unit_version_status as enum ('draft', 'published', 'archived');
create type public.node_type as enum (
  'question',
  'hint',
  'worked_example',
  'instruction',
  'checkpoint',
  'review',
  'extension'
);
create type public.transition_condition_type as enum (
  'always',
  'correct',
  'incorrect',
  'incorrect_twice',
  'misconception',
  'score_at_least'
);
create type public.enrollment_status as enum ('active', 'invited', 'inactive');
create type public.progress_status as enum ('not_started', 'in_progress', 'completed', 'needs_review');
create type public.progress_event_type as enum (
  'entered_node',
  'submitted_answer',
  'viewed_hint',
  'advanced',
  'branched_to_remediation',
  'completed_assignment'
);

create table public.profiles (
  id uuid primary key,
  display_name text not null,
  email text not null unique,
  role public.app_role not null default 'student',
  created_at timestamptz not null default timezone('utc', now())
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  academic_year text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.class_enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status public.enrollment_status not null default 'active',
  unique (class_id, student_id)
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  description text not null default '',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.unit_versions (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  version_number integer not null,
  status public.unit_version_status not null default 'draft',
  entry_node_id uuid null,
  published_at timestamptz null,
  unique (unit_id, version_number)
);

create table public.lesson_nodes (
  id uuid primary key default gen_random_uuid(),
  unit_version_id uuid not null references public.unit_versions(id) on delete cascade,
  node_key text not null,
  node_type public.node_type not null,
  title text not null,
  content_json jsonb not null default '{}'::jsonb,
  scoring_json jsonb null,
  mastery_tags text[] not null default '{}',
  layout_type text null,
  unique (unit_version_id, node_key)
);

alter table public.unit_versions
  add constraint unit_versions_entry_node_fkey
  foreign key (entry_node_id) references public.lesson_nodes(id) on delete set null;

create table public.node_transitions (
  id uuid primary key default gen_random_uuid(),
  from_node_id uuid not null references public.lesson_nodes(id) on delete cascade,
  to_node_id uuid not null references public.lesson_nodes(id) on delete cascade,
  condition_type public.transition_condition_type not null,
  condition_json jsonb null,
  priority_order integer not null default 100
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  unit_version_id uuid not null references public.unit_versions(id) on delete restrict,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  open_at timestamptz null,
  due_at timestamptz null,
  is_live boolean not null default false
);

create table public.student_assignment_progress (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  current_node_id uuid null references public.lesson_nodes(id) on delete set null,
  status public.progress_status not null default 'not_started',
  mastery_score numeric(5,2) not null default 0,
  last_active_at timestamptz null,
  completed_at timestamptz null,
  unique (assignment_id, student_id)
);

create table public.student_node_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  node_id uuid not null references public.lesson_nodes(id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  submitted_answer_json jsonb not null default '{}'::jsonb,
  is_correct boolean not null default false,
  misconception_code text null,
  awarded_score numeric(5,2) not null default 0,
  time_spent_seconds integer not null default 0,
  answered_at timestamptz not null default timezone('utc', now()),
  unique (student_id, assignment_id, node_id, attempt_number)
);

create table public.student_progress_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  event_type public.progress_event_type not null,
  event_payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.teacher_feedback (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  node_id uuid null references public.lesson_nodes(id) on delete set null,
  feedback_text text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index idx_class_enrollments_student on public.class_enrollments(student_id);
create index idx_assignments_class on public.assignments(class_id);
create index idx_lesson_nodes_version on public.lesson_nodes(unit_version_id);
create index idx_node_transitions_from on public.node_transitions(from_node_id, priority_order);
create index idx_progress_assignment_student on public.student_assignment_progress(assignment_id, student_id);
create index idx_attempts_assignment_student_node on public.student_node_attempts(assignment_id, student_id, node_id);
create index idx_events_assignment_student on public.student_progress_events(assignment_id, student_id);

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.teacher_has_student(target_student uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.class_enrollments ce
    join public.classes c on c.id = ce.class_id
    where ce.student_id = target_student
      and c.teacher_id = auth.uid()
  )
$$;

create or replace function public.teacher_has_assignment(target_assignment uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.assignments a
    join public.classes c on c.id = a.class_id
    where a.id = target_assignment
      and c.teacher_id = auth.uid()
  )
$$;

create or replace function public.get_assignment_analytics(target_assignment_id uuid)
returns table (
  node_id uuid,
  node_title text,
  students_on_node bigint,
  incorrect_attempts bigint,
  misconception_code text,
  active_recently_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with current_positions as (
    select sap.current_node_id, count(*) as students_on_node, max(sap.last_active_at) as active_recently_at
    from public.student_assignment_progress sap
    where sap.assignment_id = target_assignment_id
    group by sap.current_node_id
  ),
  attempt_errors as (
    select
      sna.node_id,
      count(*) filter (where sna.is_correct = false) as incorrect_attempts,
      mode() within group (order by sna.misconception_code) as misconception_code
    from public.student_node_attempts sna
    where sna.assignment_id = target_assignment_id
    group by sna.node_id
  )
  select
    ln.id as node_id,
    ln.title as node_title,
    coalesce(cp.students_on_node, 0) as students_on_node,
    coalesce(ae.incorrect_attempts, 0) as incorrect_attempts,
    ae.misconception_code,
    cp.active_recently_at
  from public.lesson_nodes ln
  join public.unit_versions uv on uv.id = ln.unit_version_id
  join public.assignments a on a.unit_version_id = uv.id and a.id = target_assignment_id
  left join current_positions cp on cp.current_node_id = ln.id
  left join attempt_errors ae on ae.node_id = ln.id
  order by coalesce(ae.incorrect_attempts, 0) desc, coalesce(cp.students_on_node, 0) desc, ln.title asc
$$;

grant execute on function public.get_assignment_analytics(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_enrollments enable row level security;
alter table public.units enable row level security;
alter table public.unit_versions enable row level security;
alter table public.lesson_nodes enable row level security;
alter table public.node_transitions enable row level security;
alter table public.assignments enable row level security;
alter table public.student_assignment_progress enable row level security;
alter table public.student_node_attempts enable row level security;
alter table public.student_progress_events enable row level security;
alter table public.teacher_feedback enable row level security;

create policy "profiles are visible to self and related teachers"
on public.profiles
for select
using (
  id = auth.uid()
  or (public.current_user_role() in ('teacher', 'admin') and public.teacher_has_student(id))
  or public.current_user_role() = 'admin'
);

create policy "users update own profile"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "teachers view own classes"
on public.classes
for select
using (
  teacher_id = auth.uid()
  or exists (
    select 1
    from public.class_enrollments ce
    where ce.class_id = classes.id
      and ce.student_id = auth.uid()
  )
);

create policy "teachers manage own classes"
on public.classes
for all
using (teacher_id = auth.uid() or public.current_user_role() = 'admin')
with check (teacher_id = auth.uid() or public.current_user_role() = 'admin');

create policy "students and teachers view enrollments"
on public.class_enrollments
for select
using (
  student_id = auth.uid()
  or exists (
    select 1 from public.classes c
    where c.id = class_enrollments.class_id
      and c.teacher_id = auth.uid()
  )
);

create policy "teachers manage enrollments"
on public.class_enrollments
for all
using (
  exists (
    select 1 from public.classes c
    where c.id = class_enrollments.class_id
      and c.teacher_id = auth.uid()
  )
  or public.current_user_role() = 'admin'
)
with check (
  exists (
    select 1 from public.classes c
    where c.id = class_enrollments.class_id
      and c.teacher_id = auth.uid()
  )
  or public.current_user_role() = 'admin'
);

create policy "authenticated users view units"
on public.units
for select
using (auth.role() = 'authenticated');

create policy "teachers manage units"
on public.units
for all
using (created_by = auth.uid() or public.current_user_role() = 'admin')
with check (public.current_user_role() in ('teacher', 'admin'));

create policy "authenticated users view published versions"
on public.unit_versions
for select
using (status = 'published' or public.current_user_role() in ('teacher', 'admin'));

create policy "teachers manage versions"
on public.unit_versions
for all
using (public.current_user_role() in ('teacher', 'admin'))
with check (public.current_user_role() in ('teacher', 'admin'));

create policy "authenticated users view lesson nodes"
on public.lesson_nodes
for select
using (
  exists (
    select 1 from public.unit_versions uv
    where uv.id = lesson_nodes.unit_version_id
      and (uv.status = 'published' or public.current_user_role() in ('teacher', 'admin'))
  )
);

create policy "teachers manage lesson nodes"
on public.lesson_nodes
for all
using (public.current_user_role() in ('teacher', 'admin'))
with check (public.current_user_role() in ('teacher', 'admin'));

create policy "authenticated users view node transitions"
on public.node_transitions
for select
using (auth.role() = 'authenticated');

create policy "teachers manage node transitions"
on public.node_transitions
for all
using (public.current_user_role() in ('teacher', 'admin'))
with check (public.current_user_role() in ('teacher', 'admin'));

create policy "students read assigned assignments and teachers read own assignments"
on public.assignments
for select
using (
  public.teacher_has_assignment(id)
  or exists (
    select 1
    from public.class_enrollments ce
    where ce.class_id = assignments.class_id
      and ce.student_id = auth.uid()
  )
);

create policy "only teachers or admins create assignments"
on public.assignments
for insert
with check (
  public.current_user_role() in ('teacher', 'admin')
  and (
    public.current_user_role() = 'admin'
    or exists (
      select 1 from public.classes c
      where c.id = assignments.class_id
        and c.teacher_id = auth.uid()
    )
  )
);

create policy "teachers update own assignments"
on public.assignments
for update
using (public.teacher_has_assignment(id) or public.current_user_role() = 'admin')
with check (public.teacher_has_assignment(id) or public.current_user_role() = 'admin');

create policy "students read own progress and teachers read enrolled students progress"
on public.student_assignment_progress
for select
using (
  student_id = auth.uid()
  or public.teacher_has_student(student_id)
  or public.current_user_role() = 'admin'
);

create policy "students update only their own progress"
on public.student_assignment_progress
for update
using (student_id = auth.uid())
with check (student_id = auth.uid());

create policy "teachers create seeded progress rows"
on public.student_assignment_progress
for insert
with check (
  public.current_user_role() in ('teacher', 'admin')
  or student_id = auth.uid()
);

create policy "students read own attempts and teachers read related attempts"
on public.student_node_attempts
for select
using (
  student_id = auth.uid()
  or public.teacher_has_student(student_id)
  or public.current_user_role() = 'admin'
);

create policy "students insert their own attempts"
on public.student_node_attempts
for insert
with check (student_id = auth.uid() or public.current_user_role() = 'admin');

create policy "students read own events and teachers read related events"
on public.student_progress_events
for select
using (
  student_id = auth.uid()
  or public.teacher_has_student(student_id)
  or public.current_user_role() = 'admin'
);

create policy "students insert their own events"
on public.student_progress_events
for insert
with check (student_id = auth.uid() or public.current_user_role() = 'admin');

create policy "teachers read and write feedback for related students"
on public.teacher_feedback
for all
using (
  teacher_id = auth.uid()
  or public.current_user_role() = 'admin'
)
with check (
  teacher_id = auth.uid()
  or public.current_user_role() = 'admin'
);
