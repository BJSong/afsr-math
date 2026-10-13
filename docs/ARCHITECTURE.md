# 아키텍처

## 레이어 분리

```
┌─────────────────────────────────────────┐
│  app/ (UI)                              │  Vue 3 SFC, Tailwind
│  - pages / components                   │  비즈니스 로직 없음
│  - composables (useProblemSession,      │  세션 흐름 + 로컬 저장소
│    useLocalStore)                       │
├─────────────────────────────────────────┤
│  server/api (Backend API)               │  Nuxt Server Routes
│  - problems.post → 문제 생성 (서버)      │  Zod 검증 → 생성 → 정답 보관
│  - attempts.post → 답안 채점 (서버)      │  Zod 검증 → 서버 정답과 비교
├─────────────────────────────────────────┤
│  lib/ (도메인 로직, 프레임워크 독립)  │
│  - generator/   문제 생성 엔진           │
│  - skills/      Skill Knowledge Graph   │
│  - adaptive/    적응형 알고리즘          │
│  - thinking/    사고 훈련 템플릿         │
│  - policy.ts    설정 가능한 학습 정책    │
├─────────────────────────────────────────┤
│  데이터 저장소                          │
│  - MVP: localStorage (IndexedDB 전환 예정)│
│  - 운영: Supabase PostgreSQL + RLS      │
└─────────────────────────────────────────┘
```

## 핵심 설계 결정

1. **문제 생성 엔진 독립**: `lib/generator`는 DOM·서버에 의존하지 않는 순수 함수.
   시드 기반 RNG로 테스트 재현 가능. 서버 라우트와 클라이언트 모두에서 import 가능.
2. **적응형 알고리즘 독립**: `lib/adaptive`는 정책(`AdaptivePolicy`)을 주입받아 동작.
   가중치·임계값 변경이 코드 수정 없이 가능.
3. **데이터 저장소 추상화**: MVP는 `useLocalStore`의 함수 단위(localStorage).
   Supabase 전환 시 동일 함수 시그니처의 어댑터로 교체. 스키마는 `supabase/migrations`에 준비됨.
4. **서버 측 채점**: `problems.post`는 정답을 제거하고 반환, 정답은 서버 보관소(`problem-store`)에만 저장.
   `attempts.post`는 보관된 정답과 직접 비교. 클라이언트가 보낸 점수·정오 여부는 무시.
5. **Skill Graph 정적 관리**: 초기에는 `lib/skills/skill-graph.ts` + `supabase` `skills` 테이블에
   동일한 데이터를 seed. 순환 참조는 `validateSkillGraph()`로 앱 시작 시 검증.

## 데이터 흐름 (문제 풀이 1회)

```
클라이언트 → POST /api/problems (Zod 검증) → generateProblemSet()
  → issueQuestions() (정답 서버 보관) → 정답 제거 후 반환
클라이언트 → 사용자 입력 → POST /api/attempts { questionId, userAnswer, durationMs }
  → getQuestion() (출제 기록 확인, 중복 채점 방지)
  → 서버 정답과 비교 → classifyError() → 결과 반환
클라이언트 → recordAttempt() (로컬 저장 + 숙달도 갱신 + 복습 일정)
```

## 확장 포인트

- 새 연산/개념: `SKILLS`에 행 추가 + `skillToRequest` 매핑 추가 (엔진 수정 불필요)
- 새 사고 템플릿: `lib/thinking/problems.ts`에 함수 추가
- 난이도 기준 변경: `lib/policy.ts` → `difficultyThresholds`
- 클라우드 전환: `NUXT_PUBLIC_APP_MODE=cloud` + Supabase 어댑터 (스키마·RLS 준비됨)
