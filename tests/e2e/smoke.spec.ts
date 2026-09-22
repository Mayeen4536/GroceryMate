import { test, expect } from '@playwright/test'

test('loads the app, shows primary navigation, and navigates to another page', async ({ page }) => {
  await page.goto('/')

  // The app loaded: the landing page's hero heading is the clearest signal.
  await expect(page).toHaveTitle('GroceryMate')
  await expect(page.getByRole('heading', { name: 'Split groceries fairly.' })).toBeVisible()

  // An important visible element: the CTA that opens the app.
  const openApp = page.getByRole('button', { name: 'Open the app' })
  await expect(openApp).toBeVisible()
  await openApp.click()

  // Primary navigation is available once inside the app.
  const nav = page.getByRole('navigation', { name: 'Main' })
  await expect(nav).toBeVisible()
  const membersLink = nav.getByRole('button', { name: 'Members' })
  await expect(membersLink).toBeVisible()

  // Navigate to an existing page and verify the navigation succeeded.
  await membersLink.click()
  await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible()
  await expect(membersLink).toHaveAttribute('aria-current', 'page')
})
