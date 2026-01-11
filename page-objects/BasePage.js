// @ts-check
import { expect } from '@playwright/test';

/**
 * Base page class with common functionality for all pages
 */
export class BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.appURL = 'http://localhost:5173';
  }

  /**
   * Navigate to the application
   */
  async goto() {
    await this.page.goto(this.appURL);
  }

  /**
   * Wait for the page to be fully loaded
   */
  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get a locator by role
   * @param {string} role
   * @param {Object} options
   */
  getByRole(role, options = {}) {
    // Use type assertion to allow any string role (Playwright will validate at runtime)
    return this.page.getByRole(/** @type {any} */ (role), options);
  }

  /**
   * Get a locator by test ID
   * @param {string} testId
   */
  getByTestId(testId) {
    return this.page.getByTestId(testId);
  }

  /**
   * Get a locator by text content
   * @param {string} text
   */
  getByText(text) {
    return this.page.getByText(text);
  }

  /**
   * Get a locator using CSS selector
   * @param {string} selector
   */
  locator(selector) {
    return this.page.locator(selector);
  }

  /**
   * Click on an element
   * @param {string} selector
   */
  async click(selector) {
    await this.page.click(selector);
  }

  /**
   * Fill an input field
   * @param {string} selector
   * @param {string} value
   */
  async fill(selector, value) {
    await this.page.fill(selector, value);
  }

  /**
   * Assert that an element is visible
   * @param {import('@playwright/test').Locator} locator
   */
  async expectVisible(locator) {
    await expect(locator).toBeVisible();
  }

  /**
   * Assert that text is visible on the page
   * @param {string} text
   */
  async expectTextVisible(text) {
    await expect(this.page.getByText(text)).toBeVisible();
  }

  /**
   * Assert page title
   * @param {RegExp|string} title
   */
  async expectTitle(title) {
    await expect(this.page).toHaveTitle(title);
  }
}
