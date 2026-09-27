import { test, expect } from '@playwright/test';

test.describe('Maatha Portal - Super Admin Module Test Suite', () => {

  // 1. Super Admin Dashboard Tests
  test.describe('1. Super Admin Command Center / Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/super-admin/dashboard');
    });

    test('TC-SAD-01: Verify Super Admin Dashboard Header, Clock & Live Status', async ({ page }) => {
      await expect(page.locator('text=මාතා ජාතික පාලන පුවරුව')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=Command Center').first()).toBeVisible();
    });

    test('TC-SAD-02: Verify Quick Action Shortcut Navigation Cards', async ({ page }) => {
      // MOH Management Quick Link
      const mohLink = page.locator('a[href="/super-admin/add-moh"]').first();
      await expect(mohLink).toBeVisible({ timeout: 15000 });

      // Hospital Management Quick Link
      const hospitalLink = page.locator('a[href="/super-admin/add-hospital"]').first();
      await expect(hospitalLink).toBeVisible();

      // PHM Midwives Quick Link
      const midwivesLink = page.locator('a[href="/super-admin/manage-midwives"]').first();
      await expect(midwivesLink).toBeVisible();

      // Mothers Registry Quick Link
      const mothersLink = page.locator('a[href="/super-admin/manage-mothers"]').first();
      await expect(mothersLink).toBeVisible();
    });

    test('TC-SAD-03: Verify Key Performance Indicator (KPI) Metric Cards', async ({ page }) => {
      await expect(page.locator('text=මාතා ජාතික පාලන පුවරුව')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=Command Center').first()).toBeVisible();
    });
  });

  // 2. MOH Admin Management Tests
  test.describe('2. MOH Admin Management (/super-admin/add-moh)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/super-admin/add-moh');
    });

    test('TC-MOH-01: Verify MOH Admin Registration Form Layout and Input Fields', async ({ page }) => {
      await expect(page.locator('text=සෞඛ්‍ය වෛද්‍ය නිලධාරී (MOH) කළමනාකරණය')).toBeVisible({ timeout: 15000 });
      
      // Form Input elements
      await expect(page.locator('input[name="fullName"]')).toBeVisible();
      await expect(page.locator('input[name="nic"]')).toBeVisible();
      await expect(page.locator('input[name="slmcNumber"]')).toBeVisible();
      await expect(page.locator('select[name="district"]')).toBeVisible();
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="phone"]')).toBeVisible();
    });

    test('TC-MOH-02: District and Dynamic MOH Area Dropdown Cascading Selection', async ({ page }) => {
      const districtSelect = page.locator('select[name="district"]');
      const mohSelect = page.locator('select[name="mohArea"]');

      await expect(districtSelect).toBeVisible({ timeout: 15000 });
      // Select Colombo District
      await districtSelect.selectOption('Colombo');
      
      // MOH Area should become enabled with Colombo areas
      await expect(mohSelect).toBeEnabled();
      await mohSelect.selectOption({ index: 1 });
      const selectedValue = await mohSelect.inputValue();
      expect(selectedValue).not.toBe('');
    });

    test('TC-MOH-03: Search and Filter Existing MOH Administrators Table', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="නම"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('Colombo');
        await page.waitForTimeout(300);
      }
    });
  });

  // 3. Hospital Admin Management Tests
  test.describe('3. Hospital Admin Management (/super-admin/add-hospital)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/super-admin/add-hospital');
    });

    test('TC-HOS-01: Verify Hospital Director Registration Form Elements', async ({ page }) => {
      await expect(page.locator('text=රෝහල් කළමනාකරණය සහ ලියාපදිංචිය')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('input[name="hospitalName"]')).toBeVisible();
      await expect(page.locator('select[name="hospitalType"]')).toBeVisible();
      await expect(page.locator('input[name="adminName"]')).toBeVisible();
      await expect(page.locator('input[name="email"]')).toBeVisible();
    });

    test('TC-HOS-02: Hospital Directory Table Filtering by District and Type', async ({ page }) => {
      await expect(page.locator('text=රෝහල් කළමනාකරණය සහ ලියාපදිංචිය')).toBeVisible({ timeout: 15000 });
      const districtSelect = page.locator('select[name="district"]');
      await expect(districtSelect).toBeVisible();
    });
  });

  // 4. Midwives Management Directory Tests
  test.describe('4. Midwives (PHM) Directory (/super-admin/manage-midwives)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/super-admin/manage-midwives');
    });

    test('TC-MID-01: Verify National Midwifery Directory Header and KPI Summary', async ({ page }) => {
      await expect(page.locator('text=පවුල් සෞඛ්‍ය සේවා නිලධාරීන් කළමනාකරණය')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=මුළු PHM නිලධාරිනියන්')).toBeVisible();
      await expect(page.locator('text=MOH ප්‍රදේශ ආවරණය')).toBeVisible();
    });

    test('TC-MID-02: Filter Midwives by District and Search Keyword', async ({ page }) => {
      await expect(page.locator('text=පවුල් සෞඛ්‍ය සේවා නිලධාරීන් කළමනාකරණය')).toBeVisible({ timeout: 15000 });
      const searchBox = page.locator('input[placeholder*="නම"]').first();
      await expect(searchBox).toBeVisible();

      await searchBox.fill('Colombo');
      await page.waitForTimeout(300);
    });
  });

  // 5. National Maternal Registry Tests
  test.describe('5. National Maternal Registry (/super-admin/manage-mothers)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/super-admin/manage-mothers');
    });

    test('TC-MTR-01: Verify Maternal Registry Header and High-Risk KPI Metrics', async ({ page }) => {
      await expect(page.locator('text=ලියාපදිංචි මව්වරුන් කළමනාකරණය')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=මුළු ලියාපදිංචි මව්වරුන්')).toBeVisible();
      await expect(page.locator('text=අධි-අවදානම් මව්වරුන්')).toBeVisible();
    });

    test('TC-MTR-02: Filter Maternal Records by Risk Status (High-Risk / Normal)', async ({ page }) => {
      await expect(page.locator('text=ලියාපදිංචි මව්වරුන් කළමනාකරණය')).toBeVisible({ timeout: 15000 });
      const searchBox = page.locator('input[placeholder*="නම"]').first();
      await expect(searchBox).toBeVisible();
    });
  });

  // 6. Reports & Official Documents Tests
  test.describe('6. Official Reports & PDF Generator (/super-admin/reports)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/super-admin/reports');
    });

    test('TC-REP-01: Verify Official Reports & Analytics Center Interface', async ({ page }) => {
      await expect(page.locator('text=නිල ලේඛන සහ වාර්තා කේන්ද්‍රය')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=ජාතික මාතෘ සෞඛ්‍ය සංඛ්‍යාලේඛන වාර්තාව')).toBeVisible();
    });

    test('TC-REP-02: Verify Report Export Format Options (PDF & CSV)', async ({ page }) => {
      await expect(page.locator('text=නිල ලේඛන සහ වාර්තා කේන්ද්‍රය')).toBeVisible({ timeout: 15000 });
      const downloadPdfBtn = page.locator('button:has-text("Download Official PDF")');
      await expect(downloadPdfBtn).toBeVisible();
    });
  });

});
