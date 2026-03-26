do $$
declare
  teacher_id uuid := '00000000-0000-4000-8000-000000000001';
  student_a uuid := '00000000-0000-4000-8000-000000000101';
  student_b uuid := '00000000-0000-4000-8000-000000000102';
  student_c uuid := '00000000-0000-4000-8000-000000000103';
  class_id uuid := '10000000-0000-4000-8000-000000000001';
  unit_id uuid := '20000000-0000-4000-8000-000000000001';
  version_id uuid := '20000000-0000-4000-8000-000000000002';
  v_assignment_id uuid := '30000000-0000-4000-8000-000000000001';
  node_intro uuid := '40000000-0000-4000-8000-000000000001';
  node_starter uuid := '40000000-0000-4000-8000-000000000002';
  node_hint uuid := '40000000-0000-4000-8000-000000000003';
  node_sign_example uuid := '40000000-0000-4000-8000-000000000004';
  node_worked_example uuid := '40000000-0000-4000-8000-000000000005';
  node_recovery uuid := '40000000-0000-4000-8000-000000000006';
  node_extension uuid := '40000000-0000-4000-8000-000000000007';
  node_core_checkpoint uuid := '40000000-0000-4000-8000-000000000008';
  node_review uuid := '40000000-0000-4000-8000-000000000009';
  node_finish uuid := '40000000-0000-4000-8000-000000000010';
begin
  insert into public.profiles (id, display_name, email, role)
  values
    (teacher_id, 'Ms. Rivera', 'teacher.demo@example.com', 'teacher'),
    (student_a, 'Ava Chen', 'ava.demo@example.com', 'student'),
    (student_b, 'Noah Patel', 'noah.demo@example.com', 'student'),
    (student_c, 'Mia Johnson', 'mia.demo@example.com', 'student')
  on conflict (id) do update set
    display_name = excluded.display_name,
    email = excluded.email,
    role = excluded.role;

  insert into public.classes (id, name, teacher_id, subject, academic_year)
  values (class_id, 'Algebra 1 - Period 2', teacher_id, 'Mathematics', '2025-2026')
  on conflict (id) do update set
    name = excluded.name,
    teacher_id = excluded.teacher_id,
    subject = excluded.subject,
    academic_year = excluded.academic_year;

  insert into public.class_enrollments (class_id, student_id, status)
  values
    (class_id, student_a, 'active'),
    (class_id, student_b, 'active'),
    (class_id, student_c, 'active')
  on conflict (class_id, student_id) do update set status = excluded.status;

  insert into public.units (id, title, subject, description, created_by)
  values (
    unit_id,
    'Solving One-Step Equations',
    'Mathematics',
    'A branching lesson on balancing equations and diagnosing early misconceptions.',
    teacher_id
  )
  on conflict (id) do update set
    title = excluded.title,
    subject = excluded.subject,
    description = excluded.description,
    created_by = excluded.created_by;

  insert into public.unit_versions (id, unit_id, version_number, status, published_at)
  values (version_id, unit_id, 1, 'published', timezone('utc', now()))
  on conflict (id) do update set
    unit_id = excluded.unit_id,
    version_number = excluded.version_number,
    status = excluded.status,
    published_at = excluded.published_at;

  insert into public.lesson_nodes (
    id,
    unit_version_id,
    node_key,
    node_type,
    title,
    content_json,
    scoring_json,
    mastery_tags,
    layout_type
  )
  values
    (
      node_intro,
      version_id,
      'intro',
      'instruction',
      'Warm-up: balancing the equation',
      jsonb_build_object(
        'prompt', 'Today we solve one-step equations by keeping both sides balanced.',
        'body', 'You will branch into hints, worked examples, or extension practice depending on how you answer.',
        'ctaLabel', 'Start lesson'
      ),
      null,
      array['equation-solving'],
      'focus'
    ),
    (
      node_starter,
      version_id,
      'starter-question',
      'question',
      'Starter question',
      jsonb_build_object(
        'prompt', 'Solve for x.',
        'questionLatex', 'x - 4 = 9',
        'answerPlaceholder', 'Enter a number'
      ),
      jsonb_build_object(
        'type', 'exact_numeric',
        'correctAnswer', '13',
        'acceptableAnswers', jsonb_build_array('13.0'),
        'maxScore', 20,
        'misconceptionMap', jsonb_build_object(
          '5', 'sign_error',
          '-13', 'inverse_operation_confusion'
        )
      ),
      array['solve-one-step-equations', 'inverse-operations'],
      'focus'
    ),
    (
      node_hint,
      version_id,
      'hint-balance',
      'hint',
      'Hint: undo the subtraction',
      jsonb_build_object(
        'prompt', 'Think about the inverse operation.',
        'body', 'If 4 is being subtracted from x, what operation would undo that subtraction on both sides?',
        'ctaLabel', 'Try again'
      ),
      null,
      array['inverse-operations'],
      'support'
    ),
    (
      node_sign_example,
      version_id,
      'sign-error-example',
      'worked_example',
      'Worked example: watch the sign',
      jsonb_build_object(
        'prompt', 'A common mistake is subtracting 4 again and getting 5.',
        'workedSteps', jsonb_build_array(
          'Start with x - 4 = 9.',
          'Add 4 to both sides, because addition undoes subtraction.',
          'That gives x = 13.'
        ),
        'ctaLabel', 'Recovery practice'
      ),
      null,
      array['signs', 'inverse-operations'],
      'support'
    ),
    (
      node_worked_example,
      version_id,
      'general-worked-example',
      'worked_example',
      'Worked example: isolate the variable',
      jsonb_build_object(
        'prompt', 'Let''s walk one through together.',
        'workedSteps', jsonb_build_array(
          'For y + 6 = 14, subtract 6 from both sides.',
          '14 - 6 = 8.',
          'So y = 8.'
        ),
        'ctaLabel', 'Recovery practice'
      ),
      null,
      array['inverse-operations'],
      'support'
    ),
    (
      node_recovery,
      version_id,
      'recovery-practice',
      'question',
      'Recovery practice',
      jsonb_build_object(
        'prompt', 'Try a similar equation.',
        'questionLatex', 'x - 7 = 6',
        'answerPlaceholder', 'Enter a number'
      ),
      jsonb_build_object(
        'type', 'exact_numeric',
        'correctAnswer', '13',
        'maxScore', 15
      ),
      array['solve-one-step-equations'],
      'focus'
    ),
    (
      node_extension,
      version_id,
      'extension',
      'extension',
      'Extension challenge',
      jsonb_build_object(
        'prompt', 'You got the starter correct immediately. Take on a harder one.',
        'questionLatex', '3x = 21',
        'answerPlaceholder', 'Enter a number'
      ),
      jsonb_build_object(
        'type', 'exact_numeric',
        'correctAnswer', '7',
        'maxScore', 25
      ),
      array['challenge', 'multiplicative-equations'],
      'focus'
    ),
    (
      node_core_checkpoint,
      version_id,
      'core-checkpoint',
      'checkpoint',
      'Checkpoint: choose the right first move',
      jsonb_build_object(
        'prompt', 'What should you do first to solve x + 8 = 11?',
        'choices', jsonb_build_array(
          jsonb_build_object('label', 'Subtract 8 from both sides', 'value', 'subtract_8'),
          jsonb_build_object('label', 'Add 8 to both sides', 'value', 'add_8'),
          jsonb_build_object('label', 'Multiply both sides by 8', 'value', 'multiply_8')
        )
      ),
      jsonb_build_object(
        'type', 'multiple_choice',
        'correctAnswer', 'subtract_8',
        'maxScore', 20,
        'misconceptionMap', jsonb_build_object('add_8', 'wrong_inverse_operation')
      ),
      array['strategy-selection'],
      'focus'
    ),
    (
      node_review,
      version_id,
      'review-summary',
      'review',
      'Review the strategy',
      jsonb_build_object(
        'prompt', 'When a number is added to the variable, subtract it from both sides. When a number is subtracted, add it to both sides.',
        'body', 'This review node lets students regroup before finishing the assignment.',
        'ctaLabel', 'Finish lesson'
      ),
      null,
      array['inverse-operations'],
      'reflection'
    ),
    (
      node_finish,
      version_id,
      'finish',
      'instruction',
      'Lesson complete',
      jsonb_build_object(
        'prompt', 'You finished the branching lesson.',
        'body', 'Teachers can now see your final node history, error patterns, and mastery score.'
      ),
      null,
      array['wrap-up'],
      'focus'
    )
  on conflict (id) do update set
    title = excluded.title,
    content_json = excluded.content_json,
    scoring_json = excluded.scoring_json,
    mastery_tags = excluded.mastery_tags,
    layout_type = excluded.layout_type;

  update public.unit_versions
  set entry_node_id = node_intro
  where id = version_id;

  delete from public.node_transitions where from_node_id in (
    node_intro, node_starter, node_hint, node_sign_example, node_worked_example,
    node_recovery, node_extension, node_core_checkpoint, node_review
  );

  insert into public.node_transitions (from_node_id, to_node_id, condition_type, condition_json, priority_order)
  values
    (node_intro, node_starter, 'always', jsonb_build_object('min_attempt_number', 1), 10),
    (node_starter, node_extension, 'correct', jsonb_build_object('max_attempt_number', 1), 10),
    (node_starter, node_hint, 'incorrect', jsonb_build_object('max_attempt_number', 1), 20),
    (node_starter, node_sign_example, 'misconception', jsonb_build_object('misconception_code', 'sign_error', 'min_attempt_number', 2), 10),
    (node_starter, node_worked_example, 'incorrect_twice', jsonb_build_object('min_attempt_number', 2), 20),
    (node_starter, node_core_checkpoint, 'correct', jsonb_build_object('min_attempt_number', 2), 30),
    (node_hint, node_starter, 'always', jsonb_build_object('min_attempt_number', 1), 10),
    (node_sign_example, node_recovery, 'always', jsonb_build_object('min_attempt_number', 1), 10),
    (node_worked_example, node_recovery, 'always', jsonb_build_object('min_attempt_number', 1), 10),
    (node_recovery, node_core_checkpoint, 'correct', jsonb_build_object('min_attempt_number', 1), 10),
    (node_recovery, node_worked_example, 'incorrect_twice', jsonb_build_object('min_attempt_number', 2), 20),
    (node_extension, node_core_checkpoint, 'correct', jsonb_build_object('min_attempt_number', 1), 10),
    (node_extension, node_review, 'incorrect', jsonb_build_object('min_attempt_number', 1), 20),
    (node_core_checkpoint, node_review, 'correct', jsonb_build_object('min_attempt_number', 1), 10),
    (node_core_checkpoint, node_review, 'incorrect', jsonb_build_object('min_attempt_number', 1), 20),
    (node_review, node_finish, 'always', jsonb_build_object('min_attempt_number', 1), 10);

  insert into public.assignments (id, class_id, unit_version_id, assigned_by, open_at, due_at, is_live)
  values (
    v_assignment_id,
    class_id,
    version_id,
    teacher_id,
    timezone('utc', now()) - interval '1 day',
    timezone('utc', now()) + interval '10 day',
    true
  )
  on conflict (id) do update set
    class_id = excluded.class_id,
    unit_version_id = excluded.unit_version_id,
    assigned_by = excluded.assigned_by,
    open_at = excluded.open_at,
    due_at = excluded.due_at,
    is_live = excluded.is_live;

  insert into public.student_assignment_progress (
    assignment_id,
    student_id,
    current_node_id,
    status,
    mastery_score,
    last_active_at,
    completed_at
  )
  values
    (v_assignment_id, student_a, node_intro, 'in_progress', 0, timezone('utc', now()) - interval '30 minute', null),
    (v_assignment_id, student_b, node_sign_example, 'in_progress', 10, timezone('utc', now()) - interval '12 minute', null),
    (v_assignment_id, student_c, node_core_checkpoint, 'in_progress', 45, timezone('utc', now()) - interval '5 minute', null)
  on conflict (assignment_id, student_id) do update set
    current_node_id = excluded.current_node_id,
    status = excluded.status,
    mastery_score = excluded.mastery_score,
    last_active_at = excluded.last_active_at,
    completed_at = excluded.completed_at;

  delete from public.student_node_attempts where assignment_id = v_assignment_id;
  delete from public.student_progress_events where assignment_id = v_assignment_id;

  insert into public.student_node_attempts (
    student_id,
    assignment_id,
    node_id,
    attempt_number,
    submitted_answer_json,
    is_correct,
    misconception_code,
    awarded_score,
    time_spent_seconds,
    answered_at
  )
  values
    (
      student_b,
      v_assignment_id,
      node_starter,
      1,
      jsonb_build_object('value', '5'),
      false,
      'sign_error',
      0,
      32,
      timezone('utc', now()) - interval '16 minute'
    ),
    (
      student_b,
      v_assignment_id,
      node_starter,
      2,
      jsonb_build_object('value', '5'),
      false,
      'sign_error',
      0,
      29,
      timezone('utc', now()) - interval '13 minute'
    ),
    (
      student_c,
      v_assignment_id,
      node_starter,
      1,
      jsonb_build_object('value', '13'),
      true,
      null,
      20,
      20,
      timezone('utc', now()) - interval '11 minute'
    ),
    (
      student_c,
      v_assignment_id,
      node_extension,
      1,
      jsonb_build_object('value', '7'),
      true,
      null,
      25,
      24,
      timezone('utc', now()) - interval '7 minute'
    );

  insert into public.student_progress_events (student_id, assignment_id, event_type, event_payload_json, created_at)
  values
    (student_b, v_assignment_id, 'entered_node', jsonb_build_object('node_id', node_starter), timezone('utc', now()) - interval '16 minute'),
    (student_b, v_assignment_id, 'submitted_answer', jsonb_build_object('node_id', node_starter, 'attempt_number', 1, 'is_correct', false, 'misconception_code', 'sign_error'), timezone('utc', now()) - interval '16 minute'),
    (student_b, v_assignment_id, 'advanced', jsonb_build_object('from_node_id', node_starter, 'to_node_id', node_hint), timezone('utc', now()) - interval '16 minute'),
    (student_b, v_assignment_id, 'submitted_answer', jsonb_build_object('node_id', node_starter, 'attempt_number', 2, 'is_correct', false, 'misconception_code', 'sign_error'), timezone('utc', now()) - interval '13 minute'),
    (student_b, v_assignment_id, 'branched_to_remediation', jsonb_build_object('from_node_id', node_starter, 'to_node_id', node_sign_example), timezone('utc', now()) - interval '13 minute'),
    (student_c, v_assignment_id, 'submitted_answer', jsonb_build_object('node_id', node_starter, 'attempt_number', 1, 'is_correct', true), timezone('utc', now()) - interval '11 minute'),
    (student_c, v_assignment_id, 'advanced', jsonb_build_object('from_node_id', node_starter, 'to_node_id', node_extension), timezone('utc', now()) - interval '11 minute'),
    (student_c, v_assignment_id, 'submitted_answer', jsonb_build_object('node_id', node_extension, 'attempt_number', 1, 'is_correct', true), timezone('utc', now()) - interval '7 minute'),
    (student_c, v_assignment_id, 'advanced', jsonb_build_object('from_node_id', node_extension, 'to_node_id', node_core_checkpoint), timezone('utc', now()) - interval '7 minute');
end
$$;
