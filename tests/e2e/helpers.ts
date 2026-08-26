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
