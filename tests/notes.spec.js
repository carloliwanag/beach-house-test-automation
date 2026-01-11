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

test.describe('Notes Feature', () => {
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

  /**
   * Helper function to create a test booking with guest and room
   */
  async function createTestBooking(page) {
    const guestData = generateUniqueGuest();
    await dashboardPage.navigateToSection('Guests');
    await guestsPage.clickAddGuest();
    const guestId = await addGuestPage.createGuest(guestData);
    if (guestId) createdGuestIds.push(guestId);

    const roomData = generateUniqueRoom();
    await dashboardPage.navigateToSection('Rooms');
    await roomsPage.clickAddRoom();
    const roomId = await addRoomPage.createRoom(roomData);
    if (roomId) createdRoomIds.push(roomId);

    const bookingData = generateFutureBooking(1);
    await dashboardPage.navigateToSection('Bookings');
    await bookingsPage.clickBookingCreate();
    await addBookingPage.verifyAddBookingPage();
    
    // Wait for the room dropdown to be populated
    await page.waitForSelector('#roomId', { state: 'visible', timeout: 10000 });
    await page.waitForFunction(
      () => {
        const select = document.querySelector('#roomId');
        if (!select || !(select instanceof HTMLSelectElement)) return false;
        const options = Array.from(select.options);
        return options.length > 1 && options.some(opt => opt.value && opt.value !== '');
      },
      { timeout: 10000 }
    );
    await page.waitForTimeout(1000);

    await addBookingPage.fillBookingForm({
      guestName: `${guestData.firstName} ${guestData.lastName} - ${guestData.mobileNumber}`,
      checkInDateTime: bookingData.checkInDateTime,
      checkOutDateTime: bookingData.checkOutDateTime,
      numberOfGuests: 2,
      adultsCount: 2
    });

    await addBookingPage.submitForm();
    await page.waitForSelector('#checkInDateTime', { state: 'hidden', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await bookingsPage.verifyBookingsPage();
    await page.waitForTimeout(2000);

    return {
      guestData,
      roomData,
      guestFullName: `${guestData.firstName} ${guestData.lastName}`
    };
  }

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
    // Clear tracking arrays
    createdBookingIds = [];
    createdGuestIds = [];
    createdRoomIds = [];
    
    // Optional: Navigate to a clean state
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
  });

  test.afterAll(async () => {
    // Final cleanup: remove any remaining test data by name pattern
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

  test('should allow adding a note to a booking', async ({ page }) => {
    // Create test booking
    const { guestFullName } = await createTestBooking(page);

    // Navigate to edit form
    await bookingsPage.editBooking(guestFullName);
    await page.waitForSelector('#checkInDateTime', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Verify Notes section is visible (only in edit mode)
    const notesSection = page.locator('text=/Notes/i');
    await expect(notesSection.first()).toBeVisible({ timeout: 5000 });

    // Look for the "Add Note" button
    const addNoteButton = page.locator('button:has-text("Add Note")');
    await expect(addNoteButton).toBeVisible({ timeout: 5000 });

    // Click the Add Note button
    await addNoteButton.click();
    await page.waitForTimeout(500);

    // Wait for the note form to appear
    const noteTextarea = page.locator('textarea[placeholder*="Enter your note"], textarea[placeholder*="note"]');
    await expect(noteTextarea.first()).toBeVisible({ timeout: 5000 });

    // Fill in the note content
    const noteContent = 'E2E Test Note - Testing note creation functionality.';
    await noteTextarea.first().fill(noteContent);

    // Click the submit button
    const submitButton = page.locator('button:has-text("Add Note"), button:has-text("Submit")').filter({ hasText: /Add Note|Submit/i });
    await submitButton.first().click();

    // Wait for the note to appear in the list
    await page.waitForTimeout(2000);
    
    // Find the note card - look for "Note from" text which indicates a note card exists
    const noteFromText = page.locator('text=/Note from/i');
    await noteFromText.first().waitFor({ state: 'visible', timeout: 10000 });
    
    // Find the note card container
    const noteCard = page.locator('.border.border-gray-200.rounded-lg').filter({ hasText: /Note from/i }).first();
    await noteCard.waitFor({ state: 'visible', timeout: 5000 });
    
    // Click on the note card header to expand it (notes are collapsed by default)
    const noteCardHeader = noteCard.locator('.cursor-pointer').first();
    await noteCardHeader.click();
    await page.waitForTimeout(1000);

    // Verify the note was added - content should be visible after expansion
    await expect(page.locator(`text=${noteContent}`).first()).toBeVisible({ timeout: 10000 });

    console.log('✅ Successfully created a note via UI');
  });

  

  

  test('should allow uploading attachments with notes', async ({ page }) => {
    // Create test booking
    const { guestFullName } = await createTestBooking(page);

    // Navigate to edit form
    await bookingsPage.editBooking(guestFullName);
    await page.waitForSelector('#checkInDateTime', { timeout: 10000 });
    await page.waitForTimeout(1000);

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
    const noteContent = 'Test note with attachment';
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

    console.log('✅ Note with attachment created successfully');
  });
});
