// @ts-check
import { expect } from '@playwright/test';
import { BasePage } from './BasePage.js';

/**
 * Page object for the add/edit booking form page
 */
export class AddBookingPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Form field selectors
    this.guestSelect = '#guestId'; // Legacy - now uses GuestSearchInput
    this.guestSearchInput = 'input[id="guestId"], input[placeholder*="Search guest"]';
    this.guestSearchDropdown = '[role="listbox"], .guest-search-dropdown, [data-testid="guest-search-dropdown"]';
    this.guestSearchOption = '[role="option"], .guest-option';
    this.checkInDateTimeInput = '#checkInDateTime';
    this.checkOutDateTimeInput = '#checkOutDateTime';
    // Guest breakdown fields (new)
    this.adultsCountInput = '#adultsCount';
    this.kidsCountInput = '#kidsCount';
    this.seniorsCountInput = '#seniorsCount';
    this.pwdCountInput = '#pwdCount';
    // Legacy field (still used for total display)
    this.numberOfGuestsInput = '#numberOfGuests';
    this.bookingTypeSelect = '#bookingType';
    this.totalAmountInput = '#totalAmount';
    this.notesInput = '#notes';
    
    // Room selection (may vary based on implementation)
    this.roomSelect = '#roomId';
    this.roomCheckboxes = 'input[type="checkbox"][name*="room"]';
    this.multipleRoomsModeCheckbox = 'input[type="checkbox"]';

    // Buttons
    this.saveButton = this.getByRole('button', { name: /Save Booking|Create Booking|Update Booking/ });
    this.cancelButton = this.getByRole('button', { name: 'Cancel' });

    // Booking Action Buttons (Edit Mode)
    this.checkInButton = this.getByRole('button', { name: /Check In Guest/i });
    this.checkOutButton = this.getByRole('button', { name: /Check Out Guest/i });
    this.extendBookingButton = this.getByRole('button', { name: /Extend Booking/i });
    this.printMealStubsButton = this.getByRole('button', { name: /Print Meal Stubs/i });
    this.generateInvoiceButton = this.getByRole('button', { name: /Generate Invoice/i });
    this.viewInvoiceButton = this.getByRole('button', { name: /View Invoice/i });
    this.forceCheckoutButton = this.getByRole('button', { name: /Force Checkout/i });
    
    // Note-related selectors
    this.addNoteButton = this.getByRole('button', { name: '+ Add Note' });
    this.noteContentInput = '#note-content, textarea[placeholder*="Enter your note"]';
    this.noteAttachmentInput = 'input[type="file"]';
    this.noteSubmitButton = this.getByRole('button', { name: /Add Note|Save Note/i });
    this.noteCancelButton = this.getByRole('button', { name: 'Cancel' });
    this.noteEditButton = 'button[aria-label*="Edit"]';
    this.noteDeleteButton = 'button[aria-label*="Delete"]';
    this.noteDownloadButton = 'button[aria-label*="Download"]';
    this.noteViewButton = 'button[aria-label*="View"]';
    
    // Page elements
    this.pageTitle = this.getByRole('heading', { name: /Create New Booking|Edit Booking/ });
    this.breadcrumbBookings = this.getByRole('button', { name: 'Bookings' });
  }

  /**
   * Verify we're on the add booking page
   */
  async verifyAddBookingPage() {
    await this.expectVisible(this.pageTitle);
    await this.expectVisible(this.breadcrumbBookings);
    await this.expectVisible(this.locator(this.checkInDateTimeInput));
    await this.expectVisible(this.locator(this.checkOutDateTimeInput));
  }

  /**
   * Fill the booking form with provided data
   * @param {Object} bookingData
   * @param {number} [bookingData.guestId]
   * @param {string} bookingData.checkInDateTime
   * @param {string} bookingData.checkOutDateTime
   * @param {number} [bookingData.numberOfGuests] - Legacy field (optional if breakdown provided)
   * @param {number} [bookingData.adultsCount] - Number of adults
   * @param {number} [bookingData.kidsCount] - Number of kids
   * @param {number} [bookingData.seniorsCount] - Number of seniors
   * @param {number} [bookingData.pwdCount] - Number of PWD guests
   * @param {string} [bookingData.bookingType='overnight']
   * @param {number} [bookingData.roomId]
   * @param {number[]} [bookingData.roomIds]
   * @param {number} [bookingData.totalAmount]
   * @param {string} [bookingData.notes]
   */
  async fillBookingForm(bookingData) {
    const {
      guestId,
      checkInDateTime,
      checkOutDateTime,
      numberOfGuests,
      adultsCount,
      kidsCount,
      seniorsCount,
      pwdCount,
      bookingType = 'overnight',
      roomId,
      roomIds,
      totalAmount,
      notes
    } = bookingData;
    
    // Extract guestName and roomName from bookingData if they exist (may not be in type definition)
    // Use type assertion to access properties that may not be in the type definition
    const guestName = /** @type {any} */ (bookingData).guestName;
    const roomName = /** @type {any} */ (bookingData).roomName;

    // Convert ISO datetime to datetime-local format if needed
    const checkInFormatted = checkInDateTime.includes('T') ? 
      checkInDateTime.slice(0, 16) : checkInDateTime;
    const checkOutFormatted = checkOutDateTime.includes('T') ? 
      checkOutDateTime.slice(0, 16) : checkOutDateTime;

    await this.fill(this.checkInDateTimeInput, checkInFormatted);
    await this.fill(this.checkOutDateTimeInput, checkOutFormatted);
    
    // Handle guest selection via GuestSearchInput component
    if (guestId) {
      // If we have a guest ID, we'd need to search for the guest first
      // For now, use guestName if available
      if (guestName) {
        await this.selectGuestByName(guestName);
      }
    } else if (guestName) {
      await this.selectGuestByName(guestName);
    }
    
    if (bookingType !== 'overnight') {
      await this.page.selectOption(this.bookingTypeSelect, { value: bookingType });
    }
    
    // Handle room selection - always select a room if none is selected
    // Always wait for rooms to load
    await this.page.waitForTimeout(1500);
    
    // Check if a room is already selected
    const currentRoomValue = await this.page.locator('#roomId').inputValue();
    
    if (!currentRoomValue || currentRoomValue === '') {
      // No room selected, need to select one
      if (roomId) {
        // Try to select by ID first
        try {
          await this.page.selectOption('#roomId', roomId.toString());
          const selectedValue = await this.page.locator('#roomId').inputValue();
          if (selectedValue && selectedValue !== '') {
            console.log(`Selected room by ID: ${roomId}`);
          } else {
            throw new Error('Room selection by ID failed');
          }
        } catch (error) {
          console.warn(`Room selection by ID failed, trying first available room: ${error.message}`);
          // Fallback to first available room
          await this.selectFirstAvailableRoom();
        }
      } else if (roomName) {
        // Try to select by name
        try {
          await this.page.selectOption('#roomId', { label: roomName });
          console.log(`Selected room by name: ${roomName}`);
        } catch (error) {
          console.warn('Room selection by name failed, trying first available room:', error.message);
          // Fallback to first available room
          await this.selectFirstAvailableRoom();
        }
      } else {
        // No roomId or roomName provided, select first available room
        await this.selectFirstAvailableRoom();
      }
    } else {
      console.log(`Room already selected: ${currentRoomValue}`);
    }
    
    // Fill guest breakdown AFTER selecting guest and room to avoid being overridden
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
    
    // Set booking status if provided
    const status = /** @type {any} */ (bookingData).status;
    if (status) {
      const statusSelect = this.page.locator('#status');
      const isVisible = await statusSelect.isVisible({ timeout: 2000 }).catch(() => false);
      if (isVisible) {
        await statusSelect.selectOption(status);
        console.log(`Set booking status to: ${status}`);
      }
    }
    
    if (roomIds && roomIds.length > 0) {
      // Handle multiple room selection via checkboxes
      for (const roomIdValue of roomIds) {
        await this.page.check(`input[type="checkbox"][value="${roomIdValue}"]`);
      }
    }
    
    if (totalAmount !== undefined) {
      await this.fill(this.totalAmountInput, totalAmount.toString());
    }
    
    if (notes) {
      // Notes field only exists in edit mode, skip in create mode
      const notesField = this.page.locator(this.notesInput);
      const isVisible = await notesField.isVisible({ timeout: 1000 }).catch(() => false);
      if (isVisible) {
        await this.fill(this.notesInput, notes);
      }
      // In create mode, notes are added via NotesSection after booking is created
    }
  }

  /**
   * Select the first available room (helper method)
   */
  async selectFirstAvailableRoom() {
    try {
      const firstRoomOption = await this.page.locator('#roomId option[value]:not([value=""])').first();
      if (firstRoomOption) {
        const firstRoomValue = await firstRoomOption.getAttribute('value');
        if (firstRoomValue) {
          await this.page.selectOption('#roomId', firstRoomValue);
          console.log(`Selected first available room with value: ${firstRoomValue}`);
          
          // Verify selection worked
          const selectedValue = await this.page.locator('#roomId').inputValue();
          if (selectedValue && selectedValue !== '') {
            console.log(`Room selection verified - current value: ${selectedValue}`);
          } else {
            throw new Error('Room selection verification failed');
          }
        } else {
          throw new Error('No room value found');
        }
      } else {
        throw new Error('No room options found');
      }
    } catch (error) {
      console.warn(`Failed to select first available room: ${error.message}`);
      throw new Error(`Room selection required but failed: ${error.message}`);
    }
  }

  /**
   * Fill guest breakdown fields
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
   * Get current guest breakdown values
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
   * Get total guests count (calculated from breakdown)
   * @returns {Promise<number>}
   */
  async getTotalGuestsCount() {
    const breakdown = await this.getGuestBreakdown();
    return breakdown.adultsCount + breakdown.kidsCount + breakdown.seniorsCount + breakdown.pwdCount;
  }

  /**
   * Select a guest for the booking using GuestSearchInput
   * @param {string} guestName - Guest name to search for (format: "FirstName LastName - PhoneNumber")
   */
  async selectGuest(guestName) {
    await this.selectGuestByName(guestName);
  }

  /**
   * Select a guest by name using the GuestSearchInput component
   * @param {string} guestName - Guest name to search for
   */
  async selectGuestByName(guestName) {
    // Extract just the name part (before " - ") for searching
    const namePart = guestName.split(' - ')[0];
    
    // Type at least 3 characters to trigger search
    const searchTerm = namePart.length >= 3 ? namePart.substring(0, 3) : namePart;
    
    // Wait for guest search input to be visible
    // Try multiple selectors to find the input
    const guestInput = this.page.locator('input[id="guestId"], input[placeholder*="Search guest"], input[placeholder*="Type at least"]').first();
    
    // Wait for input to be visible
    await guestInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForTimeout(300);
    
    await guestInput.click();
    await this.page.waitForTimeout(200);
    await guestInput.fill(searchTerm);
    
    // Wait for dropdown to appear and search results
    await this.page.waitForTimeout(800); // Wait for debounce (300ms) + API call
    
    // Wait for dropdown options to appear
    // The dropdown shows guest name and mobile number
    try {
      // Wait for any guest option to appear
      await this.page.waitForSelector('[role="option"], .guest-option, [data-testid*="guest"]', { timeout: 5000 });
    } catch (e) {
      // If no options appear, the guest might not exist yet
      throw new Error(`Guest search dropdown did not appear. Guest "${guestName}" might not exist.`);
    }
    
    // Find the guest option - it should contain the name part
    // The option might be in a role="option" or similar element
    const guestOption = this.page.locator(`[role="option"]:has-text("${namePart}"), .guest-option:has-text("${namePart}")`).first();
    
    // If not found, try with full guestName
    let optionFound = await guestOption.isVisible().catch(() => false);
    if (!optionFound) {
      const fullGuestOption = this.page.locator(`[role="option"]:has-text("${guestName}"), .guest-option:has-text("${guestName}")`).first();
      optionFound = await fullGuestOption.isVisible().catch(() => false);
      if (optionFound) {
        await fullGuestOption.click();
      }
    } else {
      await guestOption.click();
    }
    
    if (!optionFound) {
      throw new Error(`Could not find guest option for "${guestName}" in dropdown`);
    }
    
    // Wait for selection to complete
    await this.page.waitForTimeout(500);
  }

  /**
   * Select rooms for the booking
   * @param {string[]} roomNames - Array of room names to select
   */
  async selectRooms(roomNames) {
    for (const roomName of roomNames) {
      const roomCheckbox = this.page.locator(`input[type="checkbox"]`).filter({ hasText: roomName });
      await roomCheckbox.check();
    }
  }

  /**
   * Submit the booking form
   */
  async submitForm() {
    await this.saveButton.click();
    await this.waitForLoad();
  }

  /**
   * Cancel the form and return to bookings page
   */
  async cancelForm() {
    await this.cancelButton.click();
    await this.waitForLoad();
  }

  /**
   * Complete flow: fill form and submit
   * @param {Object} bookingData - Booking data object
   */
  async createBooking(bookingData) {
    await this.fillBookingForm(bookingData);
    await this.submitForm();
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
   * Verify booking summary or calculated fields
   * @param {Object} expectedData
   * @param {number} [expectedData.totalAmount]
   * @param {string} [expectedData.duration]
   */
  async verifyBookingSummary(expectedData) {
    const { totalAmount, duration } = expectedData;
    
    if (totalAmount !== undefined) {
      await this.expectTextVisible(totalAmount.toString());
    }
    
    if (duration) {
      await this.expectTextVisible(duration);
    }
  }

  /**
   * Update an existing booking
   * @param {Object} bookingData - Updated booking data
   */
  async updateBooking(bookingData) {
    await this.fillBookingForm(bookingData);
    await this.submitForm();
  }

  /**
   * Add a note to the booking
   * @param {Object} noteData
   * @param {string} noteData.content - Note content
   * @param {string[]} [noteData.filePaths] - Array of file paths to attach
   */
  async addNote(noteData) {
    const { content, filePaths = [] } = noteData;
    
    // Click Add Note button
    await this.addNoteButton.click();
    await this.waitForLoad();
    
    // Fill note content
    if (content) {
      await this.page.locator(this.noteContentInput).fill(content);
    }
    
    // Attach files if provided
    if (filePaths.length > 0) {
      const fileInput = this.page.locator(this.noteAttachmentInput);
      await fileInput.setInputFiles(filePaths);
    }
    
    // Submit the note
    await this.noteSubmitButton.click();
    await this.waitForLoad();
  }

  /**
   * Get all notes displayed on the page
   * @returns {Promise<Array>} Array of note objects
   */
  async getNotes() {
    const notes = [];
    const noteElements = await this.page.locator('[data-testid*="note"]').all();
    
    for (const noteElement of noteElements) {
      const content = await noteElement.textContent();
      const timestamp = await noteElement.locator('[data-testid*="timestamp"]').textContent();
      const attachmentCount = await noteElement.locator('[data-testid*="attachment-count"]').textContent();
      
      notes.push({
        content,
        timestamp,
        attachmentCount
      });
    }
    
    return notes;
  }

  /**
   * Click on a note to expand it
   * @param {number} noteIndex - Index of the note to click (0-based)
   */
  async expandNote(noteIndex) {
    const notes = this.page.locator('[data-testid*="note"]');
    await notes.nth(noteIndex).click();
    await this.waitForLoad();
  }

  /**
   * Edit a note
   * @param {number} noteIndex - Index of the note to edit
   * @param {Object} noteData - Updated note data
   */
  async editNote(noteIndex, noteData) {
    const { content, filePaths = [] } = noteData;
    
    // Expand the note first
    await this.expandNote(noteIndex);
    
    // Click edit button
    await this.page.locator(this.noteEditButton).nth(noteIndex).click();
    await this.waitForLoad();
    
    // Update content if provided
    if (content) {
      await this.page.locator(this.noteContentInput).fill(content);
    }
    
    // Update attachments if provided
    if (filePaths.length > 0) {
      const fileInput = this.page.locator(this.noteAttachmentInput);
      await fileInput.setInputFiles(filePaths);
    }
    
    // Submit changes
    await this.noteSubmitButton.click();
    await this.waitForLoad();
  }

  /**
   * Delete a note
   * @param {number} noteIndex - Index of the note to delete
   */
  async deleteNote(noteIndex) {
    // Expand the note first
    await this.expandNote(noteIndex);
    
    // Click delete button
    await this.page.locator(this.noteDeleteButton).nth(noteIndex).click();
    await this.waitForLoad();
    
    // Confirm deletion if confirmation dialog appears
    const confirmButton = this.page.getByRole('button', { name: /Confirm|Delete|Yes/ });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
      await this.waitForLoad();
    }
  }

  /**
   * Download a note attachment
   * @param {number} noteIndex - Index of the note
   * @param {number} attachmentIndex - Index of the attachment (0-based)
   */
  async downloadNoteAttachment(noteIndex, attachmentIndex = 0) {
    // Expand the note first
    await this.expandNote(noteIndex);
    
    // Click download button for the specified attachment
    await this.page.locator(this.noteDownloadButton).nth(attachmentIndex).click();
  }

  /**
   * View a note attachment
   * @param {number} noteIndex - Index of the note
   * @param {number} attachmentIndex - Index of the attachment (0-based)
   */
  async viewNoteAttachment(noteIndex, attachmentIndex = 0) {
    // Expand the note first
    await this.expandNote(noteIndex);
    
    // Click view button for the specified attachment
    await this.page.locator(this.noteViewButton).nth(attachmentIndex).click();
  }

  /**
   * Verify note is displayed
   * @param {string} expectedContent - Expected note content
   * @param {number} [expectedAttachmentCount] - Expected number of attachments
   */
  async verifyNoteDisplayed(expectedContent, expectedAttachmentCount) {
    await this.expectTextVisible(expectedContent);
    
    if (expectedAttachmentCount !== undefined) {
      const attachmentText = `${expectedAttachmentCount} file${expectedAttachmentCount !== 1 ? 's' : ''}`;
      await this.expectTextVisible(attachmentText);
    }
  }

  /**
   * Verify note attachment is downloadable
   * @param {number} noteIndex - Index of the note
   * @param {string} expectedFileName - Expected filename
   */
  async verifyAttachmentDownloadable(noteIndex, expectedFileName) {
    // Expand the note first
    await this.expandNote(noteIndex);

    // Check if download button is visible and contains expected filename
    const downloadButton = this.page.locator(this.noteDownloadButton).nth(0);
    await this.expectVisible(downloadButton);

    if (expectedFileName) {
      await this.expectTextVisible(expectedFileName);
    }
  }

  // ========== Multiple Rooms Mode ==========

  /**
   * Toggle multiple rooms mode
   * @param {boolean} enable - true to enable, false to disable
   */
  async toggleMultipleRoomsMode(enable) {
    // Try to find the checkbox or label
    const checkbox = this.page.locator('label:has-text("Select multiple rooms for large groups") input[type="checkbox"]');
    const label = this.page.locator('label:has-text("Select multiple rooms for large groups")');
    
    await checkbox.waitFor({ state: 'visible', timeout: 5000 });
    const isChecked = await checkbox.isChecked();

    if (enable && !isChecked) {
      // Click the label instead of the checkbox to avoid state change issues
      await label.click();
      await this.page.waitForTimeout(500); // Wait for UI update
      
      // Verify it's checked
      const nowChecked = await checkbox.isChecked();
      if (!nowChecked) {
        // Fallback: try clicking checkbox directly
        await checkbox.click();
        await this.page.waitForTimeout(500);
      }
    } else if (!enable && isChecked) {
      // Click the label to uncheck
      await label.click();
      await this.page.waitForTimeout(500); // Wait for UI update
      
      // Verify it's unchecked
      const nowChecked = await checkbox.isChecked();
      if (nowChecked) {
        // Fallback: try clicking checkbox directly
        await checkbox.click();
        await this.page.waitForTimeout(500);
      }
    }
  }

  /**
   * Select multiple rooms by IDs
   * @param {number[]} roomIds - Array of room IDs to select
   */
  async selectMultipleRooms(roomIds) {
    // Enable multiple rooms mode first
    await this.toggleMultipleRoomsMode(true);

    // Select each room
    for (const roomId of roomIds) {
      const roomCheckbox = this.page.locator(`input[type="checkbox"][value="${roomId}"]`);
      await roomCheckbox.check();
      await this.page.waitForTimeout(200); // Allow calculation to update
    }

    await this.waitForLoad();
  }

  /**
   * Get selected room count in multiple rooms mode
   * @returns {Promise<number>}
   */
  async getSelectedRoomCount() {
    const countText = await this.page.locator('label:has-text("Select Rooms")').textContent();
    if (!countText) return 0;
    const match = countText.match(/\((\d+) selected\)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Verify multiple rooms mode is enabled
   */
  async verifyMultipleRoomsModeEnabled() {
    const checkbox = this.page.locator('label:has-text("Select multiple rooms for large groups") input[type="checkbox"]');
    await expect(checkbox).toBeChecked();
    await this.expectTextVisible('Select Rooms');
  }

  // ========== Booking Actions (Edit Mode) ==========

  /**
   * Check in a guest (for confirmed bookings)
   */
  async checkInGuest() {
    await this.checkInButton.click();
    await this.waitForLoad();
  }

  /**
   * Check out a guest (for checked_in bookings)
   */
  async checkOutGuest() {
    await this.checkOutButton.click();
    await this.waitForLoad();
  }

  /**
   * Verify check-in button is visible
   */
  async verifyCheckInButtonVisible() {
    await this.expectVisible(this.checkInButton);
  }

  /**
   * Verify check-out button is visible
   */
  async verifyCheckOutButtonVisible() {
    await this.expectVisible(this.checkOutButton);
  }

  /**
   * Verify Force Checkout button is visible (for checked-in bookings)
   */
  async verifyForceCheckoutButtonVisible() {
    await this.expectVisible(this.forceCheckoutButton);
  }

  /**
   * Click Force Checkout button (opens force checkout dialog)
   */
  async clickForceCheckout() {
    await this.forceCheckoutButton.click();
    await this.waitForLoad();
  }

  // ========== Booking Extensions ==========

  /**
   * Verify extend booking button is visible
   */
  async verifyExtendBookingButtonVisible() {
    await this.expectVisible(this.extendBookingButton);
  }

  /**
   * Click extend booking button to open extension modal
   */
  async clickExtendBooking() {
    await this.extendBookingButton.click();
    await this.waitForLoad();
  }

  /**
   * Create a booking extension
   * @param {Object} extensionData
   * @param {string} extensionData.newCheckOutDateTime - New checkout date/time
   * @param {string} [extensionData.reason] - Extension reason
   */
  async createBookingExtension(extensionData) {
    const { newCheckOutDateTime, reason } = extensionData;

    // Click extend booking button
    await this.clickExtendBooking();

    // Wait for modal to appear
    await this.page.waitForSelector('text=/Extend Booking/', { timeout: 5000 });

    // Fill new checkout datetime
    if (newCheckOutDateTime) {
      const checkOutFormatted = newCheckOutDateTime.includes('T') ?
        newCheckOutDateTime.slice(0, 16) : newCheckOutDateTime;
      await this.page.locator('input[type="datetime-local"]').fill(checkOutFormatted);
    }

    // Fill reason if provided
    if (reason) {
      await this.page.locator('textarea[placeholder*="reason"]').fill(reason);
    }

    // Submit extension
    await this.page.getByRole('button', { name: /Confirm Extension|Submit/ }).click();
    await this.waitForLoad();
  }

  /**
   * Verify booking extension section is visible
   */
  async verifyBookingExtensionSectionVisible() {
    await this.expectTextVisible('Booking Extensions');
  }

  /**
   * Get booking extensions count
   * @returns {Promise<number>}
   */
  async getBookingExtensionsCount() {
    const extensionRows = await this.page.locator('[data-testid*="extension-row"]').count();
    return extensionRows;
  }

  // ========== Meal Stubs ==========

  /**
   * Print meal stubs for the booking
   */
  async printMealStubs() {
    // Set up download listener
    const downloadPromise = this.page.waitForEvent('download');

    await this.printMealStubsButton.click();

    // Wait for download to start
    const download = await downloadPromise;

    // Verify filename
    const fileName = download.suggestedFilename();
    expect(fileName).toMatch(/meal-stubs-booking-\d+\.pdf/);

    return download;
  }

  /**
   * Verify meal stubs button is visible
   */
  async verifyPrintMealStubsButtonVisible() {
    await this.expectVisible(this.printMealStubsButton);
  }

  /**
   * Verify meal stubs already printed (button disabled)
   */
  async verifyMealStubsAlreadyPrinted() {
    await expect(this.printMealStubsButton).toBeDisabled();
    await this.expectTextVisible('Meal Stubs Printed');
  }

  // ========== Invoice Operations ==========

  /**
   * Generate an invoice for the booking
   */
  async generateInvoice() {
    await this.generateInvoiceButton.click();
    await this.waitForLoad();

    // Wait for success message
    await this.page.waitForSelector('text=/Invoice generated successfully/', { timeout: 10000 });
  }

  /**
   * View/download the invoice
   */
  async viewInvoice() {
    // Set up download listener
    const downloadPromise = this.page.waitForEvent('download');

    await this.viewInvoiceButton.click();

    // Wait for download to start
    const download = await downloadPromise;

    // Verify filename
    const fileName = download.suggestedFilename();
    expect(fileName).toMatch(/invoice-booking-\d+\.pdf/);

    return download;
  }

  /**
   * Verify generate invoice button is visible
   */
  async verifyGenerateInvoiceButtonVisible() {
    await this.expectVisible(this.generateInvoiceButton);
  }

  /**
   * Verify view invoice button is visible (invoice exists)
   */
  async verifyViewInvoiceButtonVisible() {
    await this.expectVisible(this.viewInvoiceButton);
  }

  /**
   * Verify invoice items section is visible
   */
  async verifyInvoiceItemsSectionVisible() {
    await this.expectTextVisible('Invoice Items');
  }

  /**
   * Get invoice total amount
   * @returns {Promise<number>}
   */
  async getInvoiceTotalAmount() {
    const totalText = await this.page.locator('text=/Total Amount:.*₱/').textContent();
    if (!totalText) return 0;
    const match = totalText.match(/₱([\d,]+\.?\d*)/);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
    return 0;
  }

  // ========== Booking Status Verification ==========

  /**
   * Verify booking status is displayed
   * @param {string} expectedStatus - Expected status (draft, pending, confirmed, checked_in, checked_out, cancelled)
   */
  async verifyBookingStatus(expectedStatus) {
    const statusSelect = this.page.locator('#status');
    const selectedValue = await statusSelect.inputValue();
    expect(selectedValue).toBe(expectedStatus);
  }

  /**
   * Verify entrance fees are calculated and displayed
   * @param {number} expectedAmount - Expected entrance fees amount
   */
  async verifyEntranceFeesCalculated(expectedAmount) {
    const entranceFeesText = await this.page.locator('text=/Entrance Fees:.*₱/').textContent();
    if (!entranceFeesText) {
      throw new Error('Entrance fees not found on page');
    }
    const match = entranceFeesText.match(/₱([\d,]+\.?\d*)/);
    if (match) {
      const actualAmount = parseFloat(match[1].replace(/,/g, ''));
      expect(actualAmount).toBe(expectedAmount);
    } else {
      throw new Error('Entrance fees not found on page');
    }
  }

  /**
   * Verify total guests count is displayed correctly
   * @param {number} expectedCount - Expected total guests count
   */
  async verifyTotalGuestsCount(expectedCount) {
    const totalText = await this.page.locator('text=/Total Guests:.*\\d+/').textContent();
    if (!totalText) {
      throw new Error('Total guests count not found on page');
    }
    const match = totalText.match(/Total Guests:\s*(\d+)/);
    if (match) {
      const actualCount = parseInt(match[1]);
      expect(actualCount).toBe(expectedCount);
    } else {
      throw new Error('Total guests count not found on page');
    }
  }
}
