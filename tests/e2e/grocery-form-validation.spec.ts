import { test, expect } from '@playwright/test'
import { enterApp } from './helpers'

// Regression coverage for QA-004 (the grocery form's own styled validation
// was unreachable because the browser's native constraint validation
// intercepted submission first). If that regresses, the "Enter a name..."
// assertions below simply never see their text appear, since the browser's
// own popup would block the custom handler from running at all.

test.describe('Grocery form validation', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(isMobile, 'form validation logic does not depend on viewport size; desktop coverage is sufficient')
    await enterApp(page)
    await page.getByRole('button', { name: 'Add grocery' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('submitting with an empty name shows GroceryMate\'s own error text', async ({ page }) => {
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Add grocery' }).click()
    await expect(dialog.getByText('Enter a name for this item.')).toBeVisible()
  })

  test('submitting with no one sharing the item shows the correct error', async ({ page }) => {
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Grocery name').fill('Test Item')
    // All members are selected by default, so the picker's shortcut reads "Clear".
    await dialog.getByRole('button', { name: 'Clear' }).click()
    await dialog.getByRole('button', { name: 'Add grocery' }).click()
    await expect(dialog.getByText('Pick at least one person sharing this item.')).toBeVisible()
  })

  test('correcting a validation error allows the grocery to be added', async ({ page }) => {
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Add grocery' }).click()
    await expect(dialog.getByText('Enter a name for this item.')).toBeVisible()

    await dialog.getByLabel('Grocery name').fill('Regression Coverage Item')
    await dialog.getByRole('button', { name: 'Add grocery' }).click()

    await expect(dialog).not.toBeVisible()
    await expect(page.getByText('Regression Coverage Item')).toBeVisible()
  })

  test('the form can be submitted with the keyboard alone', async ({ page }) => {
    const dialog = page.getByRole('dialog')
    const nameField = dialog.getByLabel('Grocery name')
    await nameField.fill('Keyboard Submit Item')
    await nameField.press('Enter')

    await expect(dialog).not.toBeVisible()
    await expect(page.getByText('Keyboard Submit Item')).toBeVisible()
  })
})
