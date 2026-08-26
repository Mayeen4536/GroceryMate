import { test, expect, type Locator } from '@playwright/test'

// Regression coverage for QA-003 (Landing's primary CTAs had a focus ring so
// low-contrast it was effectively invisible). This is a smoke check, not a
// full accessibility suite: it confirms a focus style change is genuinely
// present, without asserting the exact color/contrast value, so it stays
// resilient to future visual-design tweaks while still catching the more
// severe regression of a focus indicator being removed entirely.

async function boxShadow(locator: Locator) {
  return locator.evaluate((el) => getComputedStyle(el).boxShadow)
}

test.describe('Accessibility smoke', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, 'keyboard focus behavior is not meaningfully different on a touch-emulated mobile browser')
  })

  test('Landing\'s primary and secondary CTAs get a visibly different style on keyboard focus', async ({ page }) => {
    await page.goto('/')

    const openApp = page.getByRole('button', { name: 'Open the app' })
    const unfocusedOpenApp = await boxShadow(openApp)
    await page.keyboard.press('Tab')
    await expect(openApp).toBeFocused()
    expect(await boxShadow(openApp)).not.toBe(unfocusedOpenApp)

    const heroCta = page.getByRole('button', { name: 'Start splitting fairly' })
    const unfocusedHeroCta = await boxShadow(heroCta)
    await page.keyboard.press('Tab')
    await expect(heroCta).toBeFocused()
    expect(await boxShadow(heroCta)).not.toBe(unfocusedHeroCta)
  })

  test('the app can be entered and navigated using the keyboard alone', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab') // "Open the app"
    await page.keyboard.press('Tab') // "Start splitting fairly"
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Groceries', exact: true })).toBeVisible()

    const membersLink = page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: 'Members', exact: true })

    // Tab forward until the Members nav control is reached, rather than
    // hardcoding an exact stop count that would break if unrelated markup
    // shifts — what matters is that it's reachable via Tab at all.
    for (let i = 0; i < 25; i += 1) {
      if (await membersLink.evaluate((el) => el === document.activeElement)) break
      await page.keyboard.press('Tab')
    }
    await expect(membersLink).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Members', exact: true })).toBeVisible()
  })
})
