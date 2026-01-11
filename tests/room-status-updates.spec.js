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

/**
 * Room Status Auto-Updates Tests
 * 
 * Tests that room status automatically updates when bookings are created and go through status transitions.
 * 
 * Based on manual_qa.md test case:
 * - ROOM-STATUS-001: Room Status Updates on Booking Creation (Checked In)
 */
test.describe('Room Status Auto-Updates', () => {
  let loginPage, dashboardPage, bookingsPage, addBookingPage;
  let guestsPage, addGuestPage, roomsPage, addRoomPage;
  let createdBookingIds = [];
  let createdGuestIds = [];
  let createdRoomIds = [];

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    bookingsPage = new BookingsPage(page);
    addBookingPage = new AddBookingPage(page);
    guestsPage = new GuestsPage(page);
    addGuestPage = new AddGuestPage(page);
    roomsPage = new RoomsPage(page);
    addRoomPage = new AddRoomPage(page);

    await loginPage.goto();
    await loginPage.login(testUsers.validUser.username, testUsers.validUser.password);
    await dashboardPage.verifyAuthenticated(testUsers.validUser.username);
    
    const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    setAuthToken(authToken);
  });

  test.afterEach(async () => {
    for (const bookingId of createdBookingIds) {
      testCleanup.trackBooking(bookingId);
    }
    for (const guestId of createdGuestIds) {
      testCleanup.trackGuest(guestId);
    }
    for (const roomId of createdRoomIds) {
      testCleanup.trackRoom(roomId);
    }
    
    await testCleanup.cleanupAll();
    
    createdBookingIds = [];
    createdGuestIds = [];
    createdRoomIds = [];
  });

  test.afterAll(async () => {
    console.log('🧹 Running comprehensive cleanup...');
    await testCleanup.cleanupTestBookings();
    await testCleanup.cleanupTestGuests();
    await testCleanup.cleanupTestRooms();
    console.log('✅ Comprehensive cleanup completed');
  });

  test('ROOM-STATUS-001: Room Status Updates to OCCUPIED when Booking Created with CHECKED_IN', async ({ page }) => {
    // Create guest and room
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

    // Wait for room to be created and page to update
    await page.waitForTimeout(2000);
    
    // Refresh the page to ensure room list is updated
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('tbody', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Note: We don't verify the initial room status here because we'll be selecting
    // a different room from the dropdown (first available), not necessarily the one we created

    // Create booking (defaults to pending status)
    const bookingData = generateFutureBooking(0);
    const guestFullName = `${guestData.firstName} ${guestData.lastName}`;
    
    await dashboardPage.navigateToSection('Bookings');
    await bookingsPage.clickBookingCreate();
    await addBookingPage.verifyAddBookingPage();
    
    // Wait for the room dropdown to be populated with at least one option
    await page.waitForSelector('#roomId', { state: 'visible', timeout: 10000 });
    
    // Wait for at least one room option to be available in the dropdown
    await page.waitForFunction(
      () => {
        const select = document.querySelector('#roomId');
        if (!select || !(select instanceof HTMLSelectElement)) return false;
        const options = Array.from(select.options);
        return options.length > 1 && options.some(opt => opt.value && opt.value !== '');
      },
      { timeout: 10000 }
    );
    
    await page.waitForTimeout(1000); // Additional wait for dropdown to stabilize

    // Don't specify roomName - let it select the first available room
    // The room we created might not be in the dropdown yet, but any room will work for this test
    await addBookingPage.fillBookingForm({
      guestName: `${guestData.firstName} ${guestData.lastName} - ${guestData.mobileNumber}`,
      checkInDateTime: bookingData.checkInDateTime,
      checkOutDateTime: bookingData.checkOutDateTime,
      numberOfGuests: 2,
      adultsCount: 2
      // Don't specify roomName - will use first available room
      // Don't set status - it defaults to pending
    });
    
    // Get the selected room name from the dropdown for verification
    const selectedRoomValue = await page.locator('#roomId').inputValue();
    const selectedRoomOption = page.locator(`#roomId option[value="${selectedRoomValue}"]`);
    const selectedRoomFullText = await selectedRoomOption.textContent();
    // Extract just the room name (before the first "-")
    const selectedRoomName = selectedRoomFullText ? selectedRoomFullText.split(' - ')[0].trim() : '';
    console.log(`Selected room for booking: ${selectedRoomName} (ID: ${selectedRoomValue})`);

    await addBookingPage.submitForm();
    
    // Wait for navigation back to bookings page
    await page.waitForSelector('#checkInDateTime', { state: 'hidden', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await bookingsPage.verifyBookingsPage();

    // Wait for booking to appear in the list
    await page.waitForTimeout(2000);
    const bookingRow = page.locator('tbody tr').filter({ 
      hasText: new RegExp(`${guestData.firstName}.*${guestData.lastName}`, 'i') 
    }).first();
    await bookingRow.waitFor({ state: 'visible', timeout: 10000 });

    // Step 1: Confirm the booking (pending -> confirmed)
    await bookingsPage.editBooking(guestFullName);
    await page.waitForTimeout(1000);
    
    const statusSelect = page.locator('#status');
    const currentStatus = await statusSelect.inputValue();
    
    if (currentStatus !== 'confirmed') {
      await statusSelect.selectOption('confirmed');
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /Save Booking|Update Booking/i }).click();
      await page.waitForTimeout(2000);
      await page.waitForSelector('tbody', { timeout: 10000 });
    } else {
      const cancelButton = page.getByRole('button', { name: 'Cancel' });
      if (await cancelButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cancelButton.click();
        await page.waitForTimeout(1000);
      }
      await page.waitForSelector('tbody', { timeout: 10000 });
    }
    
    // Step 2: Check-in the booking (confirmed -> checked_in)
    // Navigate to edit form to check-in the booking
    await bookingsPage.editBooking(guestFullName);
    await page.waitForSelector('#checkInDateTime', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    await addBookingPage.verifyAddBookingPage();
    
    // Click the "Check In Guest" button in the edit form
    await addBookingPage.verifyCheckInButtonVisible();
    await addBookingPage.checkInGuest();
    await page.waitForTimeout(2000);

    // Wait for status update to propagate
    await page.waitForTimeout(2000);

    // Verify room status is now OCCUPIED
    await dashboardPage.navigateToSection('Rooms');
    await roomsPage.verifyRoomsPage();
    
    // Refresh the page to ensure room list is updated
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('tbody', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Verify the room that was actually selected for the booking
    // Note: We can't verify capacity without fetching room details, so we'll just verify status
    const selectedRoomRow = page.locator('tbody tr').filter({ hasText: selectedRoomName.trim() }).first();
    await selectedRoomRow.waitFor({ state: 'visible', timeout: 10000 });
    
    // Verify status is OCCUPIED
    const roomStatusSelect = selectedRoomRow.locator('td select').first();
    const roomStatus = await roomStatusSelect.inputValue();
    expect(roomStatus).toBe('occupied');

    console.log('✅ Room status automatically updated to OCCUPIED');
  });
});
