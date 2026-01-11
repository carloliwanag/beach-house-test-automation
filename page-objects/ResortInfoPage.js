// @ts-check
import { BasePage } from './BasePage.js';

/**
 * Page object for the resort information form (General tab)
 */
export class ResortInfoPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Form field selectors using data-testid
    this.resortNameInput = '[data-testid="resort-name"]';
    this.resortPhoneInput = '[data-testid="resort-phone"]';
    this.resortAddressInput = '[data-testid="resort-address"]';
    this.resortEmailInput = '[data-testid="resort-email"]';
    this.resortWebsiteInput = '[data-testid="resort-website"]';
    this.resortLogoInput = '[data-testid="resort-logo"]';
    
    // Buttons - use .first() since there may be multiple Save Changes buttons on settings page
    this.saveButton = this.getByRole('button', { name: /Save Changes|Saving/ }).first();
    
    // Page elements
    this.sectionTitle = this.getByRole('heading', { name: 'Resort Information' });
    this.sectionDescription = this.getByText('Basic information about your resort that appears throughout the system.');
  }

  /**
   * Verify we're on the resort info form
   */
  async verifyResortInfoForm() {
    await this.expectVisible(this.sectionTitle);
    await this.expectVisible(this.sectionDescription);
    await this.expectVisible(this.locator(this.resortNameInput));
    await this.expectVisible(this.saveButton);
  }

  /**
   * Fill the resort information form
   * @param {Object} resortData
   * @param {string} resortData.name
   * @param {string} resortData.phone
   * @param {string} resortData.address
   * @param {string} resortData.email
   * @param {string} [resortData.website]
   * @param {string} [resortData.logoUrl]
   */
  async fillResortInfo(resortData) {
    const { name, phone, address, email, website, logoUrl } = resortData;

    await this.fill(this.resortNameInput, name);
    await this.fill(this.resortPhoneInput, phone);
    await this.fill(this.resortAddressInput, address);
    await this.fill(this.resortEmailInput, email);
    
    if (website) {
      await this.fill(this.resortWebsiteInput, website);
    }
    
    if (logoUrl) {
      await this.fill(this.resortLogoInput, logoUrl);
    }
  }

  /**
   * Save the resort information
   */
  async saveResortInfo() {
    await this.saveButton.click();
    await this.waitForLoad();
  }

  /**
   * Complete flow: fill form and save
   * @param {Object} resortData - Resort data object
   */
  async updateResortInfo(resortData) {
    await this.fillResortInfo(resortData);
    await this.saveResortInfo();
  }

  /**
   * Get current form values
   * @returns {Promise<Object>}
   */
  async getCurrentResortInfo() {
    return {
      name: await this.locator(this.resortNameInput).inputValue(),
      phone: await this.locator(this.resortPhoneInput).inputValue(),
      address: await this.locator(this.resortAddressInput).inputValue(),
      email: await this.locator(this.resortEmailInput).inputValue(),
      website: await this.locator(this.resortWebsiteInput).inputValue(),
      logoUrl: await this.locator(this.resortLogoInput).inputValue(),
    };
  }

  /**
   * Verify success message is displayed
   */
  async verifySuccessMessage() {
    await this.expectTextVisible('Resort information updated successfully!');
  }

  /**
   * Verify validation error message
   * @param {string} message - Expected error message
   */
  async verifyValidationError(message) {
    await this.expectTextVisible(message);
  }

  /**
   * Clear all form fields
   */
  async clearAllFields() {
    await this.fill(this.resortNameInput, '');
    await this.fill(this.resortPhoneInput, '');
    await this.fill(this.resortAddressInput, '');
    await this.fill(this.resortEmailInput, '');
    await this.fill(this.resortWebsiteInput, '');
    await this.fill(this.resortLogoInput, '');
  }
}
