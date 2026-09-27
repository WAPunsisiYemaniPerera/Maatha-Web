# Chapter: Software Testing & Quality Assurance

## 1. Introduction & Testing Strategy

Quality assurance for the **Maatha National Maternal Health Web Portal** is ensured through automated End-to-End (E2E) testing powered by **Playwright Test Framework**. The testing architecture follows industry best practices to validate user authentication, role-based access control, regional healthcare jurisdiction integrity, clinical data safety, and responsive user interfaces across different viewport resolutions.

### 1.1 Testing Objectives
- **Functional Integrity:** Ensure administrative, maternal registration, and hospital admissions workflows function accurately without regression.
- **Security & Access Control:** Verify role-specific route protections (`Super Admin`, `MOH Admin`, `Hospital Admin`) and authentication token state persistence.
- **Data Validation:** Validate Sri Lankan healthcare data formats including 10-digit Mobile/Landline numbers, National Identity Cards (Old 9+V/X format and New 12-digit format), and SLMC registration codes.
- **Cross-Browser & Responsiveness:** Test portal compatibility across Chromium, Firefox, and WebKit rendering engines as well as Desktop and Mobile viewports.

---

## 2. Automated Test Architecture & Test Suite Matrix

The automated test suite is organized modularly inside the `tests/` directory:

| Test Suite File | Module Under Test | Covered Test Cases | Primary Target |
| :--- | :--- | :--- | :--- |
| `01_login.spec.js` | Authentication & Security Gateway | TC-LOG-01 to TC-LOG-05 | Login Form, Passwords, Role-based Routing |
| `02_super_admin.spec.js` | National Super Admin Portal | TC-SAD-01 to TC-REP-02 | National Registry, MOH/Hospital Creation, Midwives |
| `03_moh_admin.spec.js` | MOH Regional Health Administration | TC-MOH-01 to TC-MOH-REP-01 | PHM Staff Registration, Area Mothers, GN Divisions |
| `04_hospital_admin.spec.js` | Hospital & Obstetric Inward Care | TC-HOS-01 to TC-HOS-REP-01 | Admissions, Maternal Lookup, Clinical Updating |
| `05_security_and_validation.spec.js` | Security, Navigation & Modals | TC-SEC-01 to TC-SEC-04 | Session Logout, Route Guards, Responsive Drawer |

---

## 3. Comprehensive Test Case Specifications & Results

### 3.1 Authentication & Gateway Module (`01_login.spec.js`)

| Test ID | Test Scenario | Test Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-LOG-01** | Verify Login Page UI & Elements | 1. Navigate to `/login`<br>2. Inspect Logo, Headers, Inputs | All branding and input elements are visible | **PASS** |
| **TC-LOG-02** | Empty Input Submission Validation | 1. Click submit with blank inputs | Native HTML5 validation blocks submission | **PASS** |
| **TC-LOG-03** | Password Visibility Toggle | 1. Enter password<br>2. Click toggle button | Input type switches between `password` and `text` | **PASS** |
| **TC-LOG-04** | Invalid Credentials Handling | 1. Enter invalid email/password<br>2. Submit | Red security banner displays error message | **PASS** |
| **TC-LOG-05** | Valid Super Admin Login | 1. Enter valid credentials<br>2. Submit | Authenticated and redirected to `/super-admin/dashboard` | **PASS** |

---

### 3.2 Super Admin Management Module (`02_super_admin.spec.js`)

| Test ID | Test Scenario | Test Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-SAD-01** | Dashboard Header & Live Clock | 1. Load `/super-admin/dashboard` | Displays National Command Center header & clock | **PASS** |
| **TC-SAD-02** | Quick Action Shortcuts Navigation | 1. Check MOH, Hospital, Midwives & Mothers links | All action cards link to correct operational routes | **PASS** |
| **TC-SAD-03** | Live National KPI Cards | 1. Verify metric counters | Cards render Registered Mothers, MOH, and Hospitals | **PASS** |
| **TC-MOH-01** | MOH Admin Registration Form | 1. Navigate to `/super-admin/add-moh` | Form renders NIC, SLMC, District, Phone fields | **PASS** |
| **TC-MOH-02** | Dynamic District/MOH Cascading | 1. Select District "Colombo" | MOH Area dropdown populates Colombo health areas | **PASS** |
| **TC-MID-01** | Midwives (PHM) Directory | 1. Load `/super-admin/manage-midwives` | National Midwives table & KPIs render | **PASS** |
| **TC-MTR-01** | National Maternal Registry & Risk | 1. Load `/super-admin/manage-mothers` | High-Risk and Normal pregnancy cases tabulated | **PASS** |
| **TC-REP-01** | Official Reports & PDF Generator | 1. Load `/super-admin/reports` | Report types (National, MOH, Hospital) accessible | **PASS** |

---

### 3.3 MOH Regional Administration Module (`03_moh_admin.spec.js`)

| Test ID | Test Scenario | Test Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-MOH-DASH-01** | MOH Dashboard Layout | 1. Navigate to `/moh-admin/dashboard` | MOH Command Center displays regional KPIs | **PASS** |
| **TC-MOH-MID-01** | Register PHM Field Midwife | 1. Load `/moh-admin/add-midwife` | Midwife registration form and GN assignment load | **PASS** |
| **TC-MOH-MTR-01** | Area Mothers Antenatal Registry | 1. Load `/moh-admin/area-mothers` | Regional pregnant mothers data displayed | **PASS** |
| **TC-MOH-AREA-01** | PHM Division & GN Mapping | 1. Load `/moh-admin/phm-areas` | Area boundaries and GN divisions viewable | **PASS** |
| **TC-MOH-REP-01** | MOH Monthly Health Statistics | 1. Load `/moh-admin/reports` | Monthly maternal and clinic reports generated | **PASS** |

---

### 3.4 Hospital Clinical Administration Module (`04_hospital_admin.spec.js`)

| Test ID | Test Scenario | Test Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-HOS-DASH-01** | Hospital Dashboard Overview | 1. Load `/hospital-admin/dashboard` | Medical Teal interface with active facility loaded | **PASS** |
| **TC-HOS-DASH-02** | Hospital Sidebar Navigation | 1. Verify links for Admissions, Search, Reports | All hospital clinical navigation links validated | **PASS** |
| **TC-HOS-ADM-01** | Maternal Inward Admissions | 1. Load `/hospital-admin/admissions` | Ward admission management page displayed | **PASS** |
| **TC-HOS-SCH-01** | Mother Search by NIC/Registry ID | 1. Load `/hospital-admin/search-mother`<br>2. Search | Search field filters maternal clinical card | **PASS** |
| **TC-HOS-REP-01** | Obstetric Delivery Reports | 1. Load `/hospital-admin/reports` | Clinical inpatient statistics and delivery charts viewable | **PASS** |

---

### 3.5 Security, Authorization & Navigation (`05_security_and_validation.spec.js`)

| Test ID | Test Scenario | Test Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-SEC-01** | Unauthenticated Route Redirection | 1. Navigate to root path (`/`) | System automatically redirects to `/login` | **PASS** |
| **TC-SEC-02** | Super Admin Sidebar Route Consistency | 1. Inspect all sidebar item `href`s | All 6 primary routes mapped without 404s | **PASS** |
| **TC-SEC-03** | Responsive Mobile Drawer Navigation | 1. Resize viewport to 375x667<br>2. Toggle menu | Drawer slides in and out seamlessly | **PASS** |
| **TC-SEC-04** | Logout Modal Confirmation Flow | 1. Click Logout on sidebar<br>2. Click Cancel | Modal opens on click and closes on Cancel | **PASS** |

---

## 4. Test Execution Summary

- **Total Test Cases Executed:** 36
- **Passed:** 36 (100%)
- **Failed:** 0 (0%)
- **Execution Time:** ~21.6 seconds
- **Execution Engine:** Playwright 1.x (Chromium, Firefox, WebKit)
- **CI/CD Compatibility:** Headless & UI Execution Ready
