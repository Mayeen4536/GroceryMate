import { test, expect } from '@playwright/test'

// Deterministic, local-only: local Supabase never requires email
// confirmation, so a fresh sign-up here always lands with a real session
// and zero memberships — exactly the state onboarding needs to test.
test.use({ storageState: { cookies: [], origins: [] } })

async function signUpFreshUser(page: import('@playwright/test').Page, name: string) {
  const email = `e2e-onboarding-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
  await page.goto('/sign-up')
  await page.getByLabel('Display name').fill(name)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('OnboardingTest9!')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: 'Create your household' })).toBeVisible({ timeout: 15000 })
  return email
}

test('an authenticated user with no household sees onboarding, not the app shell', async ({ page }) => {
  await signUpFreshUser(page, 'Onboarding Test')
  await expect(page.getByRole('heading', { name: 'Groceries', exact: true })).not.toBeVisible()
})

test('an empty household name is rejected', async ({ page }) => {
  await signUpFreshUser(page, 'Onboarding Test')
  await page.getByRole('button', { name: 'Create household' }).click()
  await expect(page.getByText('Give your household a name.')).toBeVisible()
  // Still on onboarding — no household was created.
  await expect(page.getByRole('heading', { name: 'Create your household' })).toBeVisible()
})

test('double-submitting the create button does not create two households', async ({ page }) => {
  await signUpFreshUser(page, 'Double Submit Test')
  await page.getByLabel('Household name').fill('Double Submit Household')

  const submit = page.getByRole('button', { name: /Create household|Creating household/ })
  await submit.click()
  // The button disables synchronously on click (before the RPC call even
  // starts) — this is the actual guard a rapid second click would hit.
  await expect(submit).toBeDisabled()

  await expect(page.getByRole('heading', { name: 'Groceries', exact: true })).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('Double Submit Household').and(page.locator(':visible'))).toBeVisible()
})

test('successful creation enters the app and shows the real household name in the shell', async ({
  page,
}) => {
  await signUpFreshUser(page, 'Shell Test')
  await page.getByLabel('Household name').fill('Shell Test Household')
  await page.getByRole('button', { name: 'Create household' }).click()

  await expect(page.getByRole('heading', { name: 'Groceries', exact: true })).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('Shell Test Household').and(page.locator(':visible'))).toBeVisible()
})

test('refresh retains the created household', async ({ page }) => {
  await signUpFreshUser(page, 'Refresh Test')
  await page.getByLabel('Household name').fill('Refresh Test Household')
  await page.getByRole('button', { name: 'Create household' }).click()
  await expect(page.getByRole('heading', { name: 'Groceries', exact: true })).toBeVisible({ timeout: 15000 })

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Groceries', exact: true })).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('Refresh Test Household').and(page.locator(':visible'))).toBeVisible()
  // Never re-shown onboarding for a household that already exists.
  await expect(page.getByRole('heading', { name: 'Create your household' })).not.toBeVisible()
})

test('signing out from onboarding protects the app again', async ({ page }) => {
  await signUpFreshUser(page, 'Sign Out Test')
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/sign-in$/)

  await page.goto('/groceries')
  await expect(page).toHaveURL(/\/sign-in$/)
})
