import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test('sign-in and sign-up forms are usable at mobile width', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'covers only the mobile viewport; desktop is covered by the other auth specs')

  await page.goto('/sign-in')
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()

  const viewportWidth = page.viewportSize()?.width ?? 0
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1)

  await page.getByRole('link', { name: 'Create an account' }).click()
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
})
