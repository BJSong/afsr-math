# 보안 아키텍처

## 1. 기본 원칙

- 브라우저는 신뢰하지 않는 환경으로 취급
- 서버 측 인증·권한 검증, 최소 권한 원칙, 사용자별 데이터 격리
- 중요 학습 결과(정답 여부·점수·숙달도)는 서버에서 계산·검증
- 개인정보 최소 수집: 실명·학교명·생년월일·위치정보 미수집

## 2. 서버 측 채점 (구현됨)

- `POST /api/problems`: 문제를 생성하되 **정답을 제거**하고 반환. 정답은 서버 보관소에만 저장.
- `POST /api/attempts`: `{ questionId, userAnswer, durationMs }`만 받음.
  `isCorrect`/`score`/`masteryLevel`/`userId`/`reviewDueAt` 등 클라이언트 값은 받지 않음.
- 출제 기록이 없는 `questionId`의 채점 요청 → 404 거부 (문제 세션 검증)
- 이미 채점된 문제의 중복 제출 → 재집계 없이 이전 결과 반환 (중복 방지)
- 학습 기록 저장은 한 번의 로컬 저장으로 원자적 처리 (클라우드 전환 시 DB 트랜잭션)

## 3. 인증 (Phase 3 — Supabase Auth)

- Supabase Auth 이메일 인증, 세션 관리, 로그아웃, 계정 복구
- 공식 SSR 인증 방식(`@supabase/ssr`) 우선 — 쿠키 기반 세션
- 로그인 요청 속도 제한, 관리자 MFA (Supabase 대시보드 설정)
- MVP(local 모드)에서는 인증 없이 로컬 프로필만 사용 — **클라우드 전환 전 필수**

## 4. RLS (마이그레이션 준비됨)

`supabase/migrations/202610130002_rls.sql`:
- 모든 사용자 데이터 테이블: `USING (auth.uid() = user_id)` + `WITH CHECK (auth.uid() = user_id)`
- SELECT/INSERT/UPDATE/DELETE 각각 정책 분리, UPDATE는 USING+WITH CHECK 동시 확인
- 비인증 차단: `TO authenticated` + uid 비교
- 보호자: `guardian_student_links.status='approved'`인 학생의 attempts/progress/sessions만 SELECT
- 관리자: JWT `app_metadata.claims_admin` 클레임으로 별도 검증
- `SECURITY DEFINER`는 회원가입 프로필 생성 트리거 1곳만 사용 (search_path 고정)
- `skills`/`skill_prerequisites`는 인증 사용자 읽기 전용, 쓰기는 관리자만

## 5. API 보안 (구현됨)

- Zod 입력 검증 (자릿수 1–4, 문제 수 1–200, 답안 범위, 풀이 시간 상한)
- Rate Limiting: `/api/problems` 분당 60회, `/api/attempts` 분당 120회 (IP 기준)
  - ⚠ 현재 인메모리 구현은 단일 인스턴스용. Vercel 운영 시 Upstash Redis로 교체 (docs/DEPLOYMENT.md)
- 안전한 오류 처리: 내부 스택 노출 없음, 검증 실패는 400/422로 정규화
- IDOR 방어: questionId는 서버 출제 기록과 대조, userId를 클라이언트에서 받지 않음
- XSS: Vue 템플릿 이스케이프 + CSP 헤더
- SQL Injection: Supabase 클라이언트/파라미터 바인딩만 사용 (문자열拼接 SQL 없음)

## 6. 비밀정보 관리

- `service_role` 키는 서버 전용 (`runtimeConfig.supabaseServiceRoleKey`), 클라이언트 번들 노출 금지
- Vercel 환경변수 사용, `.env` Git 커밋 금지 (`.gitignore` + `.env.example`)
- 토큰·세션 로그 출력 금지
- 비밀키 회전: Supabase 대시보드에서 롤링 후 Vercel 환경변수 업데이트·재배포

## 7. 웹 보안 헤더 (nuxt.config + vercel.json)

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: 카메라/마이크/위치 차단`
- `Content-Security-Policy`: self 중심 (운영에서 외부 리소스 확정 후 강화)
- HTTPS: Vercel 기본 제공. HSTS는 Vercel이 자동 처리.

## 8. 미성년자 개인정보 보호

- 실명·학교명 수집 금지 (닉네임만, 설정 화면에 명시)
- 생년월일·위치정보 수집 금지
- 공개 프로필 없음
- 데이터 내보내기(JSON)·전체 삭제(탈퇴相当) 설정 화면에 제공
- 한국 개인정보 보호법·법정대리인 동의 절차는 실제 서비스 출시 전 검토 필요
