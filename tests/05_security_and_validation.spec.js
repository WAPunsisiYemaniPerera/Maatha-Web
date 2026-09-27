import { test, expect } from '@playwright/test';

test.describe('Maatha Portal - Security, Navigation & Input Validation Test Suite', () => {

  test('TC-SEC-01: Unauthorized Route Redirection - Root ("/") redirects to "/login"', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*login/);
  });

  test('TC-SEC-02: Super Admin Sidebar Navigation Links Consistency', async ({ page }) => {
    await page.goto('/super-admin/dashboard');
    
    // Check all sidebar items are properly mapped
    const expectedRoutes = [
      '/super-admin/dashboard',
      '/super-admin/add-moh',
      '/super-admin/add-hospital',
      '/super-admin/manage-midwives',
      '/super-admin/manage-mothers',
      '/super-admin/reports'
    ];

    for (const route of expectedRoutes) {
      const link = page.locator(`aside a[href="${route}"]`);
      await expect(link).toBeVisible();
    }
  });

  test('TC-SEC-03: Responsive Design - Mobile Navigation Drawer Toggle', async ({ page }) => {
    // Set viewport to mobile screen
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/super-admin/dashboard');

    // Mobile Header hamburger button
    const menuBtn = page.locator('button[aria-label="Toggle Menu"]');
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await page.waitForTimeout(300);
      
      // Close button
      const closeBtn = page.locator('button:has-text("✕")');
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  });

  test('TC-SEC-04: Logout Confirmation Modal Workflow', async ({ page }) => {
    await page.goto('/super-admin/dashboard');

    // Click logout button on sidebar
    const logoutBtn = page.locator('button:has-text("පද්ධතියෙන් ඉවත් වන්න")').first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();

      // Verify confirmation modal appears
      await expect(page.locator('text=පද්ධතියෙන් ඉවත් වන්නද?')).toBeVisible();

      // Cancel logout
      const cancelBtn = page.locator('button:has-text("නැත")');
      await cancelBtn.click();
      await expect(page.locator('text=පද්ධතියෙන් ඉවත් වන්නද?')).not.toBeVisible();
    }
  });

});
