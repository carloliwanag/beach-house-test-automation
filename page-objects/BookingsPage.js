// @ts-check
import { expect } from '@playwright/test';
import { BasePage } from './BasePage.js';

/**
 * Page object for the bookings management page
 */
export class BookingsPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Main page elements
    this.createBookingButton = this.getByRole('button', { name: 'Create Booking' });
    this.pageTitle = this.getByRole('heading', { name: 'Bookings' });
    
    // Table elements
    this.bookingsTable = this.page.locator('[data-testid="bookings-table"], table').first();
    
    // Filter elements
    this.searchInput = this.page.locator('input[placeholder*="Search"], input[type="search"]').first();
  }

  /**
   * Verify we're on the bookings page
   */
  async verifyBookingsPage() {
    await this.expectVisible(this.createBookingButton);
    // We can check for the Create Booking button as it's prominently displayed
  }

  /**
   * Click the Create Booking button
   */
  async clickBookingCreate() {
    await this.createBookingButton.click();
    await this.waitForLoad();
  }

  /**
   * Search for a booking by guest name or other criteria
   * @param {string} searchTerm
   */
  async searchBooking(searchTerm) {
    // Look for search input - may need to adjust selector based on actual implementation
    await this.fill('input[placeholder*="Search"]', searchTerm);
  }

  /**
   * Verify booking appears in the list
   * @param {string} guestName - Full name of the guest
   * @param {string} status - Expected booking status (draft, confirmed, etc.)
   */
  async verifyBookingInList(guestName, status = 'draft') {
    // Look for guest name in the bookings table
    await this.expectVisible(this.getByText(guestName).first());
    
    // Verify the status badge or text
    const statusRegex = new RegExp(status, 'i');
    await this.expectVisible(this.page.getByText(statusRegex).first());
  }

  /**
   * Verify booking with specific details
   * @param {Object} bookingDetails
   * @param {string} bookingDetails.guestName
   * @param {string} bookingDetails.status
   * @param {string} [bookingDetails.checkIn]
   * @param {string} [bookingDetails.checkOut]
   * @param {string} [bookingDetails.bookingType]
   */
  async verifyBookingDetails(bookingDetails) {
    const { guestName, status, checkIn, checkOut, bookingType } = bookingDetails;
    
    // Verify guest name in table context (avoid hidden option elements)
    const tableRow = this.page.locator('tbody tr').filter({ hasText: guestName });
    await this.expectVisible(tableRow);
    
    // Verify status within the same row (case-insensitive search)
    const statusRegex = new RegExp(status, 'i');
    await this.expectVisible(tableRow.getByText(statusRegex));
    
    // Verify booking type if provided (case-insensitive search)
    if (bookingType) {
      const bookingTypeRegex = new RegExp(bookingType, 'i');
      await this.expectVisible(this.page.getByText(bookingTypeRegex).first());
    }
    
    // Check dates if provided (may need adjustment based on date format)
    if (checkIn) {
      // Convert datetime-local format to displayable format if needed
      const checkInDate = new Date(checkIn).toLocaleDateString();
      await this.expectVisible(this.page.getByText(checkInDate, { exact: false }).first());
    }
    
    if (checkOut) {
      const checkOutDate = new Date(checkOut).toLocaleDateString();
      await this.expectVisible(this.page.getByText(checkOutDate, { exact: false }).first());
    }
  }

  /**
   * Get the count of bookings displayed
   */
  async getBookingCount() {
    // This would need to be implemented based on how the booking count is displayed
    const bookingRows = this.page.locator('[data-testid="booking-row"]');
    return await bookingRows.count();
  }

  /**
   * Click on a specific booking to view details
   * @param {string} guestName
   */
  async clickBooking(guestName) {
    await this.getByText(guestName).first().click();
    await this.waitForLoad();
  }

  /**
   * Check-in a booking by guest name (via edit form)
   * @param {string} guestName
   */
  async checkInBooking(guestName) {
    // First edit the booking to open the form
    await this.editBooking(guestName);
    await this.page.waitForTimeout(1000);
    
    // Find and click the check-in button in the edit form
    const checkInButton = this.page.getByRole('button', { name: /Check In Guest/i });
    await checkInButton.waitFor({ state: 'visible', timeout: 5000 });
    await checkInButton.click();
    await this.waitForLoad();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check-out a booking by guest name
   * @param {string} guestName
   */
  async checkOutBooking(guestName) {
    // Use editBooking to navigate to edit form, then click check-out button
    await this.editBooking(guestName);
    await this.page.waitForTimeout(1000);
    
    // Find and click the check-out button in the edit form
    const checkOutButton = this.page.getByRole('button', { name: /Check Out Guest/i });
    await checkOutButton.waitFor({ state: 'visible', timeout: 5000 });
    await checkOutButton.click();
    await this.waitForLoad();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Cancel a booking by guest name (via delete)
   * @param {string} guestName
   */
  async cancelBooking(guestName) {
    // For now, canceling is the same as deleting
    // TODO: Update this if there's a specific cancel status flow
    await this.deleteBooking(guestName);
  }

  /**
   * Edit a booking by guest name
   * @param {string} guestName
   */
  async editBooking(guestName) {
    const bookingRow = this.page.locator('tbody tr').filter({ hasText: guestName }).first();
    
    // Click the actions dropdown trigger
    const actionsDropdown = bookingRow.getByRole('button', { name: 'Actions menu' });
    await actionsDropdown.click();
    
    // Click the edit option
    const editButton = this.page.getByRole('button', { name: 'Edit Booking' });
    await editButton.click();
    await this.waitForLoad();
  }

  /**
   * Delete a booking by guest name
   * @param {string} guestName
   */
  async deleteBooking(guestName) {
    const bookingRow = this.page.locator('tbody tr').filter({ hasText: guestName }).first();
    
    // Click the actions dropdown trigger
    const actionsDropdown = bookingRow.getByRole('button', { name: 'Actions menu' });
    await actionsDropdown.click();
    await this.page.waitForTimeout(500);
    
    // Click the delete option
    const deleteButton = this.page.getByRole('button', { name: 'Delete Booking' });
    await deleteButton.click();
    await this.page.waitForTimeout(500);
    
    // Handle React ConfirmationDialog (not browser dialog)
    // Look for confirmation dialog with "Delete" or "Confirm" button
    const confirmButton = this.page.getByRole('button', { name: /Delete|Confirm/i }).filter({ 
      hasText: /Delete|Confirm/i 
    });
    const confirmExists = await confirmButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (confirmExists) {
      // Click the confirm button in the React dialog
      await confirmButton.first().click();
      await this.waitForLoad();
      await this.page.waitForTimeout(1000);
    } else {
      // Fallback: try browser dialog if React dialog not found
      this.page.once('dialog', dialog => dialog.accept());
    }
  }

  /**
   * Verify booking is not in the list (for deletion verification)
   * @param {string} guestName
   */
  async verifyBookingNotInList(guestName) {
    const bookingText = this.getByText(guestName);
    await expect(bookingText).not.toBeVisible();
  }

  /**
   * Force checkout a booking by guest name
   * @param {string} guestName
   */
  async forceCheckoutBooking(guestName) {
    // Use flexible matching like editBooking does
    const bookingRow = this.page.locator('tbody tr').filter({ 
      hasText: new RegExp(guestName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') 
    }).first();
    
    await bookingRow.waitFor({ state: 'visible', timeout: 10000 });

    // Click the actions dropdown trigger
    const actionsDropdown = bookingRow.getByRole('button', { name: 'Actions menu' });
    await actionsDropdown.click();
    await this.page.waitForTimeout(500); // Wait for dropdown menu to appear

    // Click the force checkout option - wait for it to be visible
    const forceCheckoutButton = this.page.getByRole('button', { name: /force checkout/i });
    await forceCheckoutButton.waitFor({ state: 'visible', timeout: 5000 });
    await forceCheckoutButton.click();
    await this.waitForLoad();
  }

  /**
   * Verify force checkout dialog is visible
   */
  async verifyForceCheckoutDialog() {
    const dialogTitle = this.page.getByText(/Force Checkout.*Early Departure/i).first();
    await this.expectVisible(dialogTitle);
  }

  /**
   * Fill force checkout form
   * @param {Object} data
   * @param {string} data.actualCheckoutDateTime - ISO 8601 datetime string
   * @param {string} [data.reason] - Force checkout reason
   * @param {string} [data.notes] - Additional notes
   */
  async fillForceCheckoutForm(data) {
    const { actualCheckoutDateTime, reason, notes } = data;

    // Fill actual checkout date/time
    const formattedDateTime = actualCheckoutDateTime.slice(0, 16); // Convert to datetime-local format
    await this.page.fill('#actualCheckoutDateTime', formattedDateTime);
    await this.page.waitForTimeout(300);

    // Select reason if provided
    if (reason) {
      await this.page.selectOption('#reason', reason);
    }

    // Fill notes if provided
    if (notes) {
      await this.page.fill('#notes', notes);
    }
  }

  /**
   * Confirm staff confirmation checkbox
   */
  async confirmStaffAgreement() {
    // The checkbox is inside a label with text "I confirm that the guest agrees to pay"
    // Find the label by its text content
    const label = this.page.locator('label').filter({
      hasText: /I confirm that the guest agrees to pay/i
    }).first();
    await label.waitFor({ state: 'visible', timeout: 5000 });
    const checkbox = label.locator('input[type="checkbox"]').first();
    await checkbox.waitFor({ state: 'visible', timeout: 5000 });
    await checkbox.check();
    await this.page.waitForTimeout(200);
  }

  /**
   * Submit force checkout form
   */
  async submitForceCheckout() {
    const submitButton = this.page.getByRole('button', { name: /confirm force checkout/i });
    await submitButton.waitFor({ state: 'visible', timeout: 5000 });
    await submitButton.waitFor({ state: 'attached' }); // Ensure button is enabled
    await submitButton.click();
    await this.waitForLoad();
  }

  /**
   * Cancel force checkout dialog
   */
  async cancelForceCheckout() {
    const cancelButton = this.page.getByRole('button', { name: 'Cancel' });
    await cancelButton.click();
  }

  /**
   * Verify force checkout success (booking status changed to checked_out)
   * @param {string} guestName
   */
  async verifyForceCheckoutSuccess(guestName) {
    const bookingRow = this.page.locator('tbody tr').filter({ hasText: guestName });
    await this.expectVisible(bookingRow.getByText(/checked.?out/i));
  }

  /**
   * Get early checkout hours display
   */
  async getEarlyCheckoutHours() {
    const hoursText = this.page.getByText(/Early checkout:.*hours/i);
    const text = await hoursText.textContent();
    if (!text) return 0;
    const match = text.match(/(\d+\.?\d*)\s*hours/i);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Verify payment summary in force checkout dialog
   * @param {number} totalAmount
   * @param {number} refundAmount
   * @param {number} chargedAmount
   */
  async verifyForceCheckoutPaymentSummary(totalAmount, refundAmount, chargedAmount) {
    // Verify amounts in the payment summary section
    const summarySection = this.page.locator('div.bg-green-50');
    await this.expectVisible(summarySection);

    // Check total amount
    await this.expectVisible(summarySection.getByText(`₱${totalAmount.toLocaleString()}`).first());

    // Check refund amount (should be 0)
    await this.expectVisible(summarySection.getByText(`₱${refundAmount.toFixed(2)}`));

    // Check charged amount
    await this.expectVisible(summarySection.getByText(`₱${chargedAmount.toLocaleString()}`).last());
  }
}
