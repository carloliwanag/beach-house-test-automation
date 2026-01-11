// @ts-check
import { BasePage } from './BasePage.js';

/**
 * Page object for the login page
 */
export class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Selectors
    this.usernameInput = '#username';
    this.passwordInput = '#password';
    this.signInButton = 'button[type="submit"]';
  }

  /**
   * Perform login with credentials
   * @param {string} username
   * @param {string} password
   */
  async login(username, password) {
    await this.fill(this.usernameInput, username);
    await this.fill(this.passwordInput, password);
    await this.getByRole('button', { name: 'Sign in' }).click();
    await this.waitForLoad();
  }

  /**
   * Verify we're on the login page
   */
  async verifyLoginPage() {
    await this.expectVisible(this.locator(this.usernameInput));
    await this.expectVisible(this.locator(this.passwordInput));
    await this.expectVisible(this.getByRole('button', { name: 'Sign in' }));
  }
}
