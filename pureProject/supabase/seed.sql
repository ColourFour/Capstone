do $$
declare
  v_teacher_id uuid := '00000000-0000-4000-8000-000000000001';
  v_student_a uuid := '00000000-0000-4000-8000-000000000101';
  v_student_b uuid := '00000000-0000-4000-8000-000000000102';
  v_student_c uuid := '00000000-0000-4000-8000-000000000103';
  v_class_id uuid := '10000000-0000-4000-8000-000000000001';
  v_unit_id uuid := '20000000-0000-4000-8000-000000000001';
  v_version_id uuid := '20000000-0000-4000-8000-000000000002';
  v_assignment_id uuid := '30000000-0000-4000-8000-000000000001';
  v_node_intro uuid := '40000000-0000-4000-8000-000000000001';
  v_node_basic_check uuid := '40000000-0000-4000-8000-000000000002';
  v_node_basic_remediation uuid := '40000000-0000-4000-8000-000000000003';
  v_node_graph_check uuid := '40000000-0000-4000-8000-000000000004';
  v_node_graph_remediation uuid := '40000000-0000-4000-8000-000000000005';
  v_node_transform_check uuid := '40000000-0000-4000-8000-000000000006';
  v_node_transform_remediation uuid := '40000000-0000-4000-8000-000000000007';
  v_node_inequality_check uuid := '40000000-0000-4000-8000-000000000008';
  v_node_inequality_remediation uuid := '40000000-0000-4000-8000-000000000009';
  v_node_boss uuid := '40000000-0000-4000-8000-000000000010';
  v_node_completion uuid := '40000000-0000-4000-8000-000000000011';
  v_node_boss_remediation uuid := '40000000-0000-4000-8000-000000000012';
begin
  insert into public.profiles (id, display_name, email, role)
  values
    (v_teacher_id, 'Ms. Rivera', 'teacher.demo@example.com', 'teacher'),
    (v_student_a, 'Ava Chen', 'ava.demo@example.com', 'student'),
    (v_student_b, 'Noah Patel', 'noah.demo@example.com', 'student'),
    (v_student_c, 'Mia Johnson', 'mia.demo@example.com', 'student')
  on conflict (id) do update set
    display_name = excluded.display_name,
    email = excluded.email,
    role = excluded.role;

  insert into public.classes (id, name, teacher_id, subject, academic_year)
  values (v_class_id, 'Algebra 1 - Period 2', v_teacher_id, 'Mathematics', '2025-2026')
  on conflict (id) do update set
    name = excluded.name,
    teacher_id = excluded.teacher_id,
    subject = excluded.subject,
    academic_year = excluded.academic_year;

  insert into public.class_enrollments (class_id, student_id, status)
  values
    (v_class_id, v_student_a, 'active'),
    (v_class_id, v_student_b, 'active'),
    (v_class_id, v_student_c, 'active')
  on conflict (class_id, student_id) do update set status = excluded.status;

  insert into public.units (id, title, subject, description, created_by)
  values (
    v_unit_id,
    'Introduction to Modulus',
    'Mathematics',
    'A branching introduction to modulus as distance, graphing simple absolute value functions, and solving basic equations and inequalities.',
    v_teacher_id
  )
  on conflict (id) do update set
    title = excluded.title,
    subject = excluded.subject,
    description = excluded.description,
    created_by = excluded.created_by;

  insert into public.unit_versions (id, unit_id, version_number, status, published_at)
  values (v_version_id, v_unit_id, 1, 'published', timezone('utc', now()))
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
      v_node_intro,
      v_version_id,
      'intro',
      'instruction',
      'What does |x| mean?',
      jsonb_build_object(
        'prompt', '|x| is the distance of x from 0 on the number line.',
        'body', 'Examples: |3| = 3, |-3| = 3, and |0| = 0. This lesson introduces the core ideas behind modulus, its graph, and simple equations and inequalities.',
        'ctaLabel', 'Start lesson'
      ),
      null,
      array['modulus', 'distance'],
      'focus'
    ),
    (
      v_node_basic_check,
      v_version_id,
      'basic-check',
      'question',
      'Distance from zero',
      jsonb_build_object(
        'prompt', 'Solve |x| = 4.',
        'choices', jsonb_build_array(
          jsonb_build_object('label', 'x = 4 or x = -4', 'value', 'pm_4'),
          jsonb_build_object('label', 'x = 4 only', 'value', 'positive_only'),
          jsonb_build_object('label', 'x = -4 only', 'value', 'negative_only'),
          jsonb_build_object('label', 'No solution', 'value', 'none')
        )
      ),
      jsonb_build_object(
        'type', 'multiple_choice',
        'correctAnswer', 'pm_4',
        'maxScore', 15
      ),
      array['modulus', 'equations'],
      'focus'
    ),
    (
      v_node_basic_remediation,
      v_version_id,
      'basic-remediation',
      'worked_example',
      'Why there are two answers',
      jsonb_build_object(
        'prompt', '|x| = 4 means the distance from 0 is 4.',
        'workedSteps', jsonb_build_array(
          'A point 4 units from 0 can be at x = 4 or x = -4.',
          'So |x| = 4 has two solutions: x = 4 and x = -4.',
          'Likewise, |x| = 7 gives x = 7 or x = -7.'
        ),
        'ctaLabel', 'Continue to graphs'
      ),
      null,
      array['modulus', 'distance'],
      'support'
    ),
    (
      v_node_graph_check,
      v_version_id,
      'graph-check',
      'question',
      'The graph of y = |x|',
      jsonb_build_object(
        'prompt', 'Which statement correctly describes the graph of y = |x|?',
        'choices', jsonb_build_array(
          jsonb_build_object('label', 'It is V-shaped, has vertex at (0,0), and is symmetric about the y-axis.', 'value', 'v_origin'),
          jsonb_build_object('label', 'It is a straight line through the origin with gradient 1.', 'value', 'line'),
          jsonb_build_object('label', 'It is V-shaped with vertex at (0,2).', 'value', 'shifted_up'),
          jsonb_build_object('label', 'It is symmetric about the x-axis.', 'value', 'x_axis')
        )
      ),
      jsonb_build_object(
        'type', 'multiple_choice',
        'correctAnswer', 'v_origin',
        'maxScore', 15
      ),
      array['graphs', 'modulus'],
      'focus'
    ),
    (
      v_node_graph_remediation,
      v_version_id,
      'graph-remediation',
      'worked_example',
      'Understanding the V-shape',
      jsonb_build_object(
        'prompt', 'The graph of y = |x| comes from two simple rules.',
        'workedSteps', jsonb_build_array(
          'When x >= 0, |x| = x.',
          'When x < 0, |x| = -x.',
          'That gives a V shape with vertex at the origin.'
        ),
        'ctaLabel', 'Continue to transformations'
      ),
      null,
      array['graphs', 'piecewise-thinking'],
      'support'
    ),
    (
      v_node_transform_check,
      v_version_id,
      'transformation-check',
      'question',
      'Shifting the graph',
      jsonb_build_object(
        'prompt', 'Which option best describes the graph of y = |x - 2|?',
        'choices', jsonb_build_array(
          jsonb_build_object('label', 'Same V shape, shifted 2 units right, with vertex at (2,0).', 'value', 'right_2'),
          jsonb_build_object('label', 'Same V shape, shifted 2 units left, with vertex at (-2,0).', 'value', 'left_2'),
          jsonb_build_object('label', 'Same V shape, shifted 2 units up, with vertex at (0,2).', 'value', 'up_2'),
          jsonb_build_object('label', 'Stretched V shape with vertex still at (0,0).', 'value', 'stretch')
        )
      ),
      jsonb_build_object(
        'type', 'multiple_choice',
        'correctAnswer', 'right_2',
        'maxScore', 15
      ),
      array['graphs', 'transformations'],
      'focus'
    ),
    (
      v_node_transform_remediation,
      v_version_id,
      'transformation-remediation',
      'worked_example',
      'How y = |x-a| moves',
      jsonb_build_object(
        'prompt', 'The expression y = |x-a| shifts the graph of y = |x| horizontally.',
        'workedSteps', jsonb_build_array(
          'Replacing x with x-a shifts the graph a units to the right.',
          'So y = |x-2| is the same V shape moved 2 units right.',
          'Its vertex is at (2,0).'
        ),
        'ctaLabel', 'Continue to inequalities'
      ),
      null,
      array['graphs', 'transformations'],
      'support'
    ),
    (
      v_node_inequality_check,
      v_version_id,
      'inequality-check',
      'question',
      'Distance from a point',
      jsonb_build_object(
        'prompt', 'Solve |x - 3| < 2.',
        'choices', jsonb_build_array(
          jsonb_build_object('label', '1 < x < 5', 'value', 'between_1_5'),
          jsonb_build_object('label', 'x < 1 or x > 5', 'value', 'outside'),
          jsonb_build_object('label', 'x < 5', 'value', 'lt_5'),
          jsonb_build_object('label', 'x > 1', 'value', 'gt_1')
        )
      ),
      jsonb_build_object(
        'type', 'multiple_choice',
        'correctAnswer', 'between_1_5',
        'maxScore', 20
      ),
      array['inequalities', 'distance'],
      'focus'
    ),
    (
      v_node_inequality_remediation,
      v_version_id,
      'inequality-remediation',
      'worked_example',
      'Interpreting |x-3| < 2',
      jsonb_build_object(
        'prompt', '|x-3| < 2 means the distance from 3 is less than 2.',
        'workedSteps', jsonb_build_array(
          'Being less than 2 away from 3 means x stays between 1 and 5.',
          'So the solution is 1 < x < 5.',
          'This is a between-values interval, not two outside regions.'
        ),
        'ctaLabel', 'Continue to the boss'
      ),
      null,
      array['inequalities', 'distance'],
      'support'
    ),
    (
      v_node_boss,
      v_version_id,
      'boss',
      'question',
      'Boss: graph and solve',
      jsonb_build_object(
        'prompt', 'Sketch the graph of y = |2x - 4| and hence solve the equation |2x - 4| = 2.',
        'body', 'Choose the option that correctly identifies both the graph and the solutions.',
        'choices', jsonb_build_array(
          jsonb_build_object('label', 'V-shaped graph with vertex at (2,0), and the equation has solutions x = 1 and x = 3.', 'value', 'boss_correct'),
          jsonb_build_object('label', 'V-shaped graph with vertex at (0,0), and the equation has solutions x = -1 and x = 1.', 'value', 'boss_origin'),
          jsonb_build_object('label', 'Straight line graph, and the equation has solution x = 3 only.', 'value', 'boss_line'),
          jsonb_build_object('label', 'V-shaped graph with vertex at (2,0), and the equation has solutions x = 2 and x = 4.', 'value', 'boss_wrong_roots')
        )
      ),
      jsonb_build_object(
        'type', 'multiple_choice',
        'correctAnswer', 'boss_correct',
        'maxScore', 25
      ),
      array['boss', 'graphs', 'equations'],
      'boss'
    ),
    (
      v_node_completion,
      v_version_id,
      'completion',
      'checkpoint',
      'Lesson complete',
      jsonb_build_object(
        'prompt', 'You defeated the first modulus boss.',
        'body', 'You used modulus as distance, recognised the graph of y = |x|, tracked the shift in y = |x-a|, and solved simple equations and inequalities.',
        'ctaLabel', 'Complete lesson'
      ),
      null,
      array['summary', 'modulus'],
      'focus'
    ),
    (
      v_node_boss_remediation,
      v_version_id,
      'boss-remediation',
      'worked_example',
      'Boss review',
      jsonb_build_object(
        'prompt', '|2x - 4| = |2(x - 2)| = 2|x - 2|, so the graph is still V-shaped with vertex at (2,0).',
        'workedSteps', jsonb_build_array(
          'To solve |2x - 4| = 2, set 2x - 4 = 2 or 2x - 4 = -2.',
          'From 2x - 4 = 2, we get x = 3.',
          'From 2x - 4 = -2, we get x = 1.'
        ),
        'ctaLabel', 'Finish the lesson'
      ),
      null,
      array['boss', 'review'],
      'support'
    )
  on conflict (id) do update set
    title = excluded.title,
    content_json = excluded.content_json,
    scoring_json = excluded.scoring_json,
    mastery_tags = excluded.mastery_tags,
    layout_type = excluded.layout_type;

  update public.unit_versions
  set entry_node_id = v_node_intro
  where id = v_version_id;

  delete from public.node_transitions
  where from_node_id in (
    v_node_intro,
    v_node_basic_check,
    v_node_basic_remediation,
    v_node_graph_check,
    v_node_graph_remediation,
    v_node_transform_check,
    v_node_transform_remediation,
    v_node_inequality_check,
    v_node_inequality_remediation,
    v_node_boss,
    v_node_completion,
    v_node_boss_remediation
  );

  insert into public.node_transitions (from_node_id, to_node_id, condition_type, condition_json, priority_order)
  values
    (v_node_intro, v_node_basic_check, 'always', jsonb_build_object('min_attempt_number', 1), 10),
    (v_node_basic_check, v_node_graph_check, 'correct', jsonb_build_object('min_attempt_number', 1), 10),
    (v_node_basic_check, v_node_basic_remediation, 'incorrect', jsonb_build_object('min_attempt_number', 1), 20),
    (v_node_basic_remediation, v_node_graph_check, 'always', jsonb_build_object('min_attempt_number', 1), 10),
    (v_node_graph_check, v_node_transform_check, 'correct', jsonb_build_object('min_attempt_number', 1), 10),
    (v_node_graph_check, v_node_graph_remediation, 'incorrect', jsonb_build_object('min_attempt_number', 1), 20),
    (v_node_graph_remediation, v_node_transform_check, 'always', jsonb_build_object('min_attempt_number', 1), 10),
    (v_node_transform_check, v_node_inequality_check, 'correct', jsonb_build_object('min_attempt_number', 1), 10),
    (v_node_transform_check, v_node_transform_remediation, 'incorrect', jsonb_build_object('min_attempt_number', 1), 20),
    (v_node_transform_remediation, v_node_inequality_check, 'always', jsonb_build_object('min_attempt_number', 1), 10),
    (v_node_inequality_check, v_node_boss, 'correct', jsonb_build_object('min_attempt_number', 1), 10),
    (v_node_inequality_check, v_node_inequality_remediation, 'incorrect', jsonb_build_object('min_attempt_number', 1), 20),
    (v_node_inequality_remediation, v_node_boss, 'always', jsonb_build_object('min_attempt_number', 1), 10),
    (v_node_boss, v_node_completion, 'correct', jsonb_build_object('min_attempt_number', 1), 10),
    (v_node_boss, v_node_boss_remediation, 'incorrect', jsonb_build_object('min_attempt_number', 1), 20),
    (v_node_boss_remediation, v_node_completion, 'always', jsonb_build_object('min_attempt_number', 1), 10);

  insert into public.assignments (id, class_id, unit_version_id, assigned_by, open_at, due_at, is_live)
  values (
    v_assignment_id,
    v_class_id,
    v_version_id,
    v_teacher_id,
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
    (v_assignment_id, v_student_a, v_node_intro, 'in_progress', 0, timezone('utc', now()) - interval '30 minute', null),
    (v_assignment_id, v_student_b, v_node_graph_remediation, 'in_progress', 15, timezone('utc', now()) - interval '12 minute', null),
    (v_assignment_id, v_student_c, v_node_boss, 'in_progress', 65, timezone('utc', now()) - interval '5 minute', null)
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
      v_student_b,
      v_assignment_id,
      v_node_basic_check,
      1,
      jsonb_build_object('value', 'positive_only'),
      false,
      null,
      0,
      32,
      timezone('utc', now()) - interval '16 minute'
    ),
    (
      v_student_b,
      v_assignment_id,
      v_node_graph_check,
      1,
      jsonb_build_object('value', 'shifted_up'),
      false,
      null,
      0,
      29,
      timezone('utc', now()) - interval '13 minute'
    ),
    (
      v_student_c,
      v_assignment_id,
      v_node_basic_check,
      1,
      jsonb_build_object('value', 'pm_4'),
      true,
      null,
      15,
      20,
      timezone('utc', now()) - interval '20 minute'
    ),
    (
      v_student_c,
      v_assignment_id,
      v_node_graph_check,
      1,
      jsonb_build_object('value', 'v_origin'),
      true,
      null,
      15,
      24,
      timezone('utc', now()) - interval '18 minute'
    ),
    (
      v_student_c,
      v_assignment_id,
      v_node_transform_check,
      1,
      jsonb_build_object('value', 'right_2'),
      true,
      null,
      15,
      22,
      timezone('utc', now()) - interval '15 minute'
    ),
    (
      v_student_c,
      v_assignment_id,
      v_node_inequality_check,
      1,
      jsonb_build_object('value', 'between_1_5'),
      true,
      null,
      20,
      26,
      timezone('utc', now()) - interval '10 minute'
    );

  insert into public.student_progress_events (student_id, assignment_id, event_type, event_payload_json, created_at)
  values
    (v_student_b, v_assignment_id, 'entered_node', jsonb_build_object('node_id', v_node_basic_check), timezone('utc', now()) - interval '16 minute'),
    (v_student_b, v_assignment_id, 'submitted_answer', jsonb_build_object('node_id', v_node_basic_check, 'attempt_number', 1, 'is_correct', false), timezone('utc', now()) - interval '16 minute'),
    (v_student_b, v_assignment_id, 'branched_to_remediation', jsonb_build_object('from_node_id', v_node_basic_check, 'to_node_id', v_node_basic_remediation), timezone('utc', now()) - interval '16 minute'),
    (v_student_b, v_assignment_id, 'advanced', jsonb_build_object('from_node_id', v_node_basic_remediation, 'to_node_id', v_node_graph_check), timezone('utc', now()) - interval '15 minute'),
    (v_student_b, v_assignment_id, 'submitted_answer', jsonb_build_object('node_id', v_node_graph_check, 'attempt_number', 1, 'is_correct', false), timezone('utc', now()) - interval '13 minute'),
    (v_student_b, v_assignment_id, 'branched_to_remediation', jsonb_build_object('from_node_id', v_node_graph_check, 'to_node_id', v_node_graph_remediation), timezone('utc', now()) - interval '13 minute'),
    (v_student_c, v_assignment_id, 'submitted_answer', jsonb_build_object('node_id', v_node_basic_check, 'attempt_number', 1, 'is_correct', true), timezone('utc', now()) - interval '20 minute'),
    (v_student_c, v_assignment_id, 'advanced', jsonb_build_object('from_node_id', v_node_basic_check, 'to_node_id', v_node_graph_check), timezone('utc', now()) - interval '20 minute'),
    (v_student_c, v_assignment_id, 'submitted_answer', jsonb_build_object('node_id', v_node_graph_check, 'attempt_number', 1, 'is_correct', true), timezone('utc', now()) - interval '18 minute'),
    (v_student_c, v_assignment_id, 'advanced', jsonb_build_object('from_node_id', v_node_graph_check, 'to_node_id', v_node_transform_check), timezone('utc', now()) - interval '18 minute'),
    (v_student_c, v_assignment_id, 'submitted_answer', jsonb_build_object('node_id', v_node_transform_check, 'attempt_number', 1, 'is_correct', true), timezone('utc', now()) - interval '15 minute'),
    (v_student_c, v_assignment_id, 'advanced', jsonb_build_object('from_node_id', v_node_transform_check, 'to_node_id', v_node_inequality_check), timezone('utc', now()) - interval '15 minute'),
    (v_student_c, v_assignment_id, 'submitted_answer', jsonb_build_object('node_id', v_node_inequality_check, 'attempt_number', 1, 'is_correct', true), timezone('utc', now()) - interval '10 minute'),
    (v_student_c, v_assignment_id, 'advanced', jsonb_build_object('from_node_id', v_node_inequality_check, 'to_node_id', v_node_boss), timezone('utc', now()) - interval '10 minute');
end
$$;
