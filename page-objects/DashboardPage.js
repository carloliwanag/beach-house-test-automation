// @ts-check
import { expect } from '@playwright/test';
import { BasePage } from './BasePage.js';

/**
 * Page object for the main dashboard page
 */
export class DashboardPage extends BasePage {
  constructor(page) {
    super(page);

    // Dashboard page elements
    this.pageTitle = this.getByRole('heading', { name: 'Dashboard', exact: true });
    this.refreshButton = this.getByRole('button', { name: 'Refresh' });

    // Metric card selectors (updated to match actual UI)
    this.checkInsTodayCard = this.page.locator('text=Incoming Check-ins Today').locator('..');
    this.checkOutsTodayCard = this.page.locator('text=Check-outs Today').locator('..');
    this.currentlyCheckedInCard = this.page.locator('text=Currently Checked In').locator('..');
    // Rooms For Cleaning is commented out in UI, so this selector may not work
    this.roomsForCleaningCard = this.page.locator('text=Rooms For Cleaning').locator('..');

    // Additional info elements
    this.totalGuestsInfo = this.page.locator('text=/Total Guests In-House/');
    this.lastUpdatedInfo = this.page.locator('text=/Last Updated/');

    // Side navigation links
    this.dashboardLink = this.getByRole('link', { name: 'Dashboard' });
    this.bookingsLink = this.getByRole('link', { name: 'Bookings' });
    this.usersLink = this.getByRole('link', { name: 'Users' });
    this.guestsLink = this.getByRole('link', { name: 'Guests' });
    this.roomsLink = this.getByRole('link', { name: 'Rooms' });
    this.settingsLink = this.getByRole('link', { name: 'Settings' });
  }

  /**
   * Verify we're on the dashboard page
   */
  async verifyDashboardPage() {
    await this.expectVisible(this.pageTitle);
    await this.expectVisible(this.refreshButton);
    await this.expectTextVisible('Incoming Check-ins Today');
    await this.expectTextVisible('Check-outs Today');
    await this.expectTextVisible('Currently Checked In');
    // Rooms For Cleaning is commented out in UI, so skip this check
    // await this.expectTextVisible('Rooms For Cleaning');
  }

  /**
   * Verify successful authentication and dashboard load
   * @param {string} username - Expected username to be displayed
   */
  async verifyAuthenticated(username) {
    // Verify application branding
    await this.expectTextVisible('Booking System');
    await this.expectTextVisible('Backoffice');

    // Verify user is authenticated
    await this.expectTextVisible(username);
    await this.expectTextVisible('Authenticated');

    // Verify side navigation is present
    await this.expectTextVisible('Management');
    await this.expectVisible(this.dashboardLink);
    await this.expectVisible(this.usersLink);
    await this.expectVisible(this.guestsLink);
    await this.expectVisible(this.roomsLink);
    await this.expectVisible(this.bookingsLink);
  }

  /**
   * Get the value of a specific metric card
   * @param {string} metricName - Name of the metric (Check-ins Today, Check-outs Today, etc.)
   * @returns {Promise<number>}
   */
  async getMetricValue(metricName) {
    // Find the card containing the metric name, then find the value within it
    const metricCard = this.page.locator('div.rounded-lg.border-2.p-6').filter({ hasText: metricName });
    const valueElement = metricCard.locator('p.text-4xl.font-bold');
    const value = await valueElement.textContent();
    return parseInt(value?.trim() || '0', 10);
  }

  /**
   * Get all metric values
   * @returns {Promise<Object>}
   */
  async getAllMetrics() {
    return {
      checkInsToday: await this.getMetricValue('Incoming Check-ins Today'),
      checkOutsToday: await this.getMetricValue('Check-outs Today'),
      currentlyCheckedIn: await this.getMetricValue('Currently Checked In'),
      // roomsForCleaning: await this.getMetricValue('Rooms For Cleaning') // Commented out in UI
    };
  }

  /**
   * Verify metric card has correct color theme
   * @param {string} metricName
   * @param {string} expectedColorClass - e.g., 'bg-blue-50', 'bg-orange-50'
   */
  async verifyMetricCardColor(metricName, expectedColorClass) {
    const metricCard = this.page.locator('div.rounded-lg.border-2.p-6').filter({ hasText: metricName });
    await expect(metricCard).toHaveClass(new RegExp(expectedColorClass));
  }

  /**
   * Click on a metric card
   * @param {string} metricName
   */
  async clickMetricCard(metricName) {
    const metricCard = this.page.locator('div.rounded-lg.border-2.p-6').filter({ hasText: metricName });
    await metricCard.click();
    await this.waitForLoad();
  }

  /**
   * Click on Check-ins Today metric
   */
  async clickCheckInsToday() {
    await this.clickMetricCard('Incoming Check-ins Today');
  }

  /**
   * Click on Check-outs Today metric
   */
  async clickCheckOutsToday() {
    await this.clickMetricCard('Check-outs Today');
  }

  /**
   * Click on Currently Checked In metric
   */
  async clickCurrentlyCheckedIn() {
    await this.clickMetricCard('Currently Checked In');
  }

  /**
   * Click on Rooms For Cleaning metric
   */
  async clickRoomsForCleaning() {
    await this.clickMetricCard('Rooms For Cleaning');
  }

  /**
   * Click the refresh button
   */
  async clickRefresh() {
    await this.refreshButton.click();
    await this.waitForLoad();
  }

  /**
   * Get the last updated timestamp text
   * @returns {Promise<string>}
   */
  async getLastUpdatedTimestamp() {
    const timestamp = await this.lastUpdatedInfo.textContent();
    return timestamp?.replace('Last Updated: ', '').trim() || '';
  }

  /**
   * Get the total guests in-house count
   * @returns {Promise<number>}
   */
  async getTotalGuestsCount() {
    const text = await this.totalGuestsInfo.textContent();
    const match = text?.match(/Total Guests In-House:\s*(\d+)/);
    return parseInt(match?.[1] || '0', 10);
  }

  /**
   * Verify metric card is clickable (has pointer cursor on hover)
   * @param {string} metricName
   */
  async verifyMetricIsClickable(metricName) {
    const metricCard = this.page.locator('div.rounded-lg.border-2.p-6').filter({ hasText: metricName });

    // Hover over the card
    await metricCard.hover();

    // Check for hover effects (cursor pointer, scale, shadow)
    await expect(metricCard).toHaveClass(/cursor-pointer/);
  }

  /**
   * Navigate to a specific section via sidebar
   * @param {string} sectionName - Name of the section (Dashboard, Users, Guests, Rooms, Bookings, Settings)
   */
  async navigateToSection(sectionName) {
    await this.getByRole('link', { name: sectionName }).click();
    await this.waitForLoad();
  }

  /**
   * Verify current page URL
   * @param {string} expectedPath - Expected URL path
   */
  async verifyURL(expectedPath) {
    await expect(this.page).toHaveURL(new RegExp(expectedPath));
  }

  /**
   * Verify dashboard is the default landing page after login
   */
  async verifyIsDefaultLandingPage() {
    // URL should be either '/' or '/dashboard'
    const url = this.page.url();
    const isRootOrDashboard = url.endsWith('/') || url.includes('/dashboard');
    expect(isRootOrDashboard).toBe(true);

    // Dashboard title should be visible
    await this.expectVisible(this.pageTitle);
  }

  /**
   * Verify date is displayed in correct format
   */
  async verifyDateDisplay() {
    // Look for date pattern like "Thursday, October 16, 2025" or similar
    const datePattern = /\w+,\s+\w+\s+\d{1,2},\s+\d{4}/;
    const dateElement = this.page.locator('p.text-gray-600.mt-1').first();
    const dateText = await dateElement.textContent();
    expect(dateText).toMatch(datePattern);
  }

  /**
   * Verify metric cards are displayed in grid layout
   */
  async verifyGridLayout() {
    // Check for grid layout class
    const gridContainer = this.page.locator('div.grid');
    await this.expectVisible(gridContainer);

    // Verify metric cards are visible (3 cards since Rooms For Cleaning is commented out)
    const metricCards = this.page.locator('div.rounded-lg.border-2.p-6');
    await expect(metricCards).toHaveCount(3); // Updated from 4 to 3
  }

  /**
   * Verify a specific metric value
   * @param {string} metricName
   * @param {number} expectedValue
   */
  async verifyMetricValue(metricName, expectedValue) {
    const actualValue = await this.getMetricValue(metricName);
    expect(actualValue).toBe(expectedValue);
  }

  /**
   * Wait for metrics to load (loading state to disappear)
   */
  async waitForMetricsToLoad() {
    // Wait for loading spinner to disappear
    const loadingSpinner = this.page.locator('div.animate-spin');
    await expect(loadingSpinner).not.toBeVisible({ timeout: 10000 });

    // Wait for metrics to be visible
    await this.expectTextVisible('Incoming Check-ins Today');
    await this.expectTextVisible('Check-outs Today');
    await this.expectTextVisible('Currently Checked In');
  }

  /**
   * Logout from the application
   */
  async logout() {
    // Click the logout button (assuming it's represented by an icon/button)
    await this.page.click('button[title="Logout"]');
    await this.waitForLoad();
  }
}
