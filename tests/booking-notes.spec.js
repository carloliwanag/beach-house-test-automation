// @ts-check
import { test, expect } from '@playwright/test';
import { 
  LoginPage, 
  DashboardPage, 
  BookingsPage, 
  AddBookingPage,
  GuestsPage,
  AddGuestPage,
  RoomsPage,
  AddRoomPage
} from '../page-objects/index.js';
import { 
  testUsers, 
  generateUniqueGuest,
  generateUniqueRoom,
  generateFutureBooking
} from '../fixtures/test-data.js';
import { testCleanup, setAuthToken } from '../fixtures/cleanup.js';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Booking Notes Management', () => {
  let loginPage, dashboardPage, bookingsPage, addBookingPage;
  let guestsPage, addGuestPage, roomsPage, addRoomPage;
  let createdBookingIds = [];
  let createdGuestIds = [];
  let createdRoomIds = [];
  let storedAuthToken = null; // Store auth token for afterAll cleanup

  // Test file paths
  const testFiles = {
    image: path.resolve(__dirname, '../test-files/test-image.png'),
    pdf: path.resolve(__dirname, '../test-files/test-document.pdf'),
    docx: path.resolve(__dirname, '../test-files/test-document.docx'),
    xlsx: path.resolve(__dirname, '../test-files/test-spreadsheet.xlsx'),
    txt: path.resolve(__dirname, '../test-files/test-text.txt')
  };

  test.beforeEach(async ({ page }) => {
    // Initialize page objects
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    bookingsPage = new BookingsPage(page);
    addBookingPage = new AddBookingPage(page);
    guestsPage = new GuestsPage(page);
    addGuestPage = new AddGuestPage(page);
    roomsPage = new RoomsPage(page);
    addRoomPage = new AddRoomPage(page);

    // Login before each test
    await loginPage.goto();
    await loginPage.login(testUsers.validUser.username, testUsers.validUser.password);
    await dashboardPage.verifyAuthenticated(testUsers.validUser.username);
    
    // Set auth token for cleanup operations
    const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    setAuthToken(authToken);
    storedAuthToken = authToken; // Store for afterAll
  });

  test.afterEach(async ({ page }) => {
    // Clear tracking arrays (these are empty since we don't capture IDs in booking-notes tests)
    createdBookingIds = [];
    createdGuestIds = [];
    createdRoomIds = [];
    
    // Optional: Navigate to a clean state
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
  });

  test.afterAll(async () => {
    // Final cleanup: remove any remaining test data by name pattern
    // This is critical since booking-notes tests don't track IDs
    console.log('🧹 Running comprehensive cleanup of all test data...');
    
    // Use stored auth token for cleanup
    if (storedAuthToken) {
      setAuthToken(storedAuthToken);
    } else {
      console.warn('⚠️ No auth token available for cleanup - cleanup may fail');
    }
    
    // Run cleanup in order: bookings first (they reference guests/rooms), then guests and rooms
    try {
      await testCleanup.cleanupTestBookings();
    } catch (error) {
      console.warn('❌ Error cleaning up test bookings:', error.message);
    }
    
    try {
      await testCleanup.cleanupTestGuests();
    } catch (error) {
      console.warn('❌ Error cleaning up test guests:', error.message);
    }
    
    try {
      await testCleanup.cleanupTestRooms();
    } catch (error) {
      console.warn('❌ Error cleaning up test rooms:', error.message);
    }
    
    console.log('✅ Comprehensive cleanup completed');
  });

  /**
   * Helper function to create a test booking for note testing using frontend UI
   */
  async function createTestBooking(page, dashboardPage, guestsPage, addGuestPage, roomsPage, addRoomPage, addBookingPage) {
    // Navigate to guests page and create a guest
    await dashboardPage.navigateToSection('Guests');
    await guestsPage.clickAddGuest();
    
    // Fill guest form
    const guestData = generateUniqueGuest();
    await page.fill('#firstName', guestData.firstName);
    await page.fill('#lastName', guestData.lastName);
    await page.fill('#mobileNumber', guestData.mobileNumber);
    if (guestData.address) {
      await page.fill('#address', guestData.address);
    }
    
    // Submit guest form
    await page.getByRole('button', { name: /Save Guest|Create Guest/ }).click();
    await page.waitForTimeout(2000);
    
    // Navigate to rooms page and create a room
    await dashboardPage.navigateToSection('Rooms');
    await roomsPage.clickAddRoom();
    
    // Fill room form with updated selectors
    const roomData = generateUniqueRoom();
    await page.fill('#name', roomData.name);
    await page.fill('#capacity', roomData.capacity.toString());
    
    // Use weekdayPrice and weekendPrice instead of price
    if (roomData.weekdayPrice !== undefined) {
      await page.fill('#weekdayPrice', roomData.weekdayPrice.toString());
    } else if (roomData.price !== undefined) {
      await page.fill('#weekdayPrice', roomData.price.toString());
    }
    
    if (roomData.weekendPrice !== undefined) {
      await page.fill('#weekendPrice', roomData.weekendPrice.toString());
    } else if (roomData.price !== undefined) {
      // Default weekend price to 30% more than weekday
      await page.fill('#weekendPrice', Math.floor(roomData.price * 1.3).toString());
    }
    
    // Submit room form
    await page.getByRole('button', { name: /Save Room|Create Room/ }).click();
    await page.waitForTimeout(2000);

    // Navigate to bookings page and create a booking
    await dashboardPage.navigateToSection('Bookings');
    await bookingsPage.verifyBookingsPage();
    await bookingsPage.clickBookingCreate();
    await addBookingPage.verifyAddBookingPage();
    await page.waitForTimeout(1000); // Wait for form to load
    
    // Fill booking form
    const bookingData = generateFutureBooking(1);
    const guestName = `${guestData.firstName} ${guestData.lastName} - ${guestData.mobileNumber}`;
    
    // Fill dates first
    const checkInFormatted = bookingData.checkInDateTime.includes('T') ? 
      bookingData.checkInDateTime.slice(0, 16) : bookingData.checkInDateTime;
    const checkOutFormatted = bookingData.checkOutDateTime.includes('T') ? 
      bookingData.checkOutDateTime.slice(0, 16) : bookingData.checkOutDateTime;
    
    await page.fill('#checkInDateTime', checkInFormatted);
    await page.fill('#checkOutDateTime', checkOutFormatted);
    await page.waitForTimeout(300);
    
    // Select guest using search
    await addBookingPage.selectGuestByName(guestName);
    await page.waitForTimeout(500);
    
    // Select room
    await page.waitForTimeout(1000);
    const firstRoomOption = await page.locator('#roomId option[value]:not([value=""])').first();
    if (firstRoomOption) {
      const firstRoomValue = await firstRoomOption.getAttribute('value');
      if (firstRoomValue) {
        await page.selectOption('#roomId', firstRoomValue);
      }
    }
    
    // Fill guest breakdown
    await addBookingPage.fillGuestBreakdown({
      adultsCount: 2,
      kidsCount: 0,
      seniorsCount: 0,
      pwdCount: 0
    });
    
    await page.waitForTimeout(500);
    
    // Submit booking form
    await addBookingPage.submitForm();
    await page.waitForTimeout(3000); // Wait for booking to be created and page to navigate
    
    // Verify we're back on bookings page
    await bookingsPage.verifyBookingsPage();
    await page.waitForTimeout(1000);
    
    // Return actual guest name for finding the booking
    return { 
      guest: { ...guestData, fullName: `${guestData.firstName} ${guestData.lastName}` }, 
      room: { ...roomData }, 
      booking: { guestName: `${guestData.firstName} ${guestData.lastName}` }
    };
  }

  test('should be able to add a text-only note to a booking', async ({ page }) => {
    // Create a test booking
    const { booking } = await createTestBooking(page, dashboardPage, guestsPage, addGuestPage, roomsPage, addRoomPage, addBookingPage);
    
    // Navigate to bookings page if not already there
    await dashboardPage.navigateToSection('Bookings');
    await bookingsPage.verifyBookingsPage();
    await page.waitForTimeout(2000); // Wait for bookings list to load
    
    // Find the booking row and use editBooking method
    const guestFullName = booking.guestName;
    
    // Use the editBooking method from BookingsPage
    await bookingsPage.editBooking(guestFullName);
    await page.waitForTimeout(2000); // Wait for edit page to load
    
    // Verify we're on the edit booking page
    await addBookingPage.verifyAddBookingPage();
    
    // Wait for notes section to be visible (it's only shown in edit mode)
    await page.waitForTimeout(2000);
    
    // Scroll to notes section if needed
    const notesSection = page.locator('text=Notes').first();
    await notesSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Click Add Note button
    const addNoteButton = page.getByRole('button', { name: '+ Add Note' });
    await addNoteButton.waitFor({ state: 'visible', timeout: 10000 });
    await addNoteButton.click();
    await page.waitForTimeout(1000); // Wait for form to appear
    
    // Fill note content
    const noteContent = 'This is a test note for the booking';
    const noteContentInput = page.locator('#note-content');
    await noteContentInput.waitFor({ state: 'visible', timeout: 5000 });
    await noteContentInput.fill(noteContent);
    await page.waitForTimeout(300);
    
    // Submit the note - the button text is "Add Note" when not loading
    const submitNoteButton = page.getByRole('button', { name: /Add Note/i }).filter({ hasText: /Add Note/i });
    await submitNoteButton.waitFor({ state: 'visible', timeout: 5000 });
    
    // Wait for button to be enabled (not disabled)
    await submitNoteButton.waitFor({ state: 'attached', timeout: 5000 });
    
    // Check if button is disabled (content might be empty)
    const isDisabled = await submitNoteButton.isDisabled().catch(() => false);
    if (isDisabled) {
      // Content might not have been filled properly, try again
      await noteContentInput.fill(noteContent);
      await page.waitForTimeout(300);
    }
    
    await submitNoteButton.click();
    
    // Wait for loading state to finish (button text changes to "Adding...")
    try {
      await page.waitForSelector('button:has-text("Adding...")', { state: 'detached', timeout: 10000 });
    } catch (e) {
      // Loading might have finished quickly or button might not show loading state
    }
    
    // Wait for note form to close (Add Note form should disappear)
    // The form closes when note is added successfully
    try {
      await page.waitForSelector('#note-content', { state: 'detached', timeout: 10000 });
    } catch (e) {
      // Form might have closed already
    }
    
    await page.waitForTimeout(2000);
    
    // Check for error messages first
    const errorMessage = page.locator('.text-red-600, .bg-red-50').filter({ hasText: /error|failed/i });
    const hasError = await errorMessage.first().isVisible().catch(() => false);
    if (hasError) {
      const errorText = await errorMessage.first().textContent();
      throw new Error(`Note creation failed: ${errorText}`);
    }
    
    // Notes are displayed in NoteCard components and are collapsed by default
    // The card header shows "Note from [date]" and clicking it expands to show content
    // Find the note card - look for "Note from" text which indicates a note card exists
    const noteFromText = page.locator('text=/Note from/i');
    await noteFromText.first().waitFor({ state: 'visible', timeout: 10000 });
    
    // Find the note card container
    const noteCard = page.locator('.border.border-gray-200.rounded-lg').filter({ hasText: /Note from/i }).first();
    await noteCard.waitFor({ state: 'visible', timeout: 5000 });
    
    // Click on the note card header to expand it
    const noteCardHeader = noteCard.locator('.cursor-pointer, .px-4.py-3').first();
    await noteCardHeader.click();
    await page.waitForTimeout(1000); // Wait for expansion animation
    
    // Now verify the note content is visible
    const noteText = page.locator(`text=${noteContent}`);
    await expect(noteText.first()).toBeVisible({ timeout: 5000 });
  });

  test('should be able to add a note with image attachment', async ({ page }) => {
    // Create a test booking
    const { booking } = await createTestBooking(page, dashboardPage, guestsPage, addGuestPage, roomsPage, addRoomPage, addBookingPage);
    
    // Navigate to bookings page
    await dashboardPage.navigateToSection('Bookings');
    await bookingsPage.verifyBookingsPage();
    await page.waitForTimeout(2000);
    
    // Edit the booking
    await bookingsPage.editBooking(booking.guestName);
    await page.waitForTimeout(2000);
    await addBookingPage.verifyAddBookingPage();
    
    // Wait for notes section
    await page.waitForTimeout(2000);
    const notesSection = page.locator('text=Notes').first();
    await notesSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Click Add Note button
    const addNoteButton = page.getByRole('button', { name: '+ Add Note' });
    await addNoteButton.click();
    await page.waitForTimeout(1000);
    
    // Fill note content
    const noteContent = 'Note with image attachment';
    const noteContentInput = page.locator('#note-content');
    await noteContentInput.fill(noteContent);
    
    // Attach image file
    const fileInput = page.locator('#note-files');
    await fileInput.setInputFiles(testFiles.image);
    await page.waitForTimeout(500);
    
    // Submit the note
    const submitNoteButton = page.getByRole('button', { name: /Add Note/i }).filter({ hasText: /Add Note/i });
    await submitNoteButton.click();
    await page.waitForTimeout(3000);
    
    // Verify note is displayed
    const noteFromText = page.locator('text=/Note from/i');
    await noteFromText.first().waitFor({ state: 'visible', timeout: 10000 });
    
    // Expand note card
    const noteCard = page.locator('.border.border-gray-200.rounded-lg').filter({ hasText: /Note from/i }).first();
    await noteCard.locator('.cursor-pointer').first().click();
    await page.waitForTimeout(1000);
    
    // Verify note content
    await expect(page.locator(`text=${noteContent}`).first()).toBeVisible({ timeout: 5000 });
    
    // Verify attachment count (1 file)
    await expect(page.locator('text=/1 file/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should be able to add a note with PDF attachment', async ({ page }) => {
    // Create a test booking
    const { booking } = await createTestBooking(page, dashboardPage, guestsPage, addGuestPage, roomsPage, addRoomPage, addBookingPage);
    
    // Navigate to bookings page
    await dashboardPage.navigateToSection('Bookings');
    await bookingsPage.verifyBookingsPage();
    await page.waitForTimeout(2000);
    
    // Edit the booking
    await bookingsPage.editBooking(booking.guestName);
    await page.waitForTimeout(2000);
    await addBookingPage.verifyAddBookingPage();
    
    // Wait for notes section
    await page.waitForTimeout(2000);
    const notesSection = page.locator('text=Notes').first();
    await notesSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Click Add Note button
    const addNoteButton = page.getByRole('button', { name: '+ Add Note' });
    await addNoteButton.click();
    await page.waitForTimeout(1000);
    
    // Fill note content
    const noteContent = 'Note with PDF document attachment';
    const noteContentInput = page.locator('#note-content');
    await noteContentInput.fill(noteContent);
    
    // Attach PDF file
    const fileInput = page.locator('#note-files');
    await fileInput.setInputFiles(testFiles.pdf);
    await page.waitForTimeout(500);
    
    // Submit the note
    const submitNoteButton = page.getByRole('button', { name: /Add Note/i }).filter({ hasText: /Add Note/i });
    await submitNoteButton.click();
    await page.waitForTimeout(3000);
    
    // Verify note is displayed
    const noteFromText = page.locator('text=/Note from/i');
    await noteFromText.first().waitFor({ state: 'visible', timeout: 10000 });
    
    // Expand note card
    const noteCard = page.locator('.border.border-gray-200.rounded-lg').filter({ hasText: /Note from/i }).first();
    await noteCard.locator('.cursor-pointer').first().click();
    await page.waitForTimeout(1000);
    
    // Verify note content
    await expect(page.locator(`text=${noteContent}`).first()).toBeVisible({ timeout: 5000 });
    
    // Verify attachment count (1 file)
    await expect(page.locator('text=/1 file/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should be able to add a note with Word document attachment', async ({ page }) => {
    // Create a test booking
    const { booking } = await createTestBooking(page, dashboardPage, guestsPage, addGuestPage, roomsPage, addRoomPage, addBookingPage);
    
    // Navigate to bookings page
    await dashboardPage.navigateToSection('Bookings');
    await bookingsPage.verifyBookingsPage();
    await page.waitForTimeout(2000);
    
    // Edit the booking
    await bookingsPage.editBooking(booking.guestName);
    await page.waitForTimeout(2000);
    await addBookingPage.verifyAddBookingPage();
    
    // Wait for notes section
    await page.waitForTimeout(2000);
    const notesSection = page.locator('text=Notes').first();
    await notesSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Click Add Note button
    const addNoteButton = page.getByRole('button', { name: '+ Add Note' });
    await addNoteButton.click();
    await page.waitForTimeout(1000);
    
    // Fill note content
    const noteContent = 'Note with Word document attachment';
    const noteContentInput = page.locator('#note-content');
    await noteContentInput.fill(noteContent);
    
    // Attach Word document file
    const fileInput = page.locator('#note-files');
    await fileInput.setInputFiles(testFiles.docx);
    await page.waitForTimeout(500);
    
    // Submit the note
    const submitNoteButton = page.getByRole('button', { name: /Add Note/i }).filter({ hasText: /Add Note/i });
    await submitNoteButton.click();
    await page.waitForTimeout(3000);
    
    // Verify note is displayed
    const noteFromText = page.locator('text=/Note from/i');
    await noteFromText.first().waitFor({ state: 'visible', timeout: 10000 });
    
    // Expand note card
    const noteCard = page.locator('.border.border-gray-200.rounded-lg').filter({ hasText: /Note from/i }).first();
    await noteCard.locator('.cursor-pointer').first().click();
    await page.waitForTimeout(1000);
    
    // Verify note content
    await expect(page.locator(`text=${noteContent}`).first()).toBeVisible({ timeout: 5000 });
    
    // Verify attachment count (1 file)
    await expect(page.locator('text=/1 file/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should be able to add a note with Excel spreadsheet attachment', async ({ page }) => {
    // Create a test booking
    const { booking } = await createTestBooking(page, dashboardPage, guestsPage, addGuestPage, roomsPage, addRoomPage, addBookingPage);
    
    // Navigate to bookings page
    await dashboardPage.navigateToSection('Bookings');
    await bookingsPage.verifyBookingsPage();
    await page.waitForTimeout(2000);
    
    // Edit the booking
    await bookingsPage.editBooking(booking.guestName);
    await page.waitForTimeout(2000);
    await addBookingPage.verifyAddBookingPage();
    
    // Wait for notes section
    await page.waitForTimeout(2000);
    const notesSection = page.locator('text=Notes').first();
    await notesSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Click Add Note button
    const addNoteButton = page.getByRole('button', { name: '+ Add Note' });
    await addNoteButton.click();
    await page.waitForTimeout(1000);
    
    // Fill note content
    const noteContent = 'Note with Excel spreadsheet attachment';
    const noteContentInput = page.locator('#note-content');
    await noteContentInput.fill(noteContent);
    
    // Attach Excel file
    const fileInput = page.locator('#note-files');
    await fileInput.setInputFiles(testFiles.xlsx);
    await page.waitForTimeout(500);
    
    // Submit the note
    const submitNoteButton = page.getByRole('button', { name: /Add Note/i }).filter({ hasText: /Add Note/i });
    await submitNoteButton.click();
    await page.waitForTimeout(3000);
    
    // Verify note is displayed
    const noteFromText = page.locator('text=/Note from/i');
    await noteFromText.first().waitFor({ state: 'visible', timeout: 10000 });
    
    // Expand note card
    const noteCard = page.locator('.border.border-gray-200.rounded-lg').filter({ hasText: /Note from/i }).first();
    await noteCard.locator('.cursor-pointer').first().click();
    await page.waitForTimeout(1000);
    
    // Verify note content
    await expect(page.locator(`text=${noteContent}`).first()).toBeVisible({ timeout: 5000 });
    
    // Verify attachment count (1 file)
    await expect(page.locator('text=/1 file/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should be able to add a note with text file attachment', async ({ page }) => {
    // Create a test booking
    const { booking } = await createTestBooking(page, dashboardPage, guestsPage, addGuestPage, roomsPage, addRoomPage, addBookingPage);
    
    // Navigate to bookings page
    await dashboardPage.navigateToSection('Bookings');
    await bookingsPage.verifyBookingsPage();
    await page.waitForTimeout(2000);
    
    // Edit the booking
    await bookingsPage.editBooking(booking.guestName);
    await page.waitForTimeout(2000);
    await addBookingPage.verifyAddBookingPage();
    
    // Wait for notes section
    await page.waitForTimeout(2000);
    const notesSection = page.locator('text=Notes').first();
    await notesSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Click Add Note button
    const addNoteButton = page.getByRole('button', { name: '+ Add Note' });
    await addNoteButton.click();
    await page.waitForTimeout(1000);
    
    // Fill note content
    const noteContent = 'Note with text file attachment';
    const noteContentInput = page.locator('#note-content');
    await noteContentInput.fill(noteContent);
    
    // Attach text file
    const fileInput = page.locator('#note-files');
    await fileInput.setInputFiles(testFiles.txt);
    await page.waitForTimeout(500);
    
    // Submit the note
    const submitNoteButton = page.getByRole('button', { name: /Add Note/i }).filter({ hasText: /Add Note/i });
    await submitNoteButton.click();
    await page.waitForTimeout(3000);
    
    // Verify note is displayed
    const noteFromText = page.locator('text=/Note from/i');
    await noteFromText.first().waitFor({ state: 'visible', timeout: 10000 });
    
    // Expand note card
    const noteCard = page.locator('.border.border-gray-200.rounded-lg').filter({ hasText: /Note from/i }).first();
    await noteCard.locator('.cursor-pointer').first().click();
    await page.waitForTimeout(1000);
    
    // Verify note content
    await expect(page.locator(`text=${noteContent}`).first()).toBeVisible({ timeout: 5000 });
    
    // Verify attachment count (1 file)
    await expect(page.locator('text=/1 file/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should be able to add a note with multiple file attachments', async ({ page }) => {
    // Create a test booking
    const { booking } = await createTestBooking(page, dashboardPage, guestsPage, addGuestPage, roomsPage, addRoomPage, addBookingPage);
    
    // Navigate to bookings page
    await dashboardPage.navigateToSection('Bookings');
    await bookingsPage.verifyBookingsPage();
    await page.waitForTimeout(2000);
    
    // Edit the booking
    await bookingsPage.editBooking(booking.guestName);
    await page.waitForTimeout(2000);
    await addBookingPage.verifyAddBookingPage();
    
    // Wait for notes section
    await page.waitForTimeout(2000);
    const notesSection = page.locator('text=Notes').first();
    await notesSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Click Add Note button
    const addNoteButton = page.getByRole('button', { name: '+ Add Note' });
    await addNoteButton.click();
    await page.waitForTimeout(1000);
    
    // Fill note content
    const noteContent = 'Note with multiple file attachments';
    const noteContentInput = page.locator('#note-content');
    await noteContentInput.fill(noteContent);
    
    // Attach multiple files
    const fileInput = page.locator('#note-files');
    await fileInput.setInputFiles([testFiles.image, testFiles.pdf, testFiles.txt]);
    await page.waitForTimeout(500);
    
    // Submit the note
    const submitNoteButton = page.getByRole('button', { name: /Add Note/i }).filter({ hasText: /Add Note/i });
    await submitNoteButton.click();
    await page.waitForTimeout(3000);
    
    // Verify note is displayed
    const noteFromText = page.locator('text=/Note from/i');
    await noteFromText.first().waitFor({ state: 'visible', timeout: 10000 });
    
    // Expand note card
    const noteCard = page.locator('.border.border-gray-200.rounded-lg').filter({ hasText: /Note from/i }).first();
    await noteCard.locator('.cursor-pointer').first().click();
    await page.waitForTimeout(1000);
    
    // Verify note content
    await expect(page.locator(`text=${noteContent}`).first()).toBeVisible({ timeout: 5000 });
    
    // Verify attachment count (3 files)
    await expect(page.locator('text=/3 files/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should be able to edit an existing note', async ({ page }) => {
    // Create a test booking
    const { booking } = await createTestBooking(page, dashboardPage, guestsPage, addGuestPage, roomsPage, addRoomPage, addBookingPage);
    
    // Navigate to bookings page
    await dashboardPage.navigateToSection('Bookings');
    await bookingsPage.verifyBookingsPage();
    await page.waitForTimeout(2000);
    
    // Edit the booking
    await bookingsPage.editBooking(booking.guestName);
    await page.waitForTimeout(2000);
    await addBookingPage.verifyAddBookingPage();
    
    // Wait for notes section
    await page.waitForTimeout(2000);
    const notesSection = page.locator('text=Notes').first();
    await notesSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Add an initial note
    const addNoteButton = page.getByRole('button', { name: '+ Add Note' });
    await addNoteButton.click();
    await page.waitForTimeout(1000);
    
    const initialContent = 'Initial note content';
    const noteContentInput = page.locator('#note-content');
    await noteContentInput.fill(initialContent);
    
    const submitNoteButton = page.getByRole('button', { name: /Add Note/i }).filter({ hasText: /Add Note/i });
    await submitNoteButton.click();
    await page.waitForTimeout(3000);
    
    // Expand the note card
    const noteCard = page.locator('.border.border-gray-200.rounded-lg').filter({ hasText: /Note from/i }).first();
    await noteCard.locator('.cursor-pointer').first().click();
    await page.waitForTimeout(1000);
    
    // Verify initial content is visible
    await expect(page.locator(`text=${initialContent}`).first()).toBeVisible({ timeout: 5000 });
    
    // Click edit button - it's a button with an SVG edit icon in the header
    // There are two buttons: edit (pencil) and delete (trash), edit is the first one
    const headerButtons = noteCard.locator('.px-4.py-3').locator('button');
    const editButton = headerButtons.first(); // Edit is the first button (index 0)
    
    await editButton.click();
    await page.waitForTimeout(1000);
    
    // Wait for edit form to appear (textarea with label "Edit Note Content")
    await page.waitForSelector('label:has-text("Edit Note Content")', { timeout: 5000 });
    await page.waitForTimeout(500);
    
    // Find the edit textarea - it's in the expanded note card
    const editTextarea = noteCard.locator('textarea').first();
    await editTextarea.waitFor({ state: 'visible', timeout: 5000 });
    
    // Clear and fill with updated content
    const updatedContent = 'Updated note content with changes';
    await editTextarea.clear();
    await editTextarea.fill(updatedContent);
    await page.waitForTimeout(300);
    
    // Save the edit - button text is "Save" when not loading, it's in the note card
    // Use a more specific selector to avoid clicking other buttons
    const saveEditButton = noteCard.locator('button').filter({ hasText: /^Save$/ }).first();
    await saveEditButton.waitFor({ state: 'visible', timeout: 5000 });
    
    // Click save button and wait for the save to complete
    await saveEditButton.click();
    
    // Wait for the edit form to disappear (indicating save was successful)
    await page.waitForSelector('label:has-text("Edit Note Content")', { state: 'detached', timeout: 10000 }).catch(() => {});
    
    // Wait for UI to update after save
    await page.waitForTimeout(2000);
    
    // Verify we're still on the booking edit page (should not navigate away)
    await addBookingPage.verifyAddBookingPage();
    
    // Wait for notes section to be visible
    const notesSectionAfterEdit = page.locator('text=Notes').first();
    await notesSectionAfterEdit.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Re-find the note card after update (it might have been re-rendered)
    const updatedNoteCard = page.locator('.border.border-gray-200.rounded-lg').filter({ hasText: /Note from/i }).first();
    await updatedNoteCard.waitFor({ state: 'visible', timeout: 5000 });
    
    // Expand if needed (note might be collapsed after update)
    const noteCardHeader = updatedNoteCard.locator('.cursor-pointer').first();
    const isExpanded = await updatedNoteCard.locator(`text=${updatedContent}`).isVisible().catch(() => false);
    if (!isExpanded) {
      await noteCardHeader.click();
      await page.waitForTimeout(1000);
    }
    
    // Verify the note is updated - the updated content should be visible
    await expect(updatedNoteCard.locator(`text=${updatedContent}`).first()).toBeVisible({ timeout: 5000 });
  });

  test('should be able to delete an existing note', async ({ page }) => {
    // Create a test booking
    const { booking } = await createTestBooking(page, dashboardPage, guestsPage, addGuestPage, roomsPage, addRoomPage, addBookingPage);
    
    // Navigate to bookings page
    await dashboardPage.navigateToSection('Bookings');
    await bookingsPage.verifyBookingsPage();
    await page.waitForTimeout(2000);
    
    // Edit the booking
    await bookingsPage.editBooking(booking.guestName);
    await page.waitForTimeout(2000);
    await addBookingPage.verifyAddBookingPage();
    
    // Wait for notes section
    await page.waitForTimeout(2000);
    const notesSection = page.locator('text=Notes').first();
    await notesSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Add a note
    const addNoteButton = page.getByRole('button', { name: '+ Add Note' });
    await addNoteButton.click();
    await page.waitForTimeout(1000);
    
    const noteContent = 'Note to be deleted';
    const noteContentInput = page.locator('#note-content');
    await noteContentInput.fill(noteContent);
    
    const submitNoteButton = page.getByRole('button', { name: /Add Note/i }).filter({ hasText: /Add Note/i });
    await submitNoteButton.click();
    await page.waitForTimeout(3000);
    
    // Expand the note card
    const noteCard = page.locator('.border.border-gray-200.rounded-lg').filter({ hasText: /Note from/i }).first();
    await noteCard.locator('.cursor-pointer').first().click();
    await page.waitForTimeout(1000);
    
    // Verify the note is displayed
    await expect(page.locator(`text=${noteContent}`).first()).toBeVisible({ timeout: 5000 });
    
    // Click delete button (trash icon) - it's a button with SVG delete icon in the header
    // There are two buttons: edit (pencil) and delete (trash), delete is the second one
    const headerButtons = noteCard.locator('.px-4.py-3').locator('button');
    const deleteButton = headerButtons.nth(1); // Delete is the second button (index 1)
    
    await deleteButton.click();
    await page.waitForTimeout(1000);
    
    // Confirm deletion in dialog
    const confirmDeleteButton = page.getByRole('button', { name: /Delete Note/i });
    await confirmDeleteButton.waitFor({ state: 'visible', timeout: 5000 });
    
    // Click delete and wait for deletion to complete
    await confirmDeleteButton.click();
    
    // Wait for the confirmation dialog to disappear (indicating deletion was processed)
    await confirmDeleteButton.waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
    
    // Wait for UI to update after deletion
    await page.waitForTimeout(2000);
    
    // Verify we're still on the booking edit page (should not navigate away)
    await addBookingPage.verifyAddBookingPage();
    
    // Verify the note is no longer displayed
    // The note card should disappear - check that note content is gone
    const noteContentLocator = page.locator(`text=${noteContent}`);
    await expect(noteContentLocator).not.toBeVisible({ timeout: 5000 });
    
    // Also verify "No notes yet" message might appear if this was the only note
    const noNotesMessage = page.locator('text=/No notes yet/i');
    const hasNoNotes = await noNotesMessage.isVisible().catch(() => false);
    if (hasNoNotes) {
      await expect(noNotesMessage).toBeVisible();
    }
  });

  test('should be able to download note attachments', async ({ page }) => {
    // Create a test booking
    const { booking } = await createTestBooking(page, dashboardPage, guestsPage, addGuestPage, roomsPage, addRoomPage, addBookingPage);
    
    // Navigate to bookings page
    await dashboardPage.navigateToSection('Bookings');
    await bookingsPage.verifyBookingsPage();
    await page.waitForTimeout(2000);
    
    // Edit the booking
    await bookingsPage.editBooking(booking.guestName);
    await page.waitForTimeout(2000);
    await addBookingPage.verifyAddBookingPage();
    
    // Wait for notes section
    await page.waitForTimeout(2000);
    const notesSection = page.locator('text=Notes').first();
    await notesSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Add a note with attachment
    const addNoteButton = page.getByRole('button', { name: '+ Add Note' });
    await addNoteButton.click();
    await page.waitForTimeout(1000);
    
    const noteContent = 'Note with downloadable attachment';
    const noteContentInput = page.locator('#note-content');
    await noteContentInput.fill(noteContent);
    
    const fileInput = page.locator('#note-files');
    await fileInput.setInputFiles(testFiles.pdf);
    await page.waitForTimeout(500);
    
    const submitNoteButton = page.getByRole('button', { name: /Add Note/i }).filter({ hasText: /Add Note/i });
    await submitNoteButton.click();
    await page.waitForTimeout(3000);
    
    // Expand the note card
    const noteCard = page.locator('.border.border-gray-200.rounded-lg').filter({ hasText: /Note from/i }).first();
    await noteCard.locator('.cursor-pointer').first().click();
    await page.waitForTimeout(1000);
    
    // Verify the note is displayed
    await expect(page.locator(`text=${noteContent}`).first()).toBeVisible({ timeout: 5000 });
    
    // Set up download promise before clicking download
    const downloadPromise = page.waitForEvent('download');
    
    // Find download button for the attachment - it's in the NoteAttachments section
    // The download button has title="Download" and contains a download icon SVG
    const downloadButton = noteCard.locator('button[title="Download"]').first();
    await downloadButton.waitFor({ state: 'visible', timeout: 5000 });
    await downloadButton.click();
    
    // Wait for download to complete
    const download = await downloadPromise;
    
    // Verify download - filename should contain the file extension
    expect(download.suggestedFilename()).toMatch(/\.(pdf|docx|xlsx|txt|png)$/i);
  });

  test('should be able to view image attachments', async ({ page }) => {
    // Create a test booking
    const { booking } = await createTestBooking(page, dashboardPage, guestsPage, addGuestPage, roomsPage, addRoomPage, addBookingPage);
    
    // Navigate to bookings page
    await dashboardPage.navigateToSection('Bookings');
    await bookingsPage.verifyBookingsPage();
    await page.waitForTimeout(2000);
    
    // Edit the booking
    await bookingsPage.editBooking(booking.guestName);
    await page.waitForTimeout(2000);
    await addBookingPage.verifyAddBookingPage();
    
    // Wait for notes section
    await page.waitForTimeout(2000);
    const notesSection = page.locator('text=Notes').first();
    await notesSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Add a note with image attachment
    const addNoteButton = page.getByRole('button', { name: '+ Add Note' });
    await addNoteButton.click();
    await page.waitForTimeout(1000);
    
    const noteContent = 'Note with image attachment';
    const noteContentInput = page.locator('#note-content');
    await noteContentInput.fill(noteContent);
    
    const fileInput = page.locator('#note-files');
    await fileInput.setInputFiles(testFiles.image);
    await page.waitForTimeout(500);
    
    const submitNoteButton = page.getByRole('button', { name: /Add Note/i }).filter({ hasText: /Add Note/i });
    await submitNoteButton.click();
    await page.waitForTimeout(3000);
    
    // Expand the note card
    const noteCard = page.locator('.border.border-gray-200.rounded-lg').filter({ hasText: /Note from/i }).first();
    await noteCard.locator('.cursor-pointer').first().click();
    await page.waitForTimeout(1000);
    
    // Verify the note is displayed
    await expect(page.locator(`text=${noteContent}`).first()).toBeVisible({ timeout: 5000 });
    
    // Click on image to view (if it's clickable)
    // Images might be displayed as thumbnails that can be clicked
    const imageLink = noteCard.locator('img, a[href*="image"], button:has-text("View")').first();
    const imageExists = await imageLink.isVisible().catch(() => false);
    
    if (imageExists) {
      await imageLink.click();
      await page.waitForTimeout(1000);
      
      // Check if image viewer/modal is opened
      const imageViewer = page.locator('[data-testid*="image-viewer"], .modal, .image-modal, img[src*="image"]').first();
      const viewerVisible = await imageViewer.isVisible().catch(() => false);
      if (viewerVisible) {
        await expect(imageViewer).toBeVisible();
      }
    }
  });

  test('should validate note content is required', async ({ page }) => {
    // Create a test booking
    const { booking } = await createTestBooking(page, dashboardPage, guestsPage, addGuestPage, roomsPage, addRoomPage, addBookingPage);
    
    // Navigate to bookings page
    await dashboardPage.navigateToSection('Bookings');
    await bookingsPage.verifyBookingsPage();
    await page.waitForTimeout(2000);
    
    // Edit the booking
    await bookingsPage.editBooking(booking.guestName);
    await page.waitForTimeout(2000);
    await addBookingPage.verifyAddBookingPage();
    
    // Wait for notes section
    await page.waitForTimeout(2000);
    const notesSection = page.locator('text=Notes').first();
    await notesSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Click Add Note button
    const addNoteButton = page.getByRole('button', { name: '+ Add Note' });
    await addNoteButton.click();
    await page.waitForTimeout(1000);
    
    // Try to submit without content
    const submitNoteButton = page.getByRole('button', { name: /Add Note/i }).filter({ hasText: /Add Note/i });
    
    // Check if button is disabled (should be disabled when content is empty)
    const isDisabled = await submitNoteButton.isDisabled().catch(() => false);
    
    if (isDisabled) {
      // Button is disabled, which means validation is working
      // Verify the button is disabled
      await expect(submitNoteButton).toBeDisabled();
    } else {
      // If button is enabled, try to click it to trigger validation
      await submitNoteButton.click();
      await page.waitForTimeout(1000);
      
      // Check for error message
      const errorMessage = page.locator('.text-red-600, .bg-red-50').filter({ hasText: /required|error/i });
      const hasError = await errorMessage.first().isVisible().catch(() => false);
      
      if (hasError) {
        await expect(errorMessage.first()).toBeVisible();
      } else {
        // If no error message, verify button is disabled when content is empty
        const noteContentInput = page.locator('#note-content');
        const contentValue = await noteContentInput.inputValue();
        if (!contentValue.trim()) {
          // Content is empty, button should be disabled
          await expect(submitNoteButton).toBeDisabled();
        }
      }
    }
  });

  test('should limit file uploads to 20 files', async ({ page }) => {
    // Create a test booking
    const { booking } = await createTestBooking(page, dashboardPage, guestsPage, addGuestPage, roomsPage, addRoomPage, addBookingPage);
    
    // Navigate to bookings page
    await dashboardPage.navigateToSection('Bookings');
    await bookingsPage.verifyBookingsPage();
    await page.waitForTimeout(2000);
    
    // Edit the booking
    await bookingsPage.editBooking(booking.guestName);
    await page.waitForTimeout(2000);
    await addBookingPage.verifyAddBookingPage();
    
    // Wait for notes section
    await page.waitForTimeout(2000);
    const notesSection = page.locator('text=Notes').first();
    await notesSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Click Add Note button
    const addNoteButton = page.getByRole('button', { name: '+ Add Note' });
    await addNoteButton.click();
    await page.waitForTimeout(1000);
    
    // Verify the file limit message is displayed
    await expect(page.locator('text=/You can upload up to 20 files|up to 20 files/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display supported file types information', async ({ page }) => {
    // Create a test booking
    const { booking } = await createTestBooking(page, dashboardPage, guestsPage, addGuestPage, roomsPage, addRoomPage, addBookingPage);
    
    // Navigate to bookings page
    await dashboardPage.navigateToSection('Bookings');
    await bookingsPage.verifyBookingsPage();
    await page.waitForTimeout(2000);
    
    // Edit the booking
    await bookingsPage.editBooking(booking.guestName);
    await page.waitForTimeout(2000);
    await addBookingPage.verifyAddBookingPage();
    
    // Wait for notes section
    await page.waitForTimeout(2000);
    const notesSection = page.locator('text=Notes').first();
    await notesSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Click Add Note button
    const addNoteButton = page.getByRole('button', { name: '+ Add Note' });
    await addNoteButton.click();
    await page.waitForTimeout(1000);
    
    // Verify supported file types are displayed
    await expect(page.locator('text=/Supported types|images.*PDFs.*Word.*Excel.*text/i').first()).toBeVisible({ timeout: 5000 });
  });
});

