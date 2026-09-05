import { chromium, expect, type FullConfig } from '@playwright/test'

/**
 * Most existing specs assume the app is reachable without logging in
 * first — that assumption no longer holds now that /groceries and friends
 * sit behind <ProtectedRoute>. Rather than touch every existing spec, this
 * signs in ONE fixed local-only fixture account through the real UI once,
 * up front, and saves the resulting session as the default storageState
 * for every test (see playwright.config.ts). Specs that specifically need
 * to be logged OUT (auth-redirect/auth-signin/auth-signup) opt out with
 * `test.use({ storageState: { cookies: [], origins: [] } })`.
 *
 * Local Supabase only: confirmations are disabled locally, so sign-up
 * returns an active session immediately — this never sends real email and
 * never touches the hosted project.
 */
const FIXTURE_EMAIL = 'e2e-fixture@example.com'
const FIXTURE_PASSWORD = 'E2eFixturePassword9!'
const FIXTURE_NAME = 'E2E Fixture'
const STORAGE_STATE_PATH = 'tests/e2e/.auth/user.json'

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL
  if (!baseURL) throw new Error('global-setup: no baseURL resolved from playwright.config.ts')

  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto(`${baseURL}/sign-up`)
  await page.getByLabel('Display name').fill(FIXTURE_NAME)
  await page.getByLabel('Email').fill(FIXTURE_EMAIL)
  await page.getByLabel('Password', { exact: true }).fill(FIXTURE_PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()

  // First run: fresh signup lands straight in the app. Later runs: the
  // fixture account already exists (local DB persists across runs), so
  // sign up correctly rejects it — fall back to signing in instead. Race
  // both outcomes (rather than a fixed-timeout visibility check on just
  // one of them) so this doesn't depend on guessing how long the network
  // round trip to local Supabase takes.
  const signedUpDirectly = await Promise.race([
    expect(page)
      .toHaveURL(/\/groceries$/, { timeout: 10000 })
      .then(() => true)
      .catch(() => false),
    page
      .getByRole('alert')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => false)
      .catch(() => false),
  ])

  if (!signedUpDirectly) {
    await page.goto(`${baseURL}/sign-in`)
    await page.getByLabel('Email').fill(FIXTURE_EMAIL)
    await page.getByLabel('Password', { exact: true }).fill(FIXTURE_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
  }

  // expect(...).toHaveURL polls the URL directly rather than waiting for a
  // navigation/load event — needed here because signing in is a
  // client-side route change (react-router pushState), not a full page load.
  await expect(page).toHaveURL(/\/groceries$/, { timeout: 15000 })
  await page.context().storageState({ path: STORAGE_STATE_PATH })
  await browser.close()
}
