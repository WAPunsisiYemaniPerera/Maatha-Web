import { test, expect } from '@playwright/test';

test.describe('Maatha Portal - Hospital Admin Module Test Suite', () => {

  // 1. Hospital Dashboard Overview
  test.describe('1. Hospital Dashboard (/hospital-admin/dashboard)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/hospital-admin/dashboard');
    });

    test('TC-HOS-DASH-01: Verify Hospital Clinical Dashboard Layout and Facility Header', async ({ page }) => {
      await expect(page.locator('text=Hospital Portal').first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=Clinical Medical Care').first()).toBeVisible();
    });

    test('TC-HOS-DASH-02: Verify Hospital Sidebar Clinical Navigation Links', async ({ page }) => {
      await expect(page.locator('a[href="/hospital-admin/admissions"]').first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator('a[href="/hospital-admin/search-mother"]').first()).toBeVisible();
      await expect(page.locator('a[href="/hospital-admin/reports"]').first()).toBeVisible();
    });
  });

  // 2. Maternal Admissions & Ward Management
  test.describe('2. Maternal Inward Admissions (/hospital-admin/admissions)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/hospital-admin/admissions');
    });

    test('TC-HOS-ADM-01: Verify Maternal Admission Management Page Elements', async ({ page }) => {
      await expect(page.locator('text=නේවාසික මව්වරුන්ගේ ලැයිස්තුව').first()).toBeVisible({ timeout: 15000 });
    });
  });

  // 3. Mother Search & Health Card Lookup
  test.describe('3. National Maternal Record Search (/hospital-admin/search-mother)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/hospital-admin/search-mother');
    });

    test('TC-HOS-SCH-01: Verify Mother Search Input by NIC / Phone / Registry ID', async ({ page }) => {
      await expect(page.locator('text=ජාතික මාතෘ සෞඛ්‍ය දත්ත හා හදිසි රෝගී සෙවුම').first()).toBeVisible({ timeout: 15000 });
      
      const searchInput = page.locator('input[type="text"]').first();
      await expect(searchInput).toBeVisible();
      await searchInput.fill('199012345678');
      await page.waitForTimeout(300);
    });
  });

  // 4. Clinical & Delivery Reports
  test.describe('4. Hospital Obstetric Reports (/hospital-admin/reports)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/hospital-admin/reports');
    });

    test('TC-HOS-REP-01: Verify Hospital Clinical and Delivery Reports Screen', async ({ page }) => {
      await expect(page.locator('text=වෛද්‍ය වාර්තා සහ දත්ත විශ්ලේෂණය').first()).toBeVisible({ timeout: 15000 });
    });
  });

});
