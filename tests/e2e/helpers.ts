import { expect, type Page } from '@playwright/test'

/**
 * Passes the Landing gate and lands on the default Groceries page. Nearly
 * every spec needs to be inside the app rather than on Landing, so this is
 * shared rather than repeated in every file.
 */
export async function enterApp(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start splitting fairly' }).click()
  await expect(page.getByRole('heading', { name: 'Groceries', exact: true })).toBeVisible()
  // The heading renders before the staggered item list finishes animating
  // in; wait for real content so callers that immediately read the list
  // (count, names, order) don't race that entrance animation.
  await expect(page.locator('main li').first()).toBeVisible()
}

/**
 * From inside the app, navigates to Assistant and runs its (fully mocked,
 * local) generate flow through to the review screen. Shared because both
 * the mobile-nav-clearance and Assistant-review specs need this same setup.
 */
export async function generateAssistantGroceries(page: Page, prompt: string) {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Assistant', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'AI Assistant', exact: true })).toBeVisible()
  await page.getByLabel('Describe what your household needs').fill(prompt)
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(page.getByText('Your groceries are ready')).toBeVisible({ timeout: 8000 })
}
