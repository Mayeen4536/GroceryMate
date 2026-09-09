import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test('shows validation errors for invalid email and weak password', async ({ page }) => {
  await page.goto('/sign-up')
  await page.getByLabel('Email').fill('not-an-email')
  await page.getByLabel('Password', { exact: true }).fill('123')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByText('Enter a valid email address.')).toBeVisible()
  await expect(page.getByText('Password must be at least 6 characters.')).toBeVisible()
})

test('shows the confirmation-required state without ever logging the user in', async ({ page }) => {
  // Hosted Supabase requires email confirmation; local Supabase (used for
  // every other test here) doesn't, so this intercepts the real /signup
  // response to deterministically exercise that UI state without sending
  // real email or depending on hosted infrastructure. Response shape
  // matches what the hosted project actually returns for this case
  // (verified during Migration 4's manual hosted signup testing): a user
  // object with no top-level access_token/session.
  await page.route('**/auth/v1/signup*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'intercepted-user-id',
        email: 'intercepted@example.com',
        confirmation_sent_at: new Date().toISOString(),
      }),
    })
  })

  await page.goto('/sign-up')
  await page.getByLabel('Email').fill('intercepted@example.com')
  await page.getByLabel('Password', { exact: true }).fill('SomePassword9!')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()
  await expect(page.getByText('intercepted@example.com')).toBeVisible()
  // Must not be treated as a login: still on the confirmation screen, not the app.
  await expect(page).not.toHaveURL(/\/groceries$/)
})

test('duplicate email is rejected with a clear message, not a generic failure', async ({ page }) => {
  // Reuses the fixture account global-setup.ts already created locally.
  await page.goto('/sign-up')
  await page.getByLabel('Email').fill('e2e-fixture@example.com')
  await page.getByLabel('Password', { exact: true }).fill('SomeOtherPassword9!')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByRole('alert')).toHaveText(
    'An account with that email already exists. Try signing in instead.',
  )
})

test('full journey: sign up, land in the app, survive a refresh, sign out, and stay out after refresh', async ({
  page,
}) => {
  const email = `e2e-journey-${Date.now()}@example.com`

  await page.goto('/sign-up')
  await page.getByLabel('Display name').fill('Journey Test')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('JourneyPassword9!')
  await page.getByRole('button', { name: 'Create account' }).click()

  // A brand-new account has no household yet, so <HouseholdGate> shows
  // onboarding here instead of the app shell (see household-onboarding.spec.ts
  // for dedicated coverage of that flow) — complete it once so this test can
  // continue exercising the auth session itself.
  await expect(page.getByRole('heading', { name: 'Create your household' })).toBeVisible({ timeout: 15000 })
  await page.getByLabel('Household name').fill('Journey Test Household')
  await page.getByRole('button', { name: 'Create household' }).click()

  // Real profile loaded through RLS — not fabricated — proven by
  // Settings showing the exact values just signed up with.
  await expect(page).toHaveURL(/\/groceries$/)
  await expect(page.getByRole('heading', { name: 'Groceries', exact: true })).toBeVisible({ timeout: 15000 })

  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
  await expect(page.getByLabel('Display name')).toHaveValue('Journey Test')
  await expect(page.getByLabel('Email')).toHaveValue(email)

  // Refresh: session (and profile) survive.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
  await expect(page.getByLabel('Email')).toHaveValue(email)

  // Sign out clears session and profile; the protected app becomes
  // inaccessible immediately (no explicit navigation needed — the route
  // guard redirects on its own as soon as the session clears).
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/sign-in$/)

  await page.goto('/groceries')
  await expect(page).toHaveURL(/\/sign-in$/)

  // Refresh after sign-out: remains logged out.
  await page.reload()
  await expect(page).toHaveURL(/\/sign-in$/)
})

test('links through to sign-in', async ({ page }) => {
  await page.goto('/sign-up')
  await page.getByRole('link', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/sign-in$/)
})
