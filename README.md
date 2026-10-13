# AFSR Math — 적응형 수학 학습 플랫폼

초등학생의 사칙연산 계산 능력과 수학적 사고력의 기초를 기르는 적응형 학습 웹 애플리케이션.

**AFSR** = Adaptive Fluency, Strategy & Retention. 본 프로젝트에서 정의한 학습 설계 모델이며,
독립적으로 효과가 검증된 기존 교육 프로그램 명칭이 아닙니다.

## 핵심 원칙

- **정확한 계산 → 유창성 → 전략 선택 → 개념 이해 → 전이 → 장기 유지**의 학습 구조를 소프트웨어로 구현
- 적응형 가중치·임계값은 **초기 설계 가설**이며 과학적으로 검증된 값이 아님을 UI와 문서에 명시 (설정 > 적응형 알고리즘 안내)
- 단순히 많이·빨리 푸는 것을 성공으로 판단하지 않음 (경쟁·순위 비교 없음)
- Security by Design: 서버 측 채점, RLS, 최소 권한

## 기술 스택

Nuxt 4 · Vue 3 · TypeScript · Tailwind CSS · Supabase PostgreSQL · Supabase Auth ·
Nuxt Server Routes · IndexedDB(예정)/localStorage · Zod · Vitest · Playwright · Vercel

## 로컬 실행 방법

```bash
# 1. 의존성 설치 (Node 20+)
npm install

# 2. 개발 서버
npm run dev
# → http://localhost:3000

# 3. 단위 테스트
npm test

# 4. 타입체크
npx nuxt typecheck

# 5. E2E 테스트 (Chromium 필요)
npx playwright install chromium
npm run test:e2e

# 6. 프로덕션 빌드
npm run build
```

환경변수는 `.env.example`을 복사해 `.env`로 사용하세요. 로컬 MVP 모드에서는 Supabase 없이 동작합니다.

## 프로젝트 구조

```
afsr-math/
├── app/                      # Nuxt 앱 (pages, components, composables, assets)
│   ├── pages/                # 홈/모드선택/집중훈련/맞춤학습/사고훈련/오답노트/대시보드/설정
│   ├── components/           # ProblemCard, SessionSummary, StatCard
│   └── composables/          # useLocalStore (로컬 저장소), useProblemSession (세션 러너)
├── server/
│   ├── api/                  # problems.post (서버 출제), attempts.post (서버 채점)
│   └── utils/                # problem-store (정답 보관), rate-limit
├── lib/                   # 프레임워크 독립 순수 TS 모듈
│   ├── types.ts              # 공유 타입
│   ├── policy.ts             # 학습 정책 (가중치·임계값·간격 — 설정 가능)
│   ├── generator/            # 문제 생성 엔진, 난이도 판정, 시드 RNG
│   ├── skills/               # Skill Knowledge Graph, 스킬→출제 매핑
│   ├── adaptive/             # 적응형 엔진, 숙달도, 간격 복습, 오답 분석
│   ├── thinking/             # 수학적 사고 훈련 템플릿
│   └── validation.ts         # Zod 스키마 (클라이언트·서버 공유)
├── supabase/migrations/      # PostgreSQL 스키마 + RLS 정책
├── tests/unit/               # Vitest 단위 테스트 (79개)
├── tests/e2e/                # Playwright E2E
└── docs/                     # 아키텍처/알고리즘/보안/배포/비용 문서
```

## 학습 모드

1. **집중 연산 훈련** (`/drill`) — 연산·자릿수·난이도·받아올림·문제 수·시간 측정·음수·나머지 직접 설정
2. **맞춤 학습** (`/adaptive`) — 진단 → 취약 분석 → 맞춤 출제 → 오답 교정 → 간격 복습 → 재평가
3. **수학적 사고 훈련** (`/thinking`) — 10 만들기·미지수 찾기·분배법칙·보수 활용

## 보안 요약

- 정답은 서버가 생성·보관하고 `/api/attempts`에서만 채점 (클라이언트의 isCorrect/score 신뢰 안 함)
- 답안 중복 제출 방지, 출제되지 않은 문제의 채점 요청 거부
- Zod 입력 검증, Rate Limiting, 보안 헤더
- Supabase RLS: 본인 데이터만 접근, 보호자는 승인된 학생만 읽기
- 실명·학교명·생년월일·위치정보 미수집

자세한 내용은 `docs/` 폴더를 참고하세요.
