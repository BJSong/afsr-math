<template>
  <div>
    <h1 class="mb-6 text-2xl font-extrabold">학습 모드 선택</h1>
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="card">
        <p class="text-4xl">🎯</p>
        <h2 class="mt-3 text-xl font-extrabold">집중 연산 훈련</h2>
        <p class="mt-2 text-sm leading-relaxed text-slate-600">
          연산, 자릿수, 난이도, 받아올림 여부, 문제 수, 시간 측정 등을 직접 설정하고
          원하는 유형만 집중적으로 연습합니다.
        </p>
        <NuxtLink to="/drill" class="btn-primary mt-4 w-full">시작하기</NuxtLink>
      </div>
      <div class="card">
        <p class="text-4xl">🧠</p>
        <h2 class="mt-3 text-xl font-extrabold">맞춤 학습</h2>
        <p class="mt-2 text-sm leading-relaxed text-slate-600">
          진단 → 취약 유형 분석 → 맞춤 출제 → 오답 교정 → 변형 문제 → 간격 복습 →
          재평가의 순서로 AI가 학습을 설계합니다.
        </p>
        <NuxtLink to="/adaptive" class="btn-primary mt-4 w-full">시작하기</NuxtLink>
      </div>
      <div class="card">
        <p class="text-4xl">💡</p>
        <h2 class="mt-3 text-xl font-extrabold">수학적 사고 훈련</h2>
        <p class="mt-2 text-sm leading-relaxed text-slate-600">
          10 만들기, 수 분해, 보수 활용, 분배법칙, 미지수 찾기 등
          효율적인 계산 전략과 수학적 관계를 익힙니다.
        </p>
        <NuxtLink to="/thinking" class="btn-primary mt-4 w-full">시작하기</NuxtLink>
      </div>
    </div>
    <div class="card mt-6">
      <h3 class="font-extrabold">📝 오답 노트</h3>
      <p class="mt-1 text-sm text-slate-600">틀린 문제를 모아서 다시 풀어보고, 오류 패턴을 확인하세요.</p>
      <NuxtLink to="/review" class="btn-secondary mt-3">오답 노트 열기</NuxtLink>
    </div>
  </div>
</template>
