import { test, expect } from '@playwright/test';

test.describe('Maatha Portal - Login & Authentication Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('TC-LOG-01: Verify Login Page Layout and Essential UI Elements', async ({ page }) => {
    // 1. Branding and Title Verification
    await expect(page.locator('text=MAATHA PORTAL')).toBeVisible();
    await expect(page.locator('text=පරිපාලන සහ සෞඛ්‍ය නිලධාරී පිවිසුම')).toBeVisible();

    // 2. Input Fields and Form Controls
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[placeholder="••••••••"]');
    const submitBtn = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('placeholder', 'example@health.gov.lk');
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toContainText('පද්ධතියට ඇතුළු වන්න');
  });

  test('TC-LOG-02: Form Validation - Empty Email and Password Submission', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const submitBtn = page.locator('button[type="submit"]');

    // Attempting submit without filling fields
    await submitBtn.click();

    // HTML5 native validation check
    const isEmailValid = await emailInput.evaluate((el) => el.checkValidity());
    expect(isEmailValid).toBeFalsy();
  });

  test('TC-LOG-03: Security & Visibility - Password Show/Hide Toggle Button', async ({ page }) => {
    const passwordInput = page.locator('input[placeholder="••••••••"]');
    const toggleButton = page.locator('button[aria-label="Toggle password visibility"]');

    // Fill secret password
    await passwordInput.fill('AdminPass@2026');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click to reveal password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click to mask password again
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('TC-LOG-04: Negative Test - Invalid Email / Wrong Password Error Display', async ({ page }) => {
    await page.locator('input[type="email"]').fill('invalid.user@health.gov.lk');
    await page.locator('input[placeholder="••••••••"]').fill('IncorrectPassword999!');
    await page.locator('button[type="submit"]').click();

    // Verify error banner is displayed
    const errorBanner = page.locator('.bg-red-50');
    await expect(errorBanner).toBeVisible({ timeout: 10000 });
  });

  test('TC-LOG-05: Positive Test - Super Admin Successful Login and Redirection', async ({ page }) => {
    await page.locator('input[type="email"]').fill('admin@maatha.lk');
    await page.locator('input[placeholder="••••••••"]').fill('123456');
    await page.locator('button[type="submit"]').click();

    // Expect navigation to Dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
  });

});
