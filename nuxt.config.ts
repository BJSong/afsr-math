// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  modules: ['@nuxtjs/tailwindcss'],

  app: {
    head: {
      title: 'AFSR Math — 적응형 수학 학습',
      htmlAttrs: { lang: 'ko' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '초등학생을 위한 적응형 사칙연산 학습 플랫폼' },
      ],
    },
  },

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
  },

  runtimeConfig: {
    // 서버 전용 (절대 브라우저에 노출 금지)
    supabaseServiceRoleKey: '',
    // 공개 (클라이언트 노출 가능)
    public: {
      supabaseUrl: '',
      supabaseAnonKey: '',
      appMode: 'local', // 'local' | 'cloud'
    },
  },

  nitro: {
    routeRules: {
      '/**': {
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
          // CSP는 운영 환경에서 프레임/외부 리소스 정책 확정 후 강화
          'Content-Security-Policy':
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co;",
        },
      },
    },
  },

  typescript: {
    strict: true,
    typeCheck: false, // CI에서는 `nuxt typecheck` 별도 실행
  },
})
