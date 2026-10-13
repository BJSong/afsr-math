import { test, expect } from '@playwright/test'

test('홈 대시보드가 로드된다', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('AFSR Math').first()).toBeVisible()
  await expect(page.getByText('집중 연산 훈련')).toBeVisible()
})

test('집중 연산 훈련: 설정 → 풀이 → 채점 흐름', async ({ page }) => {
  await page.goto('/drill')
  await page.getByRole('button', { name: '학습 시작하기' }).click()
  // 문제 카드가 나타날 때까지 대기 (서버에서 문제 생성)
  await expect(page.getByPlaceholder('답을 입력하세요')).toBeVisible({ timeout: 20000 })
  await page.getByPlaceholder('답을 입력하세요').fill('1')
  await page.getByRole('button', { name: /제출/ }).click()
  // 서버 측 채점 후 피드백 표시
  await expect(page.getByRole('button', { name: /다음 문제|결과 보기/ })).toBeVisible({ timeout: 10000 })
})

test('모바일 화면에서 풀이가 가능하다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/drill')
  await page.getByRole('button', { name: '학습 시작하기' }).click()
  await expect(page.getByPlaceholder('답을 입력하세요')).toBeVisible({ timeout: 20000 })
})
