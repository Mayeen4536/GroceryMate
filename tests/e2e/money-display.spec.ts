import { test, expect } from '@playwright/test'
import { enterApp } from './helpers'

// Regression coverage for QA-012: the formatter's own correctness (0, 0.01,
// 100.50, very large amounts, etc.) is covered thoroughly by unit tests in
// src/utils/money.test.ts — this is a single integration check confirming
// the real Groceries UI actually uses that shared formatter, so a sub-unit
// price can never again silently render as if the item were free.

test('a one-paisa grocery price displays with its decimals, not as if free', async ({ page, isMobile }) => {
  test.skip(isMobile, 'this is a formatting/display concern, not viewport-dependent; desktop coverage is sufficient')
  await enterApp(page)

  await page.getByRole('button', { name: 'Add grocery' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Grocery name').fill('One Paisa Item')
  const priceInput = dialog.getByLabel('Price')
  await priceInput.fill('')
  await priceInput.type('0.01')
  await dialog.getByRole('button', { name: 'Add grocery' }).click()

  const card = page.locator('main li').filter({ hasText: 'One Paisa Item' })
  await expect(card).toBeVisible()
  await expect(card.getByText('0.01', { exact: true })).toBeVisible()
  await expect(card.getByText('0', { exact: true })).not.toBeVisible()
})
