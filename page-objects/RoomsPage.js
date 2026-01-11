// @ts-check
import { expect } from '@playwright/test';
import { BasePage } from './BasePage.js';

/**
 * Page object for the rooms management page
 */
export class RoomsPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Main page elements
    this.addRoomButton = this.getByRole('button', { name: 'Add Room' });
    this.pageTitle = this.getByRole('heading', { name: 'Rooms' });
    
    // Table elements
    this.roomsTable = this.page.locator('[data-testid="rooms-table"], table').first();
    
    // Filter elements
    this.roomTypeFilter = this.page.locator('select, [data-testid="room-type-filter"]').first();
    this.statusFilter = this.page.locator('select, [data-testid="status-filter"]').nth(1);
    this.searchButton = this.getByRole('button', { name: 'Search' });
    // Clear button - there might be multiple, so use a more specific selector
    this.clearButton = this.page.locator('button').filter({ hasText: 'Clear' }).first();
  }

  /**
   * Verify we're on the rooms page
   */
  async verifyRoomsPage() {
    // Wait for page to fully load
    await this.page.waitForLoadState('domcontentloaded');

    // Wait for either loading text to disappear or for it to not exist
    try {
      await this.page.waitForSelector('text=Loading rooms...', { state: 'detached', timeout: 3000 });
    } catch (e) {
      // Loading text might not appear if data loads quickly
    }

    // Wait a bit for any state transitions to complete
    await this.page.waitForTimeout(500);

    // Now verify the page elements
    await this.expectVisible(this.addRoomButton);
    await this.expectVisible(this.pageTitle);
  }

  /**
   * Click the Add Room button
   */
  async clickAddRoom() {
    await this.addRoomButton.click();
    await this.waitForLoad();
  }

  /**
   * Filter rooms by type
   * @param {string} roomType - Room type to filter by
   * Valid options: 'All Types', 'Suite', 'Deluxe', 'Deluxe Back', 'Quadruple', 'Family', 'Group', 'Group Back'
   */
  async filterByRoomType(roomType) {
    // Wait for filter to be visible
    await this.page.waitForTimeout(300);
    await this.roomTypeFilter.selectOption({ value: roomType });
    await this.page.waitForTimeout(300); // Wait for filter to apply
  }

  /**
   * Filter rooms by status
   * @param {string} status - Status to filter by
   */
  async filterByStatus(status) {
    await this.statusFilter.selectOption({ value: status });
  }

  /**
   * Search rooms
   */
  async searchRooms() {
    await this.searchButton.click();
    await this.waitForLoad();
  }

  /**
   * Clear filters
   */
  async clearFilters() {
    await this.clearButton.click();
    await this.waitForLoad();
  }

  /**
   * Verify room appears in the list
   * @param {string} roomName
   * @param {number} capacity
   * @param {number} [price]
   */
  async verifyRoomInList(roomName, capacity, price) {
    await this.expectVisible(this.getByText(roomName).first());
    await this.expectVisible(this.getByText(capacity.toString()).first());
    
    if (price !== undefined) {
      await this.expectVisible(this.getByText(price.toString()).first());
    }
  }

  /**
   * Verify room details in the table
   * @param {Object} roomDetails
   * @param {string} roomDetails.name
   * @param {number} roomDetails.capacity
   * @param {number} [roomDetails.price] - Legacy: maps to weekdayPrice
   * @param {number} [roomDetails.weekdayPrice]
   * @param {string} [roomDetails.status]
   */
  async verifyRoomDetails(roomDetails) {
    const { name, capacity, price, weekdayPrice, status } = roomDetails;
    
    // Find the row containing the room name (use tbody to avoid header row)
    const roomRow = this.page.locator('tbody tr').filter({ hasText: name }).first();
    await roomRow.waitFor({ state: 'visible', timeout: 10000 });
    
    // Verify capacity (formatted as "X pax" not "X people")
    await this.expectVisible(roomRow.getByText(`${capacity} pax`).first());
    
    // Verify weekday price if provided (formatted as PHP currency)
    const priceToCheck = weekdayPrice !== undefined ? weekdayPrice : price;
    if (priceToCheck !== undefined) {
      // The formatPricing function uses Intl.NumberFormat which formats as ₱X,XXX.XX
      // Format the price the same way the UI does
      const formattedPrice = new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2
      }).format(priceToCheck).replace('PHP', '₱');
      
      // Try to find the price in the weekday price column
      // Use a more flexible locator that matches the formatted price
      const priceCell = roomRow.locator('td').filter({ hasText: formattedPrice });
      await this.expectVisible(priceCell.first());
    }
    
    // Verify status if provided (displayed as "Vacant", "Occupied", or "For Cleaning")
    // Status is displayed as a SELECT dropdown (editable) or a badge span (read-only)
    // Check both possibilities: select dropdown (when editable) or badge span (when read-only)
    if (status) {
      const statusValue = status === 'vacant' ? 'vacant' : status === 'occupied' ? 'occupied' : 'for_cleaning';
      const displayStatus = status === 'vacant' ? 'Vacant' : status === 'occupied' ? 'Occupied' : 'For Cleaning';
      
      // First check if there's a select dropdown (editable status)
      const statusSelect = roomRow.locator('td select').first();
      const selectExists = await statusSelect.count() > 0;
      
      if (selectExists) {
        // Status is displayed as a select dropdown - check the selected value
        const selectedValue = await statusSelect.inputValue();
        expect(selectedValue).toBe(statusValue);
      } else {
        // Status is displayed as a badge span (read-only) - find the badge
        const statusBadge = roomRow.locator('td span').filter({ hasText: displayStatus }).first();
        await statusBadge.waitFor({ state: 'visible', timeout: 5000 });
        await this.expectVisible(statusBadge);
      }
    }
  }

  /**
   * Edit a room by name
   * @param {string} roomName
   */
  async editRoom(roomName) {
    const roomRow = this.page.locator('tr').filter({ hasText: roomName });
    
    // First click the actions dropdown trigger
    const actionsButton = roomRow.getByRole('button', { name: 'Actions menu' });
    await actionsButton.click();
    
    // Then click the Edit option in the dropdown
    const editButton = roomRow.getByText('Edit');
    await editButton.click();
    await this.waitForLoad();
  }

  /**
   * Delete a room by name
   * @param {string} roomName
   */
  async deleteRoom(roomName) {
    const roomRow = this.page.locator('tr').filter({ hasText: roomName });
    
    // First click the actions dropdown trigger
    const actionsButton = roomRow.getByRole('button', { name: 'Actions menu' });
    await actionsButton.click();
    await this.page.waitForTimeout(300); // Wait for dropdown to open
    
    // Then click the Delete option in the dropdown
    const deleteButton = roomRow.getByText('Delete');
    await deleteButton.click();
    await this.page.waitForTimeout(500); // Wait for confirmation dialog to appear
    
    // Handle the React ConfirmationDialog (not browser dialog)
    // Look for the confirmation dialog and click the confirm button
    const confirmDeleteButton = this.page.getByRole('button', { name: /Delete Room|Confirm|Yes/i });
    await confirmDeleteButton.click();
    
    // Wait for deletion to complete
    await this.waitForLoad();
    await this.page.waitForTimeout(1000); // Wait for room to be removed from list
  }

  /**
   * Get the count of rooms displayed
   */
  async getRoomCount() {
    const roomRows = this.roomsTable.locator('tbody tr');
    return await roomRows.count();
  }

  /**
   * Verify room is not in the list (for deletion verification)
   * @param {string} roomName
   */
  async verifyRoomNotInList(roomName) {
    const roomText = this.getByText(roomName);
    await expect(roomText).not.toBeVisible();
  }
}
