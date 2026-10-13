<template>
  <div class="min-h-screen">
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <NuxtLink to="/" class="flex items-center gap-2 text-xl font-extrabold text-indigo-700">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">∑</span>
          AFSR Math
        </NuxtLink>
        <nav class="flex items-center gap-1 text-sm font-semibold text-slate-600">
          <NuxtLink to="/" class="rounded-lg px-3 py-2 hover:bg-slate-100">홈</NuxtLink>
          <NuxtLink to="/modes" class="rounded-lg px-3 py-2 hover:bg-slate-100">학습하기</NuxtLink>
          <NuxtLink to="/review" class="rounded-lg px-3 py-2 hover:bg-slate-100">오답노트</NuxtLink>
          <NuxtLink to="/dashboard" class="rounded-lg px-3 py-2 hover:bg-slate-100">성과</NuxtLink>
          <NuxtLink to="/settings" class="rounded-lg px-3 py-2 hover:bg-slate-100">설정</NuxtLink>
        </nav>
      </div>
    </header>

    <main class="mx-auto max-w-5xl px-4 py-6">
      <NuxtPage />
    </main>

    <footer class="mx-auto max-w-5xl px-4 pb-8 text-center text-xs text-slate-400">
      AFSR Math — 적응형 수학 학습 플랫폼 (MVP) · 학습 데이터는 이 기기에만 저장됩니다
    </footer>
  </div>
</template>
