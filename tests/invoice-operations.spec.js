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
 * Invoice Operations Tests
 * 
 * Tests invoice generation and entrance fee inclusion/exclusion based on booking type.
 * 
 * Based on manual_qa.md test cases:
 * - INV-001: Generate Invoice for Booking
 * - INV-002: Invoice for Day Use Booking (includes entrance fees)
 * - INV-003: Invoice for Overnight Booking (excludes entrance fees)
 * - INV-005: Invoice Preview
 */
test.describe('Invoice Operations', () => {
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

  test('INV-002: Invoice for Day Use Booking Includes Entrance Fees', async ({ page }) => {
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

    // Create DAY USE booking (same day check-in and check-out)
    const today = new Date();
    const checkIn = new Date(today);
    checkIn.setHours(9, 0, 0, 0);
    
    const checkOut = new Date(today);
    checkOut.setHours(18, 0, 0, 0);

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

    await addBookingPage.fillBookingForm({
      guestName: `${guestData.firstName} ${guestData.lastName} - ${guestData.mobileNumber}`,
      checkInDateTime: checkIn.toISOString().slice(0, 16),
      checkOutDateTime: checkOut.toISOString().slice(0, 16),
      numberOfGuests: 4,
      adultsCount: 2,
      kidsCount: 1,
      seniorsCount: 1,
      pwdCount: 0
      // Don't specify roomName - will use first available room
    });
    
    // Explicitly set booking type to 'day_use' after filling dates
    await page.selectOption('#bookingType', 'day_use');
    await page.waitForTimeout(1000); // Allow UI to update

    await addBookingPage.submitForm();
    
    // Wait for navigation back to bookings page
    await page.waitForSelector('#checkInDateTime', { state: 'hidden', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await bookingsPage.verifyBookingsPage();

    // Wait for booking to appear in the list
    await page.waitForTimeout(2000);
    
    // Edit the booking to access the edit form (where Generate Invoice button is located)
    const guestFullName = `${guestData.firstName} ${guestData.lastName}`;
    
    // First, confirm the booking if it's not already confirmed
    await bookingsPage.editBooking(guestFullName);
    await page.waitForSelector('#checkInDateTime', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    const statusSelect = page.locator('#status');
    const currentStatus = await statusSelect.inputValue();
    
    if (currentStatus !== 'confirmed') {
      await statusSelect.selectOption('confirmed');
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /Save Booking|Update Booking/i }).click();
      await page.waitForTimeout(2000);
      await page.waitForSelector('tbody', { timeout: 10000 });
      
      // Edit again to access invoice generation
      await bookingsPage.editBooking(guestFullName);
      await page.waitForSelector('#checkInDateTime', { timeout: 10000 });
      await page.waitForTimeout(2000);
    } else {
      // Already confirmed, just wait for form to load
      await page.waitForTimeout(2000);
    }
    
    // Verify we're in edit mode
    await addBookingPage.verifyAddBookingPage();
    
    // Verify the "Generate Invoice" button is visible
    await addBookingPage.verifyGenerateInvoiceButtonVisible();
    
    // Generate invoice
    await addBookingPage.generateInvoice();
    await page.waitForTimeout(2000); // Wait for invoice generation
    
    // Verify success message appeared
    const successMessage = page.locator('text=/Invoice generated successfully/i');
    await expect(successMessage.first()).toBeVisible({ timeout: 5000 });
    
    // Verify invoice items section is visible
    await addBookingPage.verifyInvoiceItemsSectionVisible();
    
    // Wait for invoice items to load
    await page.waitForTimeout(2000);
    
    // Scroll to invoice items section to ensure it's visible
    const invoiceSection = page.locator('text=/Invoice Items/i');
    await invoiceSection.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    
    // Verify entrance fees are listed in invoice items
    // Entrance fees should appear as items with type "Fee" or description containing "entrance"
    const invoiceItems = page.locator('tbody tr').filter({ hasText: /./ });
    
    // Wait for at least one invoice item to appear
    await page.waitForSelector('tbody tr', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    const itemCount = await invoiceItems.count();
    console.log(`Found ${itemCount} invoice items`);
    
    let entranceFeeFound = false;
    
    // Check all invoice items for entrance fees
    for (let i = 0; i < itemCount; i++) {
      const item = invoiceItems.nth(i);
      const cells = item.locator('td');
      const cellCount = await cells.count();
      
      if (cellCount >= 5) {
        const description = await cells.nth(0).textContent();
        const itemType = await cells.nth(1).textContent();
        
        if (description && (
          description.toLowerCase().includes('entrance') ||
          itemType?.toLowerCase().includes('fee')
        )) {
          entranceFeeFound = true;
          const totalPriceText = await cells.nth(4).textContent();
          console.log(`✅ Found entrance fee item: "${description?.trim()}", Type="${itemType?.trim()}", Price="${totalPriceText?.trim()}"`);
          break;
        }
      }
    }
    
    expect(entranceFeeFound).toBe(true);

    console.log('✅ Day Use booking invoice correctly includes entrance fees');
  });

  test('INV-003: Invoice for Overnight Booking Excludes Entrance Fees', async ({ page }) => {
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

    // Create OVERNIGHT booking (check-in today, check-out tomorrow)
    const today = new Date();
    const checkIn = new Date(today);
    checkIn.setHours(14, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);

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

    await addBookingPage.fillBookingForm({
      guestName: `${guestData.firstName} ${guestData.lastName} - ${guestData.mobileNumber}`,
      checkInDateTime: checkIn.toISOString().slice(0, 16),
      checkOutDateTime: tomorrow.toISOString().slice(0, 16),
      numberOfGuests: 2,
      adultsCount: 2,
      kidsCount: 0,
      seniorsCount: 0,
      pwdCount: 0
      // Don't specify roomName - will use first available room
    });
    
    // Explicitly set booking type to 'overnight' after filling dates
    await page.selectOption('#bookingType', 'overnight');
    await page.waitForTimeout(1000); // Allow UI to update

    await addBookingPage.submitForm();
    
    // Wait for navigation back to bookings page
    await page.waitForSelector('#checkInDateTime', { state: 'hidden', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await bookingsPage.verifyBookingsPage();

    // Wait for booking to appear in the list
    await page.waitForTimeout(2000);
    
    // Edit the booking to access the edit form (where Generate Invoice button is located)
    const guestFullName = `${guestData.firstName} ${guestData.lastName}`;
    
    // First, confirm the booking if it's not already confirmed
    await bookingsPage.editBooking(guestFullName);
    await page.waitForSelector('#checkInDateTime', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    const statusSelect = page.locator('#status');
    const currentStatus = await statusSelect.inputValue();
    
    if (currentStatus !== 'confirmed') {
      await statusSelect.selectOption('confirmed');
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /Save Booking|Update Booking/i }).click();
      await page.waitForTimeout(2000);
      await page.waitForSelector('tbody', { timeout: 10000 });
      
      // Edit again to access invoice generation
      await bookingsPage.editBooking(guestFullName);
      await page.waitForSelector('#checkInDateTime', { timeout: 10000 });
      await page.waitForTimeout(2000);
    } else {
      // Already confirmed, just wait for form to load
      await page.waitForTimeout(2000);
    }
    
    // Verify we're in edit mode
    await addBookingPage.verifyAddBookingPage();
    
    // Verify the "Generate Invoice" button is visible
    await addBookingPage.verifyGenerateInvoiceButtonVisible();
    
    // Generate invoice
    await addBookingPage.generateInvoice();
    await page.waitForTimeout(2000); // Wait for invoice generation
    
    // Verify success message appeared
    const successMessage = page.locator('text=/Invoice generated successfully/i');
    await expect(successMessage.first()).toBeVisible({ timeout: 5000 });
    
    // Verify invoice items section is visible
    await addBookingPage.verifyInvoiceItemsSectionVisible();
    
    // Wait for invoice items to load
    await page.waitForTimeout(2000);
    
    // Scroll to invoice items section to ensure it's visible
    const invoiceSection = page.locator('text=/Invoice Items/i');
    await invoiceSection.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    
    // Verify entrance fees are NOT listed in invoice items
    // Entrance fees should NOT appear for overnight bookings
    const invoiceItems = page.locator('tbody tr').filter({ hasText: /./ });
    
    // Wait for at least one invoice item to appear (should have room charges)
    await page.waitForSelector('tbody tr', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    const itemCount = await invoiceItems.count();
    console.log(`Found ${itemCount} invoice items`);
    
    let entranceFeeFound = false;
    
    // Check all invoice items - entrance fees should NOT be present
    for (let i = 0; i < itemCount; i++) {
      const item = invoiceItems.nth(i);
      const cells = item.locator('td');
      const cellCount = await cells.count();
      
      if (cellCount >= 5) {
        const description = await cells.nth(0).textContent();
        const itemType = await cells.nth(1).textContent();
        
        console.log(`Item ${i + 1}: Description="${description?.trim()}", Type="${itemType?.trim()}"`);
        
        if (description && (
          description.toLowerCase().includes('entrance') ||
          itemType?.toLowerCase() === 'fee' ||
          itemType?.toLowerCase().includes('fee')
        )) {
          entranceFeeFound = true;
          console.log(`❌ Found unexpected entrance fee item: "${description?.trim()}", Type="${itemType?.trim()}"`);
          break;
        }
      }
    }
    
    expect(entranceFeeFound).toBe(false);
    
    // Verify room charges are present
    let roomChargeFound = false;
    for (let i = 0; i < itemCount; i++) {
      const item = invoiceItems.nth(i);
      const cells = item.locator('td');
      const cellCount = await cells.count();
      
      if (cellCount >= 5) {
        const description = await cells.nth(0).textContent();
        if (description && description.toLowerCase().includes('room')) {
          roomChargeFound = true;
          console.log(`✅ Found room charge: "${description?.trim()}"`);
          break;
        }
      }
    }
    
    expect(roomChargeFound).toBe(true);

    console.log('✅ Overnight booking invoice correctly excludes entrance fees');
  });

  test('INV-001: Generate Invoice for Booking', async ({ page }) => {
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

    // Create confirmed booking
    const bookingData = generateFutureBooking(1);
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

    await addBookingPage.fillBookingForm({
      guestName: `${guestData.firstName} ${guestData.lastName} - ${guestData.mobileNumber}`,
      checkInDateTime: bookingData.checkInDateTime,
      checkOutDateTime: bookingData.checkOutDateTime,
      numberOfGuests: 2,
      adultsCount: 2
      // Don't specify roomName - will use first available room
      // status: 'confirmed' - will be set after creation
    });

    await addBookingPage.submitForm();
    
    // Wait for navigation back to bookings page
    await page.waitForSelector('#checkInDateTime', { state: 'hidden', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await bookingsPage.verifyBookingsPage();

    // Wait for booking to appear in the list
    await page.waitForTimeout(2000);
    
    // Edit the booking to access the edit form (where Generate Invoice button is located)
    const guestFullName = `${guestData.firstName} ${guestData.lastName}`;
    await bookingsPage.editBooking(guestFullName);
    await page.waitForSelector('#checkInDateTime', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Verify we're in edit mode
    await addBookingPage.verifyAddBookingPage();
    
    // Verify the "Generate Invoice" button is visible
    await addBookingPage.verifyGenerateInvoiceButtonVisible();
    
    // Generate invoice
    await addBookingPage.generateInvoice();
    await page.waitForTimeout(2000); // Wait for invoice generation
    
    // Verify success message appeared
    const successMessage = page.locator('text=/Invoice generated successfully/i');
    await expect(successMessage.first()).toBeVisible({ timeout: 5000 });
    
    // Verify the "View Invoice" button is now visible (invoice exists)
    await addBookingPage.verifyViewInvoiceButtonVisible();
    
    // Verify "Generate Invoice" button is no longer visible (replaced with "View Invoice")
    const generateInvoiceButtonStillVisible = await page.getByRole('button', { name: /Generate Invoice/i }).isVisible({ timeout: 1000 }).catch(() => false);
    expect(generateInvoiceButtonStillVisible).toBe(false);

    console.log('✅ Invoice generated successfully');
  });
});
