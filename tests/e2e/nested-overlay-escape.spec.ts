import { test, expect, type Page } from '@playwright/test'
import { addMember, enterApp, FIXTURE_OWNER_NAME } from './helpers'

// Regression coverage for QA-007 (a single Escape press used to close both
// the "Remove from household" confirmation and the Member Profile drawer
// underneath it at once, since Modal and Drawer each reacted independently).

/**
 * Opens a specific member's profile by name — never just "the first"
 * member, since the fixture household's very first member is always its
 * owner, and an owner's profile deliberately has no
 * archive/reactivate/remove controls at all (see docs/MEMBER_INTEGRATION.md,
 * "owner self-archival gap"), which this spec needs to exercise.
 */
async function openMemberProfile(page: Page, name: string) {
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('button', { name: 'Members', exact: true })
    .click()
  await page.getByRole('button', { name: new RegExp(`Open ${name}'s profile`) }).click()
  await expect(page.getByRole('dialog', { name: 'Member profile' })).toBeVisible()
}

test.describe('Nested overlay Escape handling', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(isMobile, 'Escape-key sequencing is keyboard-event logic, not viewport-dependent')
    await enterApp(page)
  })

  test('first Escape closes only the confirmation; second Escape closes the drawer beneath it', async ({
    page,
  }) => {
    const memberName = `Nested Escape Member ${Date.now()}`
    await addMember(page, memberName)
    await openMemberProfile(page, memberName)
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
    await openMemberProfile(page, FIXTURE_OWNER_NAME)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Member profile' })).not.toBeVisible()
  })
})
