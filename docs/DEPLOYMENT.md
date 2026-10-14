# 배포 및 운영 가이드

## 1. Vercel 배포

```bash
# Vercel CLI 또는 GitHub 연동
vercel --prod
```

- GitHub 연동 시 main 브랜치 push → 자동 Production 배포, PR → Preview 배포
- 환경변수 분리: Production / Preview / Development
  - `NUXT_PUBLIC_APP_MODE=local` (MVP) → 추후 `cloud`
  - `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_ANON_KEY` (cloud 모드)
  - `NUXT_SUPABASE_SERVICE_ROLE_KEY` (서버 전용 — 절대 클라이언트에 노출 금지)
- `vercel.json`: framework 프리셋(`nuxtjs`)만 지정하는 최소 구성. 보안 헤더는 `nuxt.config.ts`의 nitro routeRules, 실행 모드 기본값(`appMode: 'local'`)은 runtimeConfig에 있음. 과거 vercel.json에 넣었던 `env`·`functions`·`headers`·`outputDirectory`는 Vercel 스키마 검증 실패를 일으켜 제거함 (2026-10-14).

## 2. Supabase 설정 (Phase 3)

> ⚠️ **서버리스 연결 주의 (커넥션 풀러 필수):**
> Supabase 직접 연결(`db.<ref>.supabase.co:5432`)은 IPv6 전용이라
> Vercel 같은 서버리스 환경에서 연결이 실패한다 (2026-10-06 실측: ENETUNREACH).
> Nuxt server routes → 반드시 풀러(`<ref>.pooler.supabase.com:6543`, Session mode) 사용.

1. Supabase 대시보드에서 **개발/운영 프로젝트 분리** 생성
2. SQL Editor 또는 CLI로 마이그레이션 적용:
   ```bash
   npx supabase db push   # supabase/migrations/*.sql
   ```
3. `skills`·`skill_prerequisites` 시드 데이터 삽입
   (`lib/skills/skill-graph.ts`의 SKILLS와 동일한 내용)
4. Auth 설정: 이메일 인증 활성화, 관리자 MFA, `claims_admin` 클레임 부여
5. Storage 불필요 (이미지 미사용)

### cloud 모드 전환 시 남은 작업 (코드)

- [ ] `useLocalStore` → Supabase 어댑터 교체 (동일 함수 시그니처)
- [ ] `server/utils/problem-store.ts` → `question_sessions` 테이블 기반 교체
- [ ] `server/utils/rate-limit.ts` → Upstash Redis 기반 교체
- [ ] `@supabase/ssr` 쿠키 인증 미들웨어 추가
- [ ] IndexedDB 오프라인 캐시 + 동기화 큐 구현

## 3. CI/CD

`.github/workflows/ci.yml`:
1. `npm test` (Vitest 단위 테스트)
2. `npx nuxt typecheck`
3. `npm run build`
4. Playwright E2E (Chromium)

Vercel GitHub 연동과 병행 사용.

## 4. 백업 및 복구

- Supabase: 프로젝트 설정 → Backups. **PITR은 Pro 요금제 이상에서 지원** — 요금제 확인 후 문서화.
- MVP 로컬 모드: 설정 화면의 "데이터 내보내기(JSON)"로 사용자 직접 백업.

## 5. 운영 체크리스트 (출시 전)

- [ ] Supabase Auth + RLS 실제 검증 (보안 테스트 시나리오 실행)
- [ ] Rate Limit Redis 전환
- [ ] CSP 강화 (외부 리소스 확정 후)
- [ ] 개인정보 보호법·법정대리인 동의 절차 검토
- [ ] 에러 모니터링 (Sentry 등) 연동
- [ ] 데이터 보존·삭제 정책 문서화
