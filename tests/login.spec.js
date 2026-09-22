import { test, expect } from '@playwright/test';

test.describe('Maatha Portal - Login Page Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    // සෑම test එකකටම පෙර Login පිටුවට පිවිසීම
    await page.goto('/login');
  });

  test('1. Login UI elements නිවැරදිව දිස්වේදැයි පරීක්ෂාව', async ({ page }) => {
    // Title & Headers
    await expect(page.locator('text=MAATHA PORTAL')).toBeVisible();
    await expect(page.locator('text=පරිපාලන සහ සෞඛ්‍ය නිලධාරී පිවිසුම')).toBeVisible();

    // Input fields & Button
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[placeholder="••••••••"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('2. වැරදි Credentials ලබාදුන් විට Error Message එකක් පෙන්වයිදැයි පරීක්ෂාව', async ({ page }) => {
    // Invalid email & password
    await page.locator('input[type="email"]').fill('wronguser@test.com');
    await page.locator('input[placeholder="••••••••"]').fill('WrongPassword123');
    await page.locator('button[type="submit"]').click();

    // Error alert එක පෙන්වන තුරු බලා සිටීම
    const errorBox = page.locator('.bg-red-50');
    await expect(errorBox).toBeVisible({ timeout: 10000 });
  });

  test('3. Password Show/Hide Toggle Button එක ක්‍රියාකරයිදැයි පරීක්ෂාව', async ({ page }) => {
    const passwordInput = page.locator('input[placeholder="••••••••"]');
    const toggleButton = page.locator('button[aria-label="Toggle password visibility"]');

    await passwordInput.fill('mySecretPassword');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Show password click
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Hide password click
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('4. නිවැරදි Admin Credentials සමඟ Login වී Dashboard එකට Redirect වේදැයි පරීක්ෂාව', async ({ page }) => {
    // ඔබගේ පද්ධතියේ ඇති සත්‍ය Admin ගිණුමේ විස්තර ඇතුළත් කරන්න
    await page.locator('input[type="email"]').fill('admin@maatha.lk');
    await page.locator('input[placeholder="••••••••"]').fill('123456');
    await page.locator('button[type="submit"]').click();

    // Dashboard URL එකට හෝ Super Admin Dashboard එකට redirect වීම බලාපොරොත්තු වීම
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
  });

});
