-- AFSR Math RLS 정책 (명세 13.3)
--
-- 검증 항목:
--  1. 사용자는 자신의 데이터만 조회 (SELECT ... USING (auth.uid() = user_id))
--  2. 다른 사용자 데이터 수정 불가 (UPDATE/DELETE에도 USING 적용)
--  3. 임의 userId 변경으로 권한 상승 불가 (INSERT/UPDATE의 WITH CHECK)
--  4. 비인증 사용자 접근 차단 (TO authenticated + auth.uid() IS NOT NULL)
--  5. 보호자는 명시적으로 승인된 학생만 조회 (guardian_student_links.status='approved')
--  6. 관리자 권한 별도 검증 (app_metadata.claims_admin — Supabase 대시보드에서 부여)
--
-- 주의: SECURITY DEFINER 함수는 RLS 우회 위험이 있어 최소 사용.
-- 아래 프로필 자동 생성 트리거 하나만 사용하며, search_path를 고정한다.

-- ── RLS 활성화 ─────────────────────────────────────────
alter table profiles enable row level security;
alter table skills enable row level security;
alter table skill_prerequisites enable row level security;
alter table questions enable row level security;
alter table question_sessions enable row level security;
alter table learning_sessions enable row level security;
alter table question_attempts enable row level security;
alter table skill_progress enable row level security;
alter table review_schedules enable row level security;
alter table user_settings enable row level security;
alter table guardian_student_links enable row level security;
alter table audit_logs enable row level security;

-- ── 헬퍼: 관리자 여부 (JWT app_metadata) ─────────────────
create or replace function is_admin()
returns boolean language sql stable
set search_path = public as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'claims_admin')::boolean, false)
$$;

-- ── profiles ───────────────────────────────────────────
create policy p_profiles_select on profiles for select to authenticated
  using (id = auth.uid() or is_admin());
create policy p_profiles_insert on profiles for insert to authenticated
  with check (id = auth.uid());
create policy p_profiles_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- 탈퇴: 본인만 삭제 가능 (CASCADE로 하위 데이터 함께 삭제)
create policy p_profiles_delete on profiles for delete to authenticated
  using (id = auth.uid());

-- ── skills / skill_prerequisites: 인증 사용자 읽기 전용 ──
create policy p_skills_select on skills for select to authenticated using (true);
create policy p_skillprereq_select on skill_prerequisites for select to authenticated using (true);
-- 쓰기는 관리자만 (서비스 롤이 아닌 JWT 관리자 클레임 경유)
create policy p_skills_admin_write on skills for all to authenticated
  using (is_admin()) with check (is_admin());
create policy p_skillprereq_admin_write on skill_prerequisites for all to authenticated
  using (is_admin()) with check (is_admin());

-- ── 사용자 데이터 테이블 공통 패턴 ───────────────────────
-- questions: 정답 포함 — 본인만 접근
create policy p_questions_all on questions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy p_qsessions_all on question_sessions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy p_sessions_all on learning_sessions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy p_attempts_all on question_attempts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy p_progress_all on skill_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy p_reviews_all on review_schedules for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy p_settings_all on user_settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── guardian_student_links ─────────────────────────────
-- 보호자: 승인된 링크의 학생 학습 데이터 읽기 전용 뷰용
create policy p_links_select on guardian_student_links for select to authenticated
  using (guardian_id = auth.uid() or student_id = auth.uid() or is_admin());
create policy p_links_insert on guardian_student_links for insert to authenticated
  with check (guardian_id = auth.uid() and status = 'pending');
create policy p_links_update on guardian_student_links for update to authenticated
  using (student_id = auth.uid() or is_admin())
  with check (student_id = auth.uid() or is_admin());

-- 승인된 보호자의 학생 데이터 읽기 (각 테이블에 추가 SELECT 정책)
create policy p_attempts_guardian on question_attempts for select to authenticated
  using (exists (
    select 1 from guardian_student_links g
    where g.guardian_id = auth.uid()
      and g.student_id = question_attempts.user_id
      and g.status = 'approved'
  ));
create policy p_progress_guardian on skill_progress for select to authenticated
  using (exists (
    select 1 from guardian_student_links g
    where g.guardian_id = auth.uid()
      and g.student_id = skill_progress.user_id
      and g.status = 'approved'
  ));
create policy p_sessions_guardian on learning_sessions for select to authenticated
  using (exists (
    select 1 from guardian_student_links g
    where g.guardian_id = auth.uid()
      and g.student_id = learning_sessions.user_id
      and g.status = 'approved'
  ));

-- ── audit_logs: 쓰기는 서버(서비스 롤)만, 읽기는 관리자만 ──
-- (PostgREST 경유 직접 쓰기 차단 — 서버에서 service_role로 기록)
create policy p_audit_admin_select on audit_logs for select to authenticated
  using (is_admin());

-- ── 회원가입 시 프로필 자동 생성 ─────────────────────────
-- 표준 Supabase 패턴. SECURITY DEFINER이지만 search_path 고정 + 최소 권한.
create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nickname', '수학 탐험가'));
  insert into public.user_settings (user_id) values (new.id);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
