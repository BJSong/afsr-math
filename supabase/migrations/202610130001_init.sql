-- AFSR Math 초기 스키마 (명세 12)
-- Supabase PostgreSQL. 모든 변경은 마이그레이션으로 관리한다.

-- ── 프로필 (auth.users 1:1) ─────────────────────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '수학 탐험가' check (char_length(nickname) between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 스킬 그래프 (정적 데이터, shared/skills/skill-graph.ts와 동기화) ──
create table skills (
  skill_id text primary key,
  name text not null,
  description text not null default '',
  operation text not null check (operation in ('add','sub','mul','div','thinking')),
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  assessment_rules text not null default ''
);

create table skill_prerequisites (
  skill_id text not null references skills(skill_id) on delete cascade,
  prerequisite_skill_id text not null references skills(skill_id) on delete cascade,
  primary key (skill_id, prerequisite_skill_id),
  check (skill_id <> prerequisite_skill_id)
);

-- ── 출제된 문제 (서버가 생성, 정답 포함 — 클라이언트 직접 조회 금지) ──
create table questions (
  question_id text primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  skill_id text not null references skills(skill_id),
  operator text not null check (operator in ('add','sub','mul','div')),
  operands integer[] not null check (array_length(operands, 1) between 2 and 3),
  answer integer not null,
  remainder integer,
  operand_digits integer[] not null,
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  concept_tags text[] not null default '{}',
  strategy_tags text[] not null default '{}',
  prompt text not null,
  hint text,
  generated_at timestamptz not null default now()
);
create index idx_questions_user_skill on questions(user_id, skill_id);

-- ── 서버 측 채점 세션 (답안 중복 제출 방지, TTL은 주기적 정리) ──
create table question_sessions (
  question_id text primary key references questions(question_id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  graded boolean not null default false,
  issued_at timestamptz not null default now()
);
create index idx_qsessions_user_issued on question_sessions(user_id, issued_at);

-- ── 학습 세션 ───────────────────────────────────────────
create table learning_sessions (
  session_id text primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  mode text not null check (mode in ('drill','adaptive','thinking')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index idx_sessions_user_started on learning_sessions(user_id, started_at desc);

-- ── 답안 시도 (서버가 is_correct를 계산 — 클라이언트 값 신뢰 금지) ──
create table question_attempts (
  attempt_id text primary key,
  session_id text references learning_sessions(session_id) on delete set null,
  user_id uuid not null references profiles(id) on delete cascade,
  question_id text not null references questions(question_id) on delete cascade,
  skill_id text not null references skills(skill_id),
  user_answer integer,
  correct_answer integer not null,
  is_correct boolean not null,
  duration_ms integer not null check (duration_ms >= 0 and duration_ms <= 3600000),
  error_types jsonb not null default '[]',
  attempted_at timestamptz not null default now(),
  -- 같은 문제의 중복 채점 방지
  unique (question_id, user_id)
);
create index idx_attempts_user_skill on question_attempts(user_id, skill_id, attempted_at desc);
create index idx_attempts_user_time on question_attempts(user_id, attempted_at desc);

-- ── 스킬별 학습 상태 (명세 8.1) ─────────────────────────
create table skill_progress (
  user_id uuid not null references profiles(id) on delete cascade,
  skill_id text not null references skills(skill_id),
  attempts integer not null default 0 check (attempts >= 0),
  correct integer not null default 0 check (correct >= 0),
  recent_results boolean[] not null default '{}',
  recent_durations_ms integer[] not null default '{}',
  median_duration_ms integer,
  error_history jsonb not null default '[]',
  concept_understood boolean not null default false,
  strategy_understood boolean not null default false,
  transfer_attempted boolean not null default false,
  transfer_solved boolean not null default false,
  last_learned_at timestamptz,
  next_review_at timestamptz,
  review_interval_index integer not null default 0 check (review_interval_index >= 0),
  mastery text not null default 'new'
    check (mastery in ('new','learning','practicing','provisional_mastery','retained')),
  primary key (user_id, skill_id),
  check (correct <= attempts)
);
create index idx_progress_review on skill_progress(user_id, next_review_at) where next_review_at is not null;

-- ── 복습 일정 로그 ─────────────────────────────────────
create table review_schedules (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  skill_id text not null references skills(skill_id),
  scheduled_for timestamptz not null,
  completed_at timestamptz,
  success boolean
);
create index idx_reviews_user_scheduled on review_schedules(user_id, scheduled_for);

-- ── 사용자 설정 ────────────────────────────────────────
create table user_settings (
  user_id uuid primary key references profiles(id) on delete cascade,
  default_minutes integer not null default 10 check (default_minutes between 5 and 60),
  sound_on boolean not null default false,
  timer_on boolean not null default true,
  understood_experimental boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ── 보호자-학생 연결 (명세 12, 선택 테이블) ──────────────
create table guardian_student_links (
  guardian_id uuid not null references profiles(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','revoked')),
  created_at timestamptz not null default now(),
  primary key (guardian_id, student_id),
  check (guardian_id <> student_id)
);

-- ── 보안 감사 로그 ─────────────────────────────────────
create table audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id) on delete set null,
  action text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index idx_audit_user_time on audit_logs(user_id, created_at desc);

-- ── updated_at 자동 갱신 ────────────────────────────────
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_profiles_touch before update on profiles
  for each row execute function touch_updated_at();
create trigger trg_settings_touch before update on user_settings
  for each row execute function touch_updated_at();
