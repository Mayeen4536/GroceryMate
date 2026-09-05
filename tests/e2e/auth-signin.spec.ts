import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test('shows validation errors for empty fields without calling the network', async ({ page }) => {
  await page.goto('/sign-in')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Email is required.')).toBeVisible()
  await expect(page.getByText('Password is required.')).toBeVisible()
  await expect(page).toHaveURL(/\/sign-in$/)
})

test('rejects wrong credentials with a clear, safe error message', async ({ page }) => {
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill('nobody-e2e@example.com')
  await page.getByLabel('Password', { exact: true }).fill('wrong-password')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByRole('alert')).toHaveText('That email or password is incorrect.')
  await expect(page).toHaveURL(/\/sign-in$/)
})

test('password visibility toggle reveals and re-hides the password', async ({ page }) => {
  await page.goto('/sign-in')
  const passwordInput = page.getByLabel('Password', { exact: true })
  await passwordInput.fill('some-password')
  await expect(passwordInput).toHaveAttribute('type', 'password')

  await page.getByRole('button', { name: 'Show password' }).click()
  await expect(passwordInput).toHaveAttribute('type', 'text')

  await page.getByRole('button', { name: 'Hide password' }).click()
  await expect(passwordInput).toHaveAttribute('type', 'password')
})

test('links through to sign-up', async ({ page }) => {
  await page.goto('/sign-in')
  await page.getByRole('link', { name: 'Create an account' }).click()
  await expect(page).toHaveURL(/\/sign-up$/)
})
