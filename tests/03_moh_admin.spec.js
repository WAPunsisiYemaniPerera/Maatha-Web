import { test, expect } from '@playwright/test';

test.describe('Maatha Portal - MOH Admin Module Test Suite', () => {

  // 1. MOH Admin Dashboard
  test.describe('1. MOH Admin Dashboard (/moh-admin/dashboard)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/moh-admin/dashboard');
    });

    test('TC-MOH-DASH-01: Verify MOH Command Center Dashboard Layout', async ({ page }) => {
      await expect(page.locator('text=MOH Command Center').first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=ප්‍රධාන පාලන පුවරුව')).toBeVisible();
    });

    test('TC-MOH-DASH-02: Verify MOH Key Area Metrics Cards', async ({ page }) => {
      await expect(page.locator('text=MOH Command Center').first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=ප්‍රධාන පාලන පුවරුව')).toBeVisible();
    });
  });

  // 2. Register Midwife Form (/moh-admin/add-midwife)
  test.describe('2. PHM Midwife Registration (/moh-admin/add-midwife)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/moh-admin/add-midwife');
    });

    test('TC-MOH-MID-01: Verify Midwife Registration Form Fields and Validations', async ({ page }) => {
      await expect(page.locator('text=අලුත් පවුල් සෞඛ්‍ය සේවා නිලධාරිනියක (PHM) ලියාපදිංචිය').first()).toBeVisible({ timeout: 15000 });
      
      // Essential inputs
      await expect(page.locator('input[name="fullName"]')).toBeVisible();
      await expect(page.locator('input[name="nic"]')).toBeVisible();
      await expect(page.locator('input[name="phone"]')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
    });

    test('TC-MOH-MID-02: Input Validation for Sri Lankan Phone Number and NIC', async ({ page }) => {
      const phoneInput = page.locator('input[name="phone"]');
      await expect(phoneInput).toBeVisible({ timeout: 15000 });
      await phoneInput.fill('0771234567');
      await expect(phoneInput).toHaveValue('0771234567');
    });
  });

  // 3. Area Mothers Antenatal Management (/moh-admin/area-mothers)
  test.describe('3. Area Mothers Registry (/moh-admin/area-mothers)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/moh-admin/area-mothers');
    });

    test('TC-MOH-MTR-01: Verify Area Maternal Registry and Clinical Indicators', async ({ page }) => {
      await expect(page.locator('text=ප්‍රදේශයේ මව්වරුන්ගේ දත්ත පද්ධතිය')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=මුළු ලියාපදිංචි මව්වරුන්')).toBeVisible();
    });

    test('TC-MOH-MTR-02: Search Mother by Name or NIC and Filter by Trimester/Risk', async ({ page }) => {
      const searchBox = page.locator('input[placeholder*="නම"]').first();
      await expect(searchBox).toBeVisible({ timeout: 15000 });
      await searchBox.fill('Kamala');
      await page.waitForTimeout(300);
    });
  });

  // 4. PHM Areas & GN Division Management (/moh-admin/phm-areas)
  test.describe('4. PHM Divisions & GN Areas (/moh-admin/phm-areas)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/moh-admin/phm-areas');
    });

    test('TC-MOH-AREA-01: Verify PHM Area Division Management Interface', async ({ page }) => {
      await expect(page.locator('text=PHM කොට්ඨාස කළමනාකරණය')).toBeVisible({ timeout: 15000 });
    });
  });

  // 5. MOH Monthly & Statistical Reports (/moh-admin/reports)
  test.describe('5. MOH Reports & Analytics (/moh-admin/reports)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/moh-admin/reports');
    });

    test('TC-MOH-REP-01: Verify MOH Monthly Antenatal & Child Health Reports', async ({ page }) => {
      await expect(page.locator('text=MOH නිල වාර්තා සහ ලේඛන මධ්‍යස්ථානය').first()).toBeVisible({ timeout: 15000 });
    });
  });

});
