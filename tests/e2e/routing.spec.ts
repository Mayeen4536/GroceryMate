import { test, expect } from '@playwright/test'
import { enterApp } from './helpers'

// Regression coverage for QA-001 (browser Back exited the app to about:blank
// because GroceryMate had no real client-side routing, fixed by introducing
// react-router). These tests assert on user-visible outcomes only — the
// rendered heading and the URL a user would actually see and could bookmark
// — never on how routing is implemented internally.

test('navigates between the main application pages', async ({ page }) => {
  await enterApp(page)
  const nav = page.getByRole('navigation', { name: 'Main' })

  for (const label of ['Members', 'Settlements', 'Analytics', 'History', 'Groceries']) {
    await nav.getByRole('button', { name: label, exact: true }).click()
    await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/${label.toLowerCase()}$`))
  }
})

test('browser Back and Forward move between GroceryMate pages', async ({ page, isMobile }) => {
  test.skip(
    isMobile,
    'browser history behavior does not depend on viewport size; desktop coverage is sufficient',
  )
  await enterApp(page)
  const nav = page.getByRole('navigation', { name: 'Main' })

  await nav.getByRole('button', { name: 'Members', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Members', exact: true })).toBeVisible()
  await nav.getByRole('button', { name: 'Analytics', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible()

  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Members', exact: true })).toBeVisible()

  await page.goForward()
  await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible()
})

test('refreshing an internal route keeps the correct page', async ({ page, isMobile }) => {
  test.skip(isMobile, 'refresh behavior does not depend on viewport size; desktop coverage is sufficient')
  await enterApp(page)
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('button', { name: 'History', exact: true })
    .click()
  await expect(page.getByRole('heading', { name: 'History', exact: true })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'History', exact: true })).toBeVisible()
})

test('opening a valid internal route directly renders that page', async ({ page, isMobile }) => {
  test.skip(isMobile, 'direct navigation does not depend on viewport size; desktop coverage is sufficient')
  await page.goto('/settlements')
  await expect(page.getByRole('heading', { name: 'Settlements', exact: true })).toBeVisible()
})

test('an invalid application route redirects to a safe page instead of breaking', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'redirect behavior does not depend on viewport size; desktop coverage is sufficient')
  await page.goto('/this-route-does-not-exist')
  await expect(page.getByRole('heading', { name: 'Groceries', exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/groceries$/)
})
