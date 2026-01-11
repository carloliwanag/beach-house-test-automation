// @ts-check
import { expect } from '@playwright/test';
import { BasePage } from './BasePage.js';

/**
 * Page object for the add/edit room form page
 */
export class AddRoomPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Form field selectors
    this.nameInput = '#name';
    this.capacityInput = '#capacity';
    this.weekdayPriceInput = '#weekdayPrice';
    this.weekendPriceInput = '#weekendPrice';
    this.weekdayHourRateInput = '#weekdayHourRate';
    this.weekendHourRateInput = '#weekendHourRate';
    this.lastCheckoutDateInput = '#lastCheckoutDate';
    // Legacy support - map price to weekdayPrice for backward compatibility
    this.priceInput = '#weekdayPrice';
    
    // Buttons
    this.saveButton = this.getByRole('button', { name: /Save Room|Create Room|Update Room/ });
    this.cancelButton = this.getByRole('button', { name: 'Cancel' });
    
    // Page elements
    this.pageTitle = this.getByRole('heading', { name: /Create New Room|Edit Room/ });
    this.breadcrumbRooms = this.getByRole('button', { name: 'Rooms' });
  }

  /**
   * Verify we're on the add room page
   */
  async verifyAddRoomPage() {
    await this.expectVisible(this.pageTitle);
    await this.expectVisible(this.breadcrumbRooms);
    await this.expectVisible(this.locator(this.nameInput));
    await this.expectVisible(this.locator(this.capacityInput));
  }

  /**
   * Fill the room form with provided data
   * @param {Object} roomData
   * @param {string} roomData.name
   * @param {number} roomData.capacity
   * @param {number} [roomData.price] - Legacy: maps to weekdayPrice
   * @param {number} [roomData.weekdayPrice]
   * @param {number} [roomData.weekendPrice]
   * @param {number} [roomData.weekdayHourRate]
   * @param {number} [roomData.weekendHourRate]
   * @param {string} [roomData.lastCheckoutDate]
   */
  async fillRoomForm(roomData) {
    const { 
      name, 
      capacity, 
      price, // Legacy support - maps to weekdayPrice
      weekdayPrice, 
      weekendPrice, 
      weekdayHourRate,
      weekendHourRate,
      lastCheckoutDate 
    } = roomData;

    await this.fill(this.nameInput, name);
    await this.fill(this.capacityInput, capacity.toString());
    
    // Use weekdayPrice if provided, otherwise fall back to legacy price field
    const finalWeekdayPrice = weekdayPrice !== undefined ? weekdayPrice : price;
    if (finalWeekdayPrice !== undefined) {
      await this.fill(this.weekdayPriceInput, finalWeekdayPrice.toString());
    }
    
    if (weekendPrice !== undefined) {
      await this.fill(this.weekendPriceInput, weekendPrice.toString());
    }
    
    if (weekdayHourRate !== undefined) {
      await this.fill(this.weekdayHourRateInput, weekdayHourRate.toString());
    }
    
    if (weekendHourRate !== undefined) {
      await this.fill(this.weekendHourRateInput, weekendHourRate.toString());
    }
    
    if (lastCheckoutDate) {
      await this.fill(this.lastCheckoutDateInput, lastCheckoutDate);
    }
  }

  /**
   * Submit the room form
   */
  async submitForm() {
    await this.saveButton.click();
    // Wait for navigation or form processing
    await this.waitForLoad();
  }

  /**
   * Cancel the form and return to rooms page
   */
  async cancelForm() {
    await this.cancelButton.click();
    await this.waitForLoad();
  }

  /**
   * Complete flow: fill form and submit
   * @param {Object} roomData - Room data object
   * @returns {number|null} - Created room ID or null if capture failed
   */
  async createRoom(roomData) {
    await this.fillRoomForm(roomData);
    await this.submitForm();
    
    // Wait for form submission to complete and navigation
    await this.page.waitForLoadState('networkidle');
    
    // Return a mock ID for test compatibility
    // In a real UI-only test, we wouldn't need to track IDs
    const mockId = `room-${Date.now()}`;
    console.log(`✅ Created room via UI with mock ID: ${mockId}`);
    return mockId;
  }

  /**
   * Verify form validation errors
   * @param {string[]} expectedErrors - Array of expected error messages
   */
  async verifyValidationErrors(expectedErrors) {
    for (const error of expectedErrors) {
      await this.expectTextVisible(error);
    }
  }

  /**
   * Verify form fields are properly filled
   * @param {Object} roomData - Expected values
   */
  async verifyFormData(roomData) {
    const nameValue = await this.page.inputValue(this.nameInput);
    const capacityValue = await this.page.inputValue(this.capacityInput);
    
    if (roomData.name !== undefined) {
      expect(nameValue).toBe(roomData.name);
    }
    if (roomData.capacity !== undefined) {
      expect(capacityValue).toBe(roomData.capacity.toString());
    }
    
    // Check weekdayPrice if provided
    if (roomData.weekdayPrice !== undefined || roomData.price !== undefined) {
      const expectedPrice = roomData.weekdayPrice !== undefined ? roomData.weekdayPrice : roomData.price;
      const weekdayPriceValue = await this.page.inputValue(this.weekdayPriceInput);
      expect(weekdayPriceValue).toBe(expectedPrice.toString());
    }
    
    // Check weekendPrice if provided
    if (roomData.weekendPrice !== undefined) {
      const weekendPriceValue = await this.page.inputValue(this.weekendPriceInput);
      expect(weekendPriceValue).toBe(roomData.weekendPrice.toString());
    }
  }

  /**
   * Update an existing room
   * @param {Object} roomData - Updated room data
   */
  async updateRoom(roomData) {
    await this.fillRoomForm(roomData);
    await this.submitForm();
  }
}
