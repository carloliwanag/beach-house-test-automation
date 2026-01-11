// @ts-check
import { BasePage } from './BasePage.js';

/**
 * Page object for the guests management page
 */
export class GuestsPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Main page elements
    this.addGuestButton = this.getByRole('button', { name: 'Add Guest' });
    this.pageTitle = this.getByText('Guests');
    this.pageDescription = this.getByText('Manage guest information and preferences');
  }

  /**
   * Verify we're on the guests page
   */
  async verifyGuestsPage() {
    // Use heading role to be more specific
    await this.expectVisible(this.getByRole('heading', { name: 'Guests' }));
    await this.expectVisible(this.pageDescription);
    await this.expectVisible(this.addGuestButton);
  }

  /**
   * Click the Add Guest button
   */
  async clickAddGuest() {
    await this.addGuestButton.click();
    await this.waitForLoad();
  }

  /**
   * Search for a guest
   * @param {string} searchTerm
   */
  async searchGuest(searchTerm) {
    // Assuming there's a search input - need to verify actual selector
    await this.fill('input[placeholder*="Search"]', searchTerm);
  }

  /**
   * Verify guest appears in the list
   * @param {string} firstName
   * @param {string} lastName
   * @param {string} mobileNumber
   */
  async verifyGuestInList(firstName, lastName, mobileNumber) {
    // Look for guest information in the table/list using combined name to be more specific
    const fullName = `${firstName} ${lastName}`;
    await this.expectVisible(this.getByText(fullName).first());
    await this.expectVisible(this.getByText(mobileNumber).first());
  }

  /**
   * Get the count of guests displayed
   */
  async getGuestCount() {
    // This would need to be implemented based on how the guest count is displayed
    // For now, return a placeholder
    const guestRows = this.page.locator('[data-testid="guest-row"]');
    return await guestRows.count();
  }
}
