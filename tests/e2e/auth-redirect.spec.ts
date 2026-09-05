import { test, expect } from '@playwright/test'

// Deterministic, local-only: no real email involved. Opts out of the
// default authenticated storageState (see playwright.config.ts) since
// these specifically test the signed-out experience.
test.use({ storageState: { cookies: [], origins: [] } })

test('an unauthenticated visitor hitting a protected route directly is redirected to sign in', async ({ page }) => {
  await page.goto('/groceries')
  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  // The protected page's content must never have rendered, even momentarily.
  await expect(page.getByRole('heading', { name: 'Groceries', exact: true })).not.toBeVisible()
})

test('the landing page remains reachable while signed out', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /split groceries fairly/i })).toBeVisible()
})

test('the landing CTA sends a signed-out visitor to sign-up, not straight into the app', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start splitting fairly' }).click()
  await expect(page).toHaveURL(/\/sign-up$/)
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
})
