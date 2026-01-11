// @ts-check
import { BasePage } from './BasePage.js';

/**
 * Page object for the settings page
 */
export class SettingsPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Tab selectors
    this.generalTab = this.getByRole('button', { name: /General.*Resort information/ });
    this.pricingTab = this.getByRole('button', { name: /Pricing.*Entrance fees/ });
    
    // Page elements
    this.pageTitle = this.getByRole('heading', { name: 'Settings' });
    this.pageDescription = this.getByText('Manage your resort\'s configuration and preferences.');
  }

  /**
   * Verify we're on the settings page
   */
  async verifySettingsPage() {
    await this.expectVisible(this.pageTitle);
    await this.expectVisible(this.pageDescription);
    await this.expectVisible(this.generalTab);
    await this.expectVisible(this.pricingTab);
  }

  /**
   * Switch to the General tab
   */
  async switchToGeneralTab() {
    await this.generalTab.click();
    await this.waitForLoad();
  }

  /**
   * Switch to the Pricing tab
   */
  async switchToPricingTab() {
    await this.pricingTab.click();
    await this.waitForLoad();
  }

  /**
   * Verify which tab is currently active
   * @param {string} tabName - 'general' or 'pricing'
   */
  async verifyActiveTab(tabName) {
    if (tabName === 'general') {
      await this.expectVisible(this.getByRole('heading', { name: 'Resort Information' }));
    } else if (tabName === 'pricing') {
      await this.expectVisible(this.getByRole('heading', { name: 'Entrance Fees Configuration' }));
    }
  }
}

