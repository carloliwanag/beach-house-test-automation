// @ts-check
import { test, expect } from '@playwright/test';
import { LoginPage, DashboardPage, BookingsPage, RoomsPage } from '../page-objects/index.js';
import { testUsers } from '../fixtures/test-data.js';

/**
 * Dashboard Page Test Suite
 *
 * Tests the dashboard functionality including:
 * - Default landing page
 * - Metric display (Check-ins Today, Check-outs Today, Currently Checked In, Rooms For Cleaning)
 * - Clickable metrics with navigation to filtered views
 * - Refresh functionality
 * - UI/UX elements (layout, colors, date display)
 *
 * Related Test Cases:
 * TC-F001 to TC-F015 (Functional Tests)
 * TC-UI001 to TC-UI002 (UI/UX Tests)
 * TC-I001 to TC-I002 (Integration Tests)
 */

test.describe('Dashboard Page - Core Functionality', () => {

  test.beforeEach(async ({ page }) => {
    // Login before each test
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testUsers.validUser.username, testUsers.validUser.password);
  });

  /**
   * TC-F007: Default Landing Page
   * Requirement: FR-5
   * User Story: US-5
   */
  test('should display dashboard as default landing page after login', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    // Verify Dashboard is displayed immediately after login
    await dashboardPage.verifyIsDefaultLandingPage();
    await dashboardPage.verifyDashboardPage();

    // Verify page loads quickly (already loaded if we got here)
    expect(page.url()).toMatch(/\/(dashboard)?$/);
  });

  /**
   * TC-F001: Check-ins Today Metric Display
   * Requirement: FR-1
   * User Story: US-1
   */
  test('should display Check-ins Today metric with correct styling', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.waitForMetricsToLoad();

    // Verify metric card is visible (updated to match actual UI title)
    await dashboardPage.expectTextVisible('Incoming Check-ins Today');

    // Verify the metric value is displayed (should be a number)
    const checkInsValue = await dashboardPage.getMetricValue('Incoming Check-ins Today');
    expect(checkInsValue).toBeGreaterThanOrEqual(0);

    // Verify color theme - should be blue
    await dashboardPage.verifyMetricCardColor('Incoming Check-ins Today', 'bg-blue');
  });

  /**
   * TC-F003: Check-outs Today Metric Display
   * Requirement: FR-2
   * User Story: US-2
   */
  test('should display Check-outs Today metric with correct styling', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.waitForMetricsToLoad();

    // Verify metric card is visible
    await dashboardPage.expectTextVisible('Check-outs Today');

    // Verify the metric value
    const checkOutsValue = await dashboardPage.getMetricValue('Check-outs Today');
    expect(checkOutsValue).toBeGreaterThanOrEqual(0);

    // Verify color theme - should be orange
    await dashboardPage.verifyMetricCardColor('Check-outs Today', 'bg-orange');
  });

  /**
   * TC-F005: Currently Checked In Metric Display
   * Requirement: FR-3
   * User Story: US-3
   */
  test('should display Currently Checked In metric with guest count', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.waitForMetricsToLoad();

    // Verify metric card is visible
    await dashboardPage.expectTextVisible('Currently Checked In');

    // Verify the booking count
    const checkedInValue = await dashboardPage.getMetricValue('Currently Checked In');
    expect(checkedInValue).toBeGreaterThanOrEqual(0);

    // Verify color theme - should be green
    await dashboardPage.verifyMetricCardColor('Currently Checked In', 'bg-green');

    // Verify Total Guests count is displayed
    const totalGuests = await dashboardPage.getTotalGuestsCount();
    expect(totalGuests).toBeGreaterThanOrEqual(0);
  });

  /**
   * TC-F006: Rooms For Cleaning Metric Display
   * Requirement: FR-4
   * User Story: US-4
   */
  test.skip('should display Rooms For Cleaning metric with correct styling', async ({ page }) => {
    // SKIPPED: Rooms For Cleaning metric is commented out in the UI
    // This test should be re-enabled when the feature is uncommented
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.waitForMetricsToLoad();

    // Verify metric card is visible
    await dashboardPage.expectTextVisible('Rooms For Cleaning');

    // Verify the metric value
    const roomsValue = await dashboardPage.getMetricValue('Rooms For Cleaning');
    expect(roomsValue).toBeGreaterThanOrEqual(0);

    // Verify color theme - should be yellow
    await dashboardPage.verifyMetricCardColor('Rooms For Cleaning', 'bg-yellow');
  });

  /**
   * TC-F008: Manual Refresh Functionality
   * Requirement: FR-6
   * User Story: US-7
   */
  test('should refresh metrics when refresh button is clicked', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.waitForMetricsToLoad();

    // Get initial timestamp
    const initialTimestamp = await dashboardPage.getLastUpdatedTimestamp();

    // Wait a moment to ensure timestamps will be different
    await page.waitForTimeout(1000);

    // Click refresh
    await dashboardPage.clickRefresh();

    // Get new timestamp
    const newTimestamp = await dashboardPage.getLastUpdatedTimestamp();

    // Verify timestamp updated (timestamps should be different)
    expect(newTimestamp).not.toBe(initialTimestamp);

    // Verify metrics are still displayed
    await dashboardPage.verifyDashboardPage();
  });

  /**
   * TC-F009: Metrics Load on Page Mount
   * Requirement: FR-6
   */
  test('should load metrics automatically on page mount', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    // Metrics should load automatically
    await dashboardPage.waitForMetricsToLoad();

    // Verify all metrics are displayed
    const metrics = await dashboardPage.getAllMetrics();

    expect(metrics.checkInsToday).toBeGreaterThanOrEqual(0);
    expect(metrics.checkOutsToday).toBeGreaterThanOrEqual(0);
    expect(metrics.currentlyCheckedIn).toBeGreaterThanOrEqual(0);
    expect(metrics.roomsForCleaning).toBeGreaterThanOrEqual(0);

    // Verify last updated timestamp is present
    const timestamp = await dashboardPage.getLastUpdatedTimestamp();
    expect(timestamp).toBeTruthy();
  });
});

test.describe('Dashboard Page - Clickable Metrics & Navigation', () => {

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testUsers.validUser.username, testUsers.validUser.password);
  });

  /**
   * TC-F010: Clickable Metric - Check-ins Today
   * Requirement: FR-7
   * User Story: US-6
   */
  test('should navigate to filtered bookings when Check-ins Today is clicked', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    const bookingsPage = new BookingsPage(page);

    await dashboardPage.waitForMetricsToLoad();

    // Get the check-ins count from dashboard
    const checkInsCount = await dashboardPage.getMetricValue('Check-ins Today');

    // Click on Check-ins Today metric
    await dashboardPage.clickCheckInsToday();

    // Verify navigation to bookings page
    await dashboardPage.verifyURL('/bookings');

    // Verify URL contains filter parameters
    const url = page.url();
    expect(url).toContain('filter=checkInToday');
    expect(url).toContain('date=');

    // Verify filter banner is displayed
    await page.waitForTimeout(500); // Wait for filter banner to render
    const filterBanner = page.locator('text=/Filtered by.*Check-ins/');
    await expect(filterBanner).toBeVisible();

    // Verify "Clear Filter" button is present
    const clearButton = page.getByRole('button', { name: 'Clear Filter' });
    await expect(clearButton).toBeVisible();
  });

  /**
   * TC-F011: Clickable Metric - Check-outs Today
   * Requirement: FR-7
   * User Story: US-6
   */
  test('should navigate to filtered bookings when Check-outs Today is clicked', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.waitForMetricsToLoad();

    // Click on Check-outs Today metric
    await dashboardPage.clickCheckOutsToday();

    // Verify navigation to bookings page
    await dashboardPage.verifyURL('/bookings');

    // Verify URL contains filter parameters
    const url = page.url();
    expect(url).toContain('filter=checkOutToday');
    expect(url).toContain('date=');

    // Verify filter banner is displayed
    await page.waitForTimeout(500);
    const filterBanner = page.locator('text=/Filtered by.*Check-outs/');
    await expect(filterBanner).toBeVisible();
  });

  /**
   * TC-F012: Clickable Metric - Currently Checked In
   * Requirement: FR-7
   * User Story: US-6
   */
  test('should navigate to filtered bookings when Currently Checked In is clicked', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.waitForMetricsToLoad();

    // Click on Currently Checked In metric
    await dashboardPage.clickCurrentlyCheckedIn();

    // Verify navigation to bookings page
    await dashboardPage.verifyURL('/bookings');

    // Verify URL contains filter parameter
    const url = page.url();
    expect(url).toContain('filter=checkedIn');

    // Verify filter banner is displayed
    await page.waitForTimeout(500);
    const filterBanner = page.locator('text=/Filtered by.*Currently Checked In/');
    await expect(filterBanner).toBeVisible();
  });

  /**
   * TC-F013: Clickable Metric - Rooms For Cleaning
   * Requirement: FR-7
   * User Story: US-6
   */
  test('should navigate to filtered rooms when Rooms For Cleaning is clicked', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.waitForMetricsToLoad();

    // Click on Rooms For Cleaning metric
    await dashboardPage.clickRoomsForCleaning();

    // Verify navigation to rooms page
    await dashboardPage.verifyURL('/rooms');

    // Verify URL contains status parameter
    const url = page.url();
    expect(url).toContain('status=for_cleaning');

    // Verify filter banner is displayed
    await page.waitForTimeout(500);
    const filterBanner = page.locator('text=/Filtered by.*Rooms For Cleaning/');
    await expect(filterBanner).toBeVisible();
  });

  /**
   * TC-F014: Clear Filter from Bookings Page
   * Requirement: FR-7
   */
  test('should clear filter when Clear Filter button is clicked on bookings page', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.waitForMetricsToLoad();

    // Click on Check-ins Today to navigate to filtered view
    await dashboardPage.clickCheckInsToday();

    // Wait for filter banner
    await page.waitForTimeout(500);

    // Click Clear Filter button
    const clearButton = page.getByRole('button', { name: 'Clear Filter' });
    await clearButton.click();

    // Verify filter is cleared
    const url = page.url();
    expect(url).not.toContain('filter=');
    expect(url).not.toContain('date=');

    // Verify filter banner disappears
    const filterBanner = page.locator('text=/Filtered by/');
    await expect(filterBanner).not.toBeVisible();
  });

  /**
   * TC-F015: Clear Filter from Rooms Page
   * Requirement: FR-7
   */
  test('should clear filter when Clear Filter button is clicked on rooms page', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.waitForMetricsToLoad();

    // Click on Rooms For Cleaning to navigate to filtered view
    await dashboardPage.clickRoomsForCleaning();

    // Wait for filter banner
    await page.waitForTimeout(500);

    // Click Clear Filter button in the banner (not the one in filters)
    const filterBanner = page.locator('div.bg-yellow-50.border-yellow-200');
    const clearButton = filterBanner.locator('button', { hasText: 'Clear Filter' });
    await clearButton.click();

    // Verify filter is cleared
    const url = page.url();
    expect(url).not.toContain('status=');

    // Verify filter banner disappears
    await expect(filterBanner).not.toBeVisible();
  });
});

test.describe('Dashboard Page - UI/UX Elements', () => {

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testUsers.validUser.username, testUsers.validUser.password);
  });

  /**
   * TC-UI001: Dashboard Layout Structure
   * Requirement: Section 4.1
   */
  test('should display dashboard with correct layout structure', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.waitForMetricsToLoad();

    // Verify page title
    await dashboardPage.expectVisible(dashboardPage.pageTitle);

    // Verify date is displayed
    await dashboardPage.verifyDateDisplay();

    // Verify refresh button
    await dashboardPage.expectVisible(dashboardPage.refreshButton);

    // Verify grid layout with 4 cards
    await dashboardPage.verifyGridLayout();

    // Verify additional info section
    await dashboardPage.expectVisible(dashboardPage.totalGuestsInfo);
    await dashboardPage.expectVisible(dashboardPage.lastUpdatedInfo);
  });

  /**
   * TC-UI002: Metric Card Design
   * Requirement: Section 4.1
   */
  test('should display metric cards with correct design', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.waitForMetricsToLoad();

    // Verify all 4 metric labels are visible
    await dashboardPage.expectTextVisible('Check-ins Today');
    await dashboardPage.expectTextVisible('Check-outs Today');
    await dashboardPage.expectTextVisible('Currently Checked In');
    await dashboardPage.expectTextVisible('Rooms For Cleaning');

    // Verify color themes
    await dashboardPage.verifyMetricCardColor('Check-ins Today', 'bg-blue');
    await dashboardPage.verifyMetricCardColor('Check-outs Today', 'bg-orange');
    await dashboardPage.verifyMetricCardColor('Currently Checked In', 'bg-green');
    await dashboardPage.verifyMetricCardColor('Rooms For Cleaning', 'bg-yellow');

    // Verify all cards have values displayed
    const metrics = await dashboardPage.getAllMetrics();
    expect(metrics.checkInsToday).toBeDefined();
    expect(metrics.checkOutsToday).toBeDefined();
    expect(metrics.currentlyCheckedIn).toBeDefined();
    expect(metrics.roomsForCleaning).toBeDefined();
  });

  /**
   * TC-UI007: Hover Effects on Clickable Cards
   * Requirement: FR-7, Section 4.3
   */
  test('should show hover effects on metric cards', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.waitForMetricsToLoad();

    // Verify all cards have cursor pointer class (indicating clickability)
    await dashboardPage.verifyMetricIsClickable('Check-ins Today');
    await dashboardPage.verifyMetricIsClickable('Check-outs Today');
    await dashboardPage.verifyMetricIsClickable('Currently Checked In');
    await dashboardPage.verifyMetricIsClickable('Rooms For Cleaning');
  });
});

test.describe('Dashboard Page - Integration & End-to-End', () => {

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testUsers.validUser.username, testUsers.validUser.password);
  });

  /**
   * TC-E2E001: Complete User Flow - Morning Shift Start
   * Requirement: All User Stories
   */
  test('should support complete morning shift workflow', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    // Step 1: Login lands on dashboard
    await dashboardPage.verifyIsDefaultLandingPage();

    // Step 2: Review all metrics
    await dashboardPage.waitForMetricsToLoad();
    const metrics = await dashboardPage.getAllMetrics();

    // Verify all metrics are present
    expect(metrics.checkInsToday).toBeGreaterThanOrEqual(0);
    expect(metrics.checkOutsToday).toBeGreaterThanOrEqual(0);
    expect(metrics.currentlyCheckedIn).toBeGreaterThanOrEqual(0);
    expect(metrics.roomsForCleaning).toBeGreaterThanOrEqual(0);

    // Step 3: Click on Check-ins Today
    await dashboardPage.clickCheckInsToday();
    await dashboardPage.verifyURL('/bookings');

    // Step 4: Return to Dashboard
    await dashboardPage.navigateToSection('Dashboard');
    await dashboardPage.verifyDashboardPage();

    // Step 5: Click on Rooms For Cleaning
    await dashboardPage.clickRoomsForCleaning();
    await dashboardPage.verifyURL('/rooms');

    // Step 6: Return to Dashboard
    await dashboardPage.navigateToSection('Dashboard');
    await dashboardPage.verifyDashboardPage();

    // Verify smooth navigation throughout
    // (If we got here, all navigation worked)
  });

  /**
   * TC-E2E003: Complete User Flow - Filter Navigation
   * Requirement: FR-7
   */
  test('should navigate through all clickable metrics and clear filters', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.waitForMetricsToLoad();

    // Test 1: Check-ins Today
    await dashboardPage.clickCheckInsToday();
    await page.waitForTimeout(500);
    let clearButton = page.getByRole('button', { name: 'Clear Filter' });
    await clearButton.click();

    // Return to Dashboard
    await dashboardPage.navigateToSection('Dashboard');

    // Test 2: Check-outs Today
    await dashboardPage.clickCheckOutsToday();
    await page.waitForTimeout(500);
    clearButton = page.getByRole('button', { name: 'Clear Filter' });
    await clearButton.click();

    // Return to Dashboard
    await dashboardPage.navigateToSection('Dashboard');

    // Test 3: Currently Checked In
    await dashboardPage.clickCurrentlyCheckedIn();
    await page.waitForTimeout(500);
    clearButton = page.getByRole('button', { name: 'Clear Filter' });
    await clearButton.click();

    // Return to Dashboard
    await dashboardPage.navigateToSection('Dashboard');

    // Test 4: Rooms For Cleaning
    await dashboardPage.clickRoomsForCleaning();
    await page.waitForTimeout(500);
    clearButton = page.getByRole('button', { name: 'Clear Filter' });
    await clearButton.click();

    // Return to Dashboard
    await dashboardPage.navigateToSection('Dashboard');
    await dashboardPage.verifyDashboardPage();

    // If we got here, all navigation and filtering worked correctly
  });

  /**
   * TC-I001 & TC-I002: Dashboard to Bookings/Rooms Navigation Integration
   * Requirement: FR-7
   */
  test('should display matching counts between dashboard and filtered pages', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.waitForMetricsToLoad();

    // Get rooms for cleaning count from dashboard
    const dashboardRoomsCount = await dashboardPage.getMetricValue('Rooms For Cleaning');

    // Navigate to rooms page
    await dashboardPage.clickRoomsForCleaning();
    await page.waitForTimeout(1000);

    // Count rooms displayed on the filtered page
    const roomRows = page.locator('tbody tr');
    const pageRoomsCount = await roomRows.count();

    // Verify counts match
    expect(pageRoomsCount).toBe(dashboardRoomsCount);

    // Navigate back to dashboard
    await dashboardPage.navigateToSection('Dashboard');
    await dashboardPage.verifyDashboardPage();
  });
});

test.describe('Dashboard Page - Sidebar Navigation', () => {

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testUsers.validUser.username, testUsers.validUser.password);
  });

  test('should navigate to all sections via sidebar', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.waitForMetricsToLoad();

    // Test navigation to each section
    const sections = ['Users', 'Guests', 'Rooms', 'Bookings', 'Settings', 'Dashboard'];

    for (const section of sections) {
      await dashboardPage.navigateToSection(section);

      // Wait for page to load
      await page.waitForTimeout(500);

      // Verify URL changed (Dashboard is at root "/")
      const url = page.url();
      if (section === 'Dashboard') {
        expect(url).toMatch(/\/(dashboard)?$/);
      } else {
        expect(url).toContain(section.toLowerCase());
      }
    }

    // Should end up back on dashboard
    await dashboardPage.verifyDashboardPage();
  });
});
