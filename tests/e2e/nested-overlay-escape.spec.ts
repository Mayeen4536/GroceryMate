import { test, expect, type Page } from '@playwright/test'
import { enterApp } from './helpers'

// Regression coverage for QA-007 (a single Escape press used to close both
// the "Remove from household" confirmation and the Member Profile drawer
// underneath it at once, since Modal and Drawer each reacted independently).

async function openFirstMemberProfile(page: Page) {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Members', exact: true }).click()
  const firstProfileButton = page.getByRole('button', { name: /Open .+'s profile/ }).first()
  await expect(firstProfileButton).toBeVisible()
  await firstProfileButton.click()
  await expect(page.getByRole('dialog', { name: 'Member profile' })).toBeVisible()
}

test.describe('Nested overlay Escape handling', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(isMobile, 'Escape-key sequencing is keyboard-event logic, not viewport-dependent')
    await enterApp(page)
  })

  test('first Escape closes only the confirmation; second Escape closes the drawer beneath it', async ({ page }) => {
    await openFirstMemberProfile(page)
    await page.getByRole('button', { name: 'Remove from household' }).click()
    const confirmDialog = page.getByRole('dialog', { name: /Remove .+ from the household\?/ })
    await expect(confirmDialog).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(confirmDialog).not.toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Member profile' })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Member profile' })).not.toBeVisible()
  })

  test('a standalone dialog (no nested confirmation) still closes with a single Escape', async ({ page }) => {
    await openFirstMemberProfile(page)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Member profile' })).not.toBeVisible()
  })
})
