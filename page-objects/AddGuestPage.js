// @ts-check
import { expect } from '@playwright/test';
import { BasePage } from './BasePage.js';

/**
 * Page object for the add/edit guest form page
 */
export class AddGuestPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Form field selectors (using IDs as per the actual component)
    this.firstNameInput = '#firstName';
    this.lastNameInput = '#lastName';
    this.mobileNumberInput = '#mobileNumber';
    this.countryCodeSelect = '#countryCode';
    this.addressInput = '#address';
    this.vehiclePlateNumberInput = '#vehiclePlateNumber';
    this.notesInput = '#notes';
    this.statusSelect = '#status';
    
    // Booking form fields  
    this.createBookingCheckbox = this.getByRole('checkbox', { name: /Create draft reservation with this guest/ });
    this.checkInDateTimeInput = '#pencilCheckInDateTime';
    this.checkOutDateTimeInput = '#pencilCheckOutDateTime';
    // Guest breakdown fields for initial reservation
    this.adultsCountInput = '#pencilAdults';
    this.kidsCountInput = '#pencilKids';
    this.seniorsCountInput = '#pencilSeniors';
    this.pwdCountInput = '#pencilPwd';
    // Legacy field (still used for total display)
    this.numberOfGuestsInput = '#pencilNumberOfGuests';
    
    // Buttons
    this.saveButton = this.getByRole('button', { name: /Update Guest|Create Guest/ });
    this.cancelButton = this.getByRole('button', { name: 'Cancel' });
    
    // Breadcrumb and page elements - use more specific selectors
    this.pageTitle = this.getByRole('heading', { name: /Create New Guest|Edit Guest/ });
    this.breadcrumbGuests = this.getByRole('button', { name: 'Guests' }); // Breadcrumb is a button
  }

  /**
   * Verify we're on the add guest page
   */
  async verifyAddGuestPage() {
    await this.expectVisible(this.pageTitle);
    await this.expectVisible(this.breadcrumbGuests);
    await this.expectVisible(this.locator(this.firstNameInput));
    await this.expectVisible(this.locator(this.lastNameInput));
    await this.expectVisible(this.locator(this.mobileNumberInput));
  }

  /**
   * Fill the guest form with provided data
   * @param {Object} guestData
   * @param {string} guestData.firstName
   * @param {string} guestData.lastName
   * @param {string} guestData.mobileNumber
   * @param {string} [guestData.countryCode='+63']
   * @param {string} [guestData.address='']
   * @param {string} [guestData.vehiclePlateNumber='']
   * @param {string} [guestData.notes='']
   * @param {string} [guestData.status='not_ready']
   */
  async fillGuestForm(guestData) {
    const {
      firstName,
      lastName,
      mobileNumber,
      countryCode = '+63',
      address = '',
      vehiclePlateNumber = '',
      notes = '',
      status = 'not_ready'
    } = guestData;

    await this.fill(this.firstNameInput, firstName);
    await this.fill(this.lastNameInput, lastName);
    await this.fill(this.mobileNumberInput, mobileNumber);
    
    if (countryCode !== '+63') {
      await this.page.selectOption(this.countryCodeSelect, { value: countryCode });
    }
    
    if (address) {
      await this.fill(this.addressInput, address);
    }
    
    if (vehiclePlateNumber) {
      await this.fill(this.vehiclePlateNumberInput, vehiclePlateNumber);
    }
    
    if (notes) {
      await this.fill(this.notesInput, notes);
    }
    
    if (status !== 'not_ready') {
      await this.page.selectOption(this.statusSelect, { value: status });
    }
  }

  /**
   * Submit the guest form
   */
  async submitForm() {
    await this.saveButton.click();
    await this.waitForLoad();
  }

  /**
   * Cancel the form and return to guests page
   */
  async cancelForm() {
    await this.cancelButton.click();
    await this.waitForLoad();
  }

  /**
   * Complete flow: fill form and submit
   * @param {Object} guestData - Guest data object
   * @returns {Promise<string>} The ID of the created guest (mock ID as string)
   */
  async createGuest(guestData) {
    await this.fillGuestForm(guestData);
    await this.submitForm();
    
    // Wait for form submission to complete and navigation
    await this.page.waitForLoadState('networkidle');
    
    // Return a mock ID for test compatibility
    // In a real UI-only test, we wouldn't need to track IDs
    const mockId = `guest-${Date.now()}`;
    console.log(`✅ Created guest via UI with mock ID: ${mockId}`);
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
   * @param {Object} guestData - Expected values
   */
  async verifyFormData(guestData) {
    const firstNameValue = await this.page.inputValue(this.firstNameInput);
    const lastNameValue = await this.page.inputValue(this.lastNameInput);
    const mobileNumberValue = await this.page.inputValue(this.mobileNumberInput);
    
    if (guestData.firstName !== undefined) {
      expect(firstNameValue).toBe(guestData.firstName);
    }
    if (guestData.lastName !== undefined) {
      expect(lastNameValue).toBe(guestData.lastName);
    }
    if (guestData.mobileNumber !== undefined) {
      expect(mobileNumberValue).toBe(guestData.mobileNumber);
    }
  }

  /**
   * Enable booking creation by checking the checkbox
   */
  async enableBookingCreation() {
    await this.createBookingCheckbox.check();
    await this.page.waitForTimeout(500); // Wait for form to update
  }

  /**
   * Fill booking details
   * @param {Object} bookingData
   * @param {string} bookingData.checkInDateTime - ISO datetime string
   * @param {string} bookingData.checkOutDateTime - ISO datetime string
   * @param {number} [bookingData.numberOfGuests=1] - Number of guests (legacy)
   * @param {number} [bookingData.adultsCount] - Number of adults
   * @param {number} [bookingData.kidsCount] - Number of kids
   * @param {number} [bookingData.seniorsCount] - Number of seniors
   * @param {number} [bookingData.pwdCount] - Number of PWD
   */
  async fillBookingDetails(bookingData) {
    const { 
      checkInDateTime, 
      checkOutDateTime, 
      numberOfGuests, 
      adultsCount, 
      kidsCount, 
      seniorsCount, 
      pwdCount 
    } = bookingData;

    // Convert ISO datetime to datetime-local format if needed
    const checkInFormatted = checkInDateTime.includes('T') ? 
      checkInDateTime.slice(0, 16) : checkInDateTime;
    const checkOutFormatted = checkOutDateTime.includes('T') ? 
      checkOutDateTime.slice(0, 16) : checkOutDateTime;

    await this.fill(this.checkInDateTimeInput, checkInFormatted);
    await this.fill(this.checkOutDateTimeInput, checkOutFormatted);
    
    // Fill guest breakdown if provided, otherwise use legacy numberOfGuests
    if (adultsCount !== undefined || kidsCount !== undefined || seniorsCount !== undefined || pwdCount !== undefined) {
      await this.fillGuestBreakdown({
        adultsCount: adultsCount || 0,
        kidsCount: kidsCount || 0,
        seniorsCount: seniorsCount || 0,
        pwdCount: pwdCount || 0
      });
    } else if (numberOfGuests !== undefined) {
      // Legacy fallback: set all guests as adults
      await this.fillGuestBreakdown({
        adultsCount: numberOfGuests,
        kidsCount: 0,
        seniorsCount: 0,
        pwdCount: 0
      });
    }
  }

  /**
   * Fill guest breakdown fields for initial reservation
   * @param {Object} guestBreakdown
   * @param {number} guestBreakdown.adultsCount
   * @param {number} guestBreakdown.kidsCount
   * @param {number} guestBreakdown.seniorsCount
   * @param {number} guestBreakdown.pwdCount
   */
  async fillGuestBreakdown(guestBreakdown) {
    const { adultsCount, kidsCount, seniorsCount, pwdCount } = guestBreakdown;

    // Clear and fill each field to trigger React onChange events
    await this.page.locator(this.adultsCountInput).clear();
    await this.page.locator(this.adultsCountInput).fill(adultsCount.toString());
    await this.page.waitForTimeout(200); // Allow React to process the change

    await this.page.locator(this.kidsCountInput).clear();
    await this.page.locator(this.kidsCountInput).fill(kidsCount.toString());
    await this.page.waitForTimeout(200);

    await this.page.locator(this.seniorsCountInput).clear();
    await this.page.locator(this.seniorsCountInput).fill(seniorsCount.toString());
    await this.page.waitForTimeout(200);

    await this.page.locator(this.pwdCountInput).clear();
    await this.page.locator(this.pwdCountInput).fill(pwdCount.toString());
    await this.page.waitForTimeout(200);

    // Wait for all calculations to complete
    await this.waitForLoad();
  }

  /**
   * Get current guest breakdown values for initial reservation
   * @returns {Promise<Object>}
   */
  async getGuestBreakdown() {
    return {
      adultsCount: parseInt(await this.locator(this.adultsCountInput).inputValue()) || 0,
      kidsCount: parseInt(await this.locator(this.kidsCountInput).inputValue()) || 0,
      seniorsCount: parseInt(await this.locator(this.seniorsCountInput).inputValue()) || 0,
      pwdCount: parseInt(await this.locator(this.pwdCountInput).inputValue()) || 0
    };
  }

  /**
   * Get total guests count from guest breakdown
   * @returns {Promise<number>}
   */
  async getTotalGuestsCount() {
    const breakdown = await this.getGuestBreakdown();
    return breakdown.adultsCount + breakdown.kidsCount + breakdown.seniorsCount + breakdown.pwdCount;
  }

  /**
   * Create guest with booking data
   * @param {Object} guestData - Guest information
   * @param {Object} bookingData - Booking information
   */
  async createGuestWithBooking(guestData, bookingData) {
    await this.fillGuestForm(guestData);
    await this.enableBookingCreation();
    await this.fillBookingDetails(bookingData);
    await this.submitForm();
  }

  /**
   * Verify booking section is visible and form fields are available
   */
  async verifyBookingSection() {
    await this.expectTextVisible('Initial Reservation Details');
    await this.expectTextVisible('Create draft reservation with this guest');
    await this.expectVisible(this.createBookingCheckbox);
  }

  /**
   * Verify booking form is visible after enabling booking creation
   */
  async verifyBookingFormVisible() {
    await this.expectVisible(this.locator(this.checkInDateTimeInput));
    await this.expectVisible(this.locator(this.checkOutDateTimeInput));
    // Verify guest breakdown fields instead of legacy numberOfGuests field
    await this.expectVisible(this.locator(this.adultsCountInput));
    await this.expectVisible(this.locator(this.kidsCountInput));
    await this.expectVisible(this.locator(this.seniorsCountInput));
    await this.expectVisible(this.locator(this.pwdCountInput));
  }
}
