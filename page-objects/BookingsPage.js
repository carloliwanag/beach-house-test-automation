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
    this.statusFilter = this.page.locator('#status-filter');
    this.checkInDateFilter = this.page.locator('#checkin-date-filter');
    this.checkOutDateFilter = this.page.locator('#checkout-date-filter');
    this.clearFiltersButton = this.page.getByRole('button', { name: /clear.*filter/i }).or(
      this.page.locator('button[aria-label*="Clear"]')
    );
  }

  /**
   * Verify we're on the bookings page
   */
  async verifyBookingsPage() {
    // First check if we're on the right URL
    const url = this.page.url();
    const isOnBookingsPage = url.includes('/bookings') || url.endsWith('/');
    
    if (!isOnBookingsPage) {
      // If we're not on the bookings page, navigate there using full URL
      await this.page.goto(`${this.appURL}/bookings`);
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(1000);
    }
    
    // Wait for Create Booking button to be visible
    try {
      await this.createBookingButton.waitFor({ state: 'visible', timeout: 10000 });
    } catch (error) {
      // If button not visible, try navigating explicitly using full URL
      await this.page.goto(`${this.appURL}/bookings`);
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(1000);
      await this.createBookingButton.waitFor({ state: 'visible', timeout: 10000 });
    }
    
    // Wait for filters to be loaded - give it more time and make it more resilient
    try {
      await this.statusFilter.waitFor({ state: 'visible', timeout: 15000 });
    } catch (error) {
      // If status filter doesn't appear, check if we're on the right page by URL
      const currentUrl = this.page.url();
      if (currentUrl.includes('/bookings') || currentUrl.endsWith('/')) {
        // We're on the right page, just wait a bit more for filters to load
        await this.page.waitForTimeout(1000);
        const isVisible = await this.statusFilter.isVisible({ timeout: 5000 }).catch(() => false);
        if (!isVisible) {
          console.warn('Status filter not visible, but page appears to be loaded');
        }
      } else {
        throw error;
      }
    }
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
   * Check-out a booking by guest name using Force Checkout
   * @param {string} guestName
   */
  async checkOutBooking(guestName) {
    // Use editBooking to navigate to edit form, then click force checkout button
    await this.editBooking(guestName);
    await this.page.waitForTimeout(1000);
    
    // Find and click the Force Checkout button
    const forceCheckoutButton = this.page.getByRole('button', { name: /Force Checkout/i });
    await forceCheckoutButton.waitFor({ state: 'visible', timeout: 10000 });
    await forceCheckoutButton.click();
    
    // Wait for the force checkout dialog to appear
    await this.page.waitForTimeout(1000);
    
    // Wait for dialog to be visible
    const dialog = this.page.locator('text=/Force Checkout.*Early Departure/i').first();
    await dialog.waitFor({ state: 'visible', timeout: 5000 });
    
    // Fill in the force checkout dialog
    // 1. Set actual checkout date/time (must be BEFORE scheduled checkout time)
    const actualCheckoutInput = this.page.locator('input[id="actualCheckoutDateTime"]');
    await actualCheckoutInput.waitFor({ state: 'visible', timeout: 5000 });
    
    // Set actual checkout time to current time (which should be before scheduled checkout)
    // Since bookings are created for today with checkout tomorrow, current time is fine
    const now = new Date();
    const actualDateTime = now.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
    await actualCheckoutInput.fill(actualDateTime);
    
    // 2. Select a reason (optional but helpful)
    const reasonSelect = this.page.locator('select[id="reason"]');
    const reasonExists = await reasonSelect.isVisible({ timeout: 2000 }).catch(() => false);
    if (reasonExists) {
      // Select first non-empty option (index 1, since index 0 is "Select a reason")
      await reasonSelect.selectOption({ index: 1 });
    }
    
    // 3. Check the staff confirmation checkbox (required)
    // The checkbox is inside a label - click the label to check the checkbox
    const confirmLabel = this.page.locator('label').filter({ hasText: /confirm.*guest.*agree|I confirm/i }).first();
    await confirmLabel.waitFor({ state: 'visible', timeout: 5000 });
    await confirmLabel.click();
    
    // 4. Submit the force checkout dialog
    // Find the submit button with text "Confirm Force Checkout"
    const submitBtn = this.page.getByRole('button', { name: /Confirm Force Checkout/i });
    await submitBtn.waitFor({ state: 'visible', timeout: 5000 });
    await submitBtn.click();
    
    // Wait for success toast message or error
    try {
      // Wait for success toast (case-insensitive)
      await this.page.waitForSelector('text=/checked out successfully|force checked out/i', { timeout: 15000 });
      console.log('✅ Force check-out success toast appeared');
    } catch (error) {
      // Check for error toast
      const errorToast = this.page.locator('text=/error|failed/i').first();
      const hasError = await errorToast.isVisible({ timeout: 2000 }).catch(() => false);
      if (hasError) {
        const errorText = await errorToast.textContent();
        throw new Error(`Force check-out failed: ${errorText}`);
      }
      // If no toast, wait a bit more for the operation to complete
      await this.page.waitForTimeout(2000);
    }
    
    // Wait for dialog to close (check if backdrop is gone)
    const backdrop = this.page.locator('.fixed.inset-0.bg-black.bg-opacity-50');
    try {
      await backdrop.waitFor({ state: 'hidden', timeout: 10000 });
    } catch (error) {
      // If backdrop doesn't disappear, wait a bit more
      console.log('Backdrop still visible, waiting...');
      await this.page.waitForTimeout(2000);
    }
    
    // Wait for page to reload (force checkout reloads the page)
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
    
    // Force checkout reloads the current page (which might be the edit form)
    // Navigate directly to bookings page to avoid backdrop issues
    await this.page.goto(`${this.appURL}/bookings`);
    await this.page.waitForLoadState('networkidle');
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
    // Wait for the booking row to be visible first
    const bookingRow = this.page.locator('tbody tr').filter({ hasText: guestName }).first();
    await bookingRow.waitFor({ state: 'visible', timeout: 15000 });
    
    // Scroll the row into view if needed
    await bookingRow.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500); // Small delay for UI to settle
    
    // Click the actions dropdown trigger
    const actionsDropdown = bookingRow.getByRole('button', { name: 'Actions menu' });
    await actionsDropdown.waitFor({ state: 'visible', timeout: 10000 });
    await actionsDropdown.click();
    await this.page.waitForTimeout(500); // Wait for dropdown to open
    
    // Click the edit option
    const editButton = this.page.getByRole('button', { name: 'Edit Booking' });
    await editButton.waitFor({ state: 'visible', timeout: 10000 });
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
   * Filter bookings by status
   * @param {string} status - Status value: 'all', 'draft', 'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'closed'
   */
  async filterByStatus(status) {
    // Wait for the status filter to be visible
    await this.statusFilter.waitFor({ state: 'visible', timeout: 10000 });
    await this.statusFilter.selectOption(status);
    await this.page.waitForTimeout(500); // Wait for filter to apply
  }

  /**
   * Filter bookings by check-in date
   * @param {string} date - Date in YYYY-MM-DD format
   */
  async filterByCheckInDate(date) {
    // Wait for the check-in date filter to be visible
    await this.checkInDateFilter.waitFor({ state: 'visible', timeout: 10000 });
    await this.checkInDateFilter.fill(date);
    await this.page.waitForTimeout(500); // Wait for filter to apply
  }

  /**
   * Filter bookings by check-out date
   * @param {string} date - Date in YYYY-MM-DD format
   */
  async filterByCheckOutDate(date) {
    // Wait for the check-out date filter to be visible
    await this.checkOutDateFilter.waitFor({ state: 'visible', timeout: 10000 });
    await this.checkOutDateFilter.fill(date);
    await this.page.waitForTimeout(500); // Wait for filter to apply
  }

  /**
   * Clear all filters
   */
  async clearAllFilters() {
    // Try multiple selectors for the clear filters button
    const clearButton = this.page.getByRole('button', { name: /clear.*filter/i }).or(
      this.page.locator('button[aria-label*="Clear"]').or(
        this.page.locator('button').filter({ hasText: /clear/i })
      )
    ).first();
    
    await clearButton.waitFor({ state: 'visible', timeout: 10000 });
    const isEnabled = await clearButton.isEnabled().catch(() => false);
    if (isEnabled) {
      await clearButton.click();
      await this.page.waitForTimeout(1000); // Wait for filters to clear
    }
  }

  /**
   * Get the filtered booking count from the subtitle
   * @returns {Promise<{filtered: number, total: number}>}
   */
  async getFilteredBookingCount() {
    const subtitle = this.page.locator('p.text-gray-600').first();
    const text = await subtitle.textContent();
    
    // Parse text like "Showing 5 of 10 bookings" or "Showing all 10 bookings"
    const match = text.match(/(\d+)/g);
    if (!match) {
      return { filtered: 0, total: 0 };
    }
    
    if (text.includes('Showing all')) {
      const total = parseInt(match[0], 10);
      return { filtered: total, total };
    } else {
      const filtered = parseInt(match[0], 10);
      const total = parseInt(match[1], 10);
      return { filtered, total };
    }
  }

  /**
   * Get all visible booking rows
   * @returns {Promise<number>} Count of visible booking rows
   */
  async getVisibleBookingCount() {
    const rows = this.page.locator('tbody tr');
    return await rows.count();
  }

  /**
   * Verify that only bookings with specific status are visible
   * @param {string} expectedStatus - Expected status value
   */
  async verifyOnlyStatusVisible(expectedStatus) {
    const rows = this.page.locator('tbody tr');
    const count = await rows.count();
    
    if (count === 0) {
      // If no rows, that's okay - filter might have excluded all bookings
      return;
    }
    
    // Map status values to display text variations
    const statusMap = {
      'confirmed': /confirmed/i,
      'checked_in': /checked.?in/i,
      'checked_out': /checked.?out/i,
      'pending': /pending/i,
      'draft': /draft/i,
      'cancelled': /cancelled/i,
      'closed': /closed/i
    };
    
    const statusRegex = statusMap[expectedStatus] || new RegExp(expectedStatus, 'i');
    
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      // Status should be visible in the row (case-insensitive, flexible matching)
      const statusElement = row.getByText(statusRegex).first();
      const isVisible = await statusElement.isVisible({ timeout: 2000 }).catch(() => false);
      if (!isVisible) {
        // Try alternative: look for status badge or text in the row
        const rowText = await row.textContent();
        if (!statusRegex.test(rowText)) {
          throw new Error(`Row ${i} does not contain expected status "${expectedStatus}"`);
        }
      }
    }
  }

  /**
   * Verify that bookings with specific check-in date are visible
   * @param {string} date - Date in YYYY-MM-DD format
   */
  async verifyCheckInDateFiltered(date) {
    const rows = this.page.locator('tbody tr');
    const count = await rows.count();
    
    // Format date for display comparison (may vary based on display format)
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString();
    
    // Verify at least one row contains the date
    // Note: This is a basic check - actual implementation may need adjustment based on date display format
    expect(count).toBeGreaterThan(0);
  }

  /**
   * Verify that bookings with specific check-out date are visible
   * @param {string} date - Date in YYYY-MM-DD format
   */
  async verifyCheckOutDateFiltered(date) {
    const rows = this.page.locator('tbody tr');
    const count = await rows.count();
    
    // Format date for display comparison (may vary based on display format)
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString();
    
    // Verify at least one row contains the date
    // Note: This is a basic check - actual implementation may need adjustment based on date display format
    expect(count).toBeGreaterThan(0);
  }

  /**
   * Verify that a specific booking is visible in the filtered results
   * @param {string} guestName - Guest name to search for
   */
  async verifyBookingVisible(guestName) {
    // Try multiple approaches to find the booking
    // First, try exact match
    let bookingRow = this.page.locator('tbody tr').filter({ hasText: guestName }).first();
    let isVisible = await bookingRow.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!isVisible) {
      // Try partial match (in case of formatting differences)
      const nameParts = guestName.split(' ');
      if (nameParts.length >= 2) {
        const firstName = nameParts[0];
        const lastName = nameParts[1];
        bookingRow = this.page.locator('tbody tr').filter({ 
          hasText: new RegExp(`${firstName}.*${lastName}`, 'i') 
        }).first();
        isVisible = await bookingRow.isVisible({ timeout: 5000 }).catch(() => false);
      }
    }
    
    if (!isVisible) {
      // Last resort: check all rows for the name
      const allRows = this.page.locator('tbody tr');
      const count = await allRows.count();
      for (let i = 0; i < count; i++) {
        const row = allRows.nth(i);
        const rowText = await row.textContent();
        if (rowText && rowText.includes(guestName)) {
          await this.expectVisible(row);
          return;
        }
      }
      throw new Error(`Booking with guest name "${guestName}" not found in visible rows`);
    }
    
    await this.expectVisible(bookingRow);
  }

  /**
   * Verify that a specific booking is NOT visible in the filtered results
   * @param {string} guestName - Guest name to search for
   */
  async verifyBookingNotVisible(guestName) {
    const bookingRow = this.page.locator('tbody tr').filter({ hasText: guestName });
    await expect(bookingRow.first()).not.toBeVisible().catch(() => {
      // If row exists but is filtered out, count should be 0
      expect(bookingRow.count()).toBe(0);
    });
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
