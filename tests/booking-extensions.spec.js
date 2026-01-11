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
 * Create a guest via API using page.evaluate (browser context)
 */
async function createGuestViaAPI(page, guestData) {
  const token = global.testAuthToken;
  if (!token) {
    throw new Error('No auth token available');
  }

  const apiBaseUrl = 'http://localhost:3001/api/v1';
  return await page.evaluate(async ({ url, data, token }) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }, {
    url: `${apiBaseUrl}/guests`,
    data: guestData,
    token: token
  });
}

/**
 * Create a room via API using page.evaluate (browser context)
 */
async function createRoomViaAPI(page, roomData) {
  const token = global.testAuthToken;
  if (!token) {
    throw new Error('No auth token available');
  }

  const apiBaseUrl = 'http://localhost:3001/api/v1';
  return await page.evaluate(async ({ url, data, token }) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }, {
    url: `${apiBaseUrl}/rooms`,
    data: roomData,
    token: token
  });
}

/**
 * Create a booking via API using page.evaluate (browser context)
 */
async function createBookingViaAPI(page, bookingData) {
  const token = global.testAuthToken;
  if (!token) {
    throw new Error('No auth token available');
  }

  const apiBaseUrl = 'http://localhost:3001/api/v1';
  return await page.evaluate(async ({ url, data, token }) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }, {
    url: `${apiBaseUrl}/bookings`,
    data: bookingData,
    token: token
  });
}

/**
 * Create an extension via API using page.evaluate (browser context)
 */
async function createExtensionViaAPI(page, bookingId, extensionData) {
  const token = global.testAuthToken;
  if (!token) {
    throw new Error('No auth token available');
  }

  const apiBaseUrl = 'http://localhost:3001/api/v1';
  return await page.evaluate(async ({ url, data, token }) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }, {
    url: `${apiBaseUrl}/bookings/${bookingId}/extensions`,
    data: extensionData,
    token: token
  });
}

/**
 * Booking Extensions Tests
 * 
 * Tests booking extension functionality including extending by hours and days.
 * 
 * Based on manual_qa.md test cases:
 * - EXT-001: Extend Booking Duration
 * - EXT-002: Extension Cost Calculation
 * - EXT-004: Extend Booking by Hours
 * - EXT-005: Extend Booking by Days/Nights
 */
test.describe('Booking Extensions', () => {
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
    // Also set global token for API calls
    global.testAuthToken = authToken;
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

  test('EXT-004: Extend Booking by Hours', async ({ page }) => {
    // Create guest and room via API to get real numeric IDs
    const guestData = generateUniqueGuest();
    const guestPayload = {
      firstName: guestData.firstName,
      lastName: guestData.lastName,
      countryCode: guestData.countryCode || '+63',
      mobileNumber: guestData.mobileNumber,
      address: guestData.address || 'Test Address',
      vehiclePlateNumber: guestData.vehiclePlateNumber,
      status: 'ready'
    };
    const createdGuest = await createGuestViaAPI(page, guestPayload);
    const guestId = createdGuest.id;
    createdGuestIds.push(guestId);

    const roomData = generateUniqueRoom();
    const roomPayload = {
      name: roomData.name,
      capacity: roomData.capacity,
      weekdayPrice: roomData.weekdayPrice,
      weekendPrice: roomData.weekendPrice,
      weekdayHourRate: roomData.weekdayHourRate,
      weekendHourRate: roomData.weekendHourRate,
      roomType: 'Suite', // Valid enum value
      status: 'vacant'
    };
    const createdRoom = await createRoomViaAPI(page, roomPayload);
    const roomId = createdRoom.id;
    createdRoomIds.push(roomId);

    // Create booking via API with CHECKED_IN status
    // IMPORTANT: Extension is only allowed when checkout date is the same as current date
    // The booking must have started in the past (check-in date in the past) 
    // but checkout date must be today (same as current date)
    const today = new Date();
    const checkInDate = new Date(today);
    checkInDate.setDate(checkInDate.getDate() - 1); // Check-in yesterday (past)
    checkInDate.setHours(14, 0, 0, 0); // 2:00 PM check-in
    
    const checkOutDate = new Date(today);
    checkOutDate.setHours(23, 59, 59, 999); // End of today (same as current date)
    
    const bookingPayload = {
      guestId: Number(guestId),
      roomIds: [Number(roomId)],
      checkInDateTime: checkInDate.toISOString(),
      checkOutDateTime: checkOutDate.toISOString(),
      numberOfGuests: 2,
      adultsCount: 2,
      kidsCount: 0,
      seniorsCount: 0,
      pwdCount: 0,
      status: 'checked_in'
    };
    
    const createdBooking = await createBookingViaAPI(page, bookingPayload);
    createdBookingIds.push(createdBooking.id);
    
    // Create extension via API
    // Extension starts from the checkout date (end of today)
    const extensionStartDateTime = new Date(checkOutDate);
    const extensionEndDateTime = new Date(extensionStartDateTime);
    extensionEndDateTime.setHours(extensionEndDateTime.getHours() + 3); // Add 3 hours
    
    const extensionPayload = {
      bookingId: Number(createdBooking.id),
      roomId: Number(roomId),
      extensionType: 'hour',
      extensionValue: 3,
      startDateTime: extensionStartDateTime.toISOString(),
      endDateTime: extensionEndDateTime.toISOString()
    };
    
    await createExtensionViaAPI(page, createdBooking.id, extensionPayload);
    await page.waitForTimeout(1000);

    // Navigate to booking edit page to verify extension section appears
    await dashboardPage.navigateToSection('Bookings');
    await bookingsPage.verifyBookingsPage();
    await page.waitForTimeout(3000); // Wait longer for bookings list to load
    
    // Use guest name from the created guest object
    const guestFullName = `${createdGuest.firstName} ${createdGuest.lastName}`;
    const bookingRow = page.locator('tbody tr').filter({ hasText: new RegExp(guestFullName, 'i') }).first();
    await bookingRow.waitFor({ state: 'visible', timeout: 15000 });
    
    // Click actions menu
    const actionsDropdown = bookingRow.getByRole('button', { name: 'Actions menu' });
    await actionsDropdown.click();
    await page.waitForTimeout(500);
    
    // Click Edit Booking
    const editButton = page.getByRole('button', { name: 'Edit Booking' });
    await editButton.click();
    await page.waitForTimeout(2000);
    
    // Wait for form to load
    await page.waitForSelector('#checkInDateTime', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Wait for extension section to appear - it loads asynchronously
    const extensionSection = page.locator('text=/Booking Extensions/i');
    
    // Wait for loading state to finish if it exists
    try {
      const loadingState = page.locator('text=/Loading extensions/i');
      const isLoading = await loadingState.isVisible({ timeout: 2000 }).catch(() => false);
      if (isLoading) {
        await loadingState.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
      }
    } catch (e) {
      // Loading state might not appear, continue
    }
    
    // Scroll to bottom to ensure extension section is visible
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // Verify extension section appears (wait up to 15 seconds for it to load)
    await expect(extensionSection.first()).toBeVisible({ timeout: 15000 });

    console.log('✅ Booking extended by hours successfully');
  });

  test('EXT-005: Extend Booking by Days/Nights', async ({ page }) => {
    // Create guest and room via API to get real numeric IDs
    const guestData = generateUniqueGuest();
    const guestPayload = {
      firstName: guestData.firstName,
      lastName: guestData.lastName,
      countryCode: guestData.countryCode || '+63',
      mobileNumber: guestData.mobileNumber,
      address: guestData.address || 'Test Address',
      vehiclePlateNumber: guestData.vehiclePlateNumber,
      status: 'ready'
    };
    const createdGuest = await createGuestViaAPI(page, guestPayload);
    const guestId = createdGuest.id;
    createdGuestIds.push(guestId);

    const roomData = generateUniqueRoom();
    const roomPayload = {
      name: roomData.name,
      capacity: roomData.capacity,
      weekdayPrice: roomData.weekdayPrice,
      weekendPrice: roomData.weekendPrice,
      weekdayHourRate: roomData.weekdayHourRate,
      weekendHourRate: roomData.weekendHourRate,
      roomType: 'Suite', // Valid enum value
      status: 'vacant'
    };
    const createdRoom = await createRoomViaAPI(page, roomPayload);
    const roomId = createdRoom.id;
    createdRoomIds.push(roomId);

    // Create booking via API with CHECKED_IN status
    // IMPORTANT: Extension is only allowed when checkout date is the same as current date
    // The booking must have started in the past (check-in date in the past) 
    // but checkout date must be today (same as current date)
    const today = new Date();
    const checkInDate = new Date(today);
    checkInDate.setDate(checkInDate.getDate() - 1); // Check-in yesterday (past)
    checkInDate.setHours(14, 0, 0, 0); // 2:00 PM check-in
    
    const checkOutDate = new Date(today);
    checkOutDate.setHours(23, 59, 59, 999); // End of today (same as current date)
    
    const bookingPayload = {
      guestId: Number(guestId),
      roomIds: [Number(roomId)],
      checkInDateTime: checkInDate.toISOString(),
      checkOutDateTime: checkOutDate.toISOString(),
      numberOfGuests: 2,
      adultsCount: 2,
      kidsCount: 0,
      seniorsCount: 0,
      pwdCount: 0,
      status: 'checked_in'
    };
    
    const createdBooking = await createBookingViaAPI(page, bookingPayload);
    createdBookingIds.push(createdBooking.id);
    
    // Create extension via API (2 days)
    // Extension starts from the checkout date (end of today)
    const extensionStartDateTime = new Date(checkOutDate);
    const extensionEndDateTime = new Date(extensionStartDateTime);
    extensionEndDateTime.setDate(extensionEndDateTime.getDate() + 2); // Add 2 days
    
    const extensionPayload = {
      bookingId: Number(createdBooking.id),
      roomId: Number(roomId),
      extensionType: 'day',
      extensionValue: 2,
      startDateTime: extensionStartDateTime.toISOString(),
      endDateTime: extensionEndDateTime.toISOString()
    };
    
    await createExtensionViaAPI(page, createdBooking.id, extensionPayload);
    await page.waitForTimeout(1000);

    // Navigate to booking edit page to verify extension section appears
    await dashboardPage.navigateToSection('Bookings');
    await bookingsPage.verifyBookingsPage();
    await page.waitForTimeout(3000); // Wait longer for bookings list to load
    
    // Use guest name from the created guest object
    const guestFullName = `${createdGuest.firstName} ${createdGuest.lastName}`;
    const bookingRow = page.locator('tbody tr').filter({ hasText: new RegExp(guestFullName, 'i') }).first();
    await bookingRow.waitFor({ state: 'visible', timeout: 15000 });
    
    // Click actions menu
    const actionsDropdown = bookingRow.getByRole('button', { name: 'Actions menu' });
    await actionsDropdown.click();
    await page.waitForTimeout(500);
    
    // Click Edit Booking
    const editButton = page.getByRole('button', { name: 'Edit Booking' });
    await editButton.click();
    await page.waitForTimeout(2000);
    
    // Wait for form to load
    await page.waitForSelector('#checkInDateTime', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Wait for extension section to appear - it loads asynchronously
    const extensionSection = page.locator('text=/Booking Extensions/i');
    
    // Wait for loading state to finish if it exists
    try {
      const loadingState = page.locator('text=/Loading extensions/i');
      const isLoading = await loadingState.isVisible({ timeout: 2000 }).catch(() => false);
      if (isLoading) {
        await loadingState.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
      }
    } catch (e) {
      // Loading state might not appear, continue
    }
    
    // Scroll to bottom to ensure extension section is visible
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // Verify extension section appears (wait up to 15 seconds for it to load)
    await expect(extensionSection.first()).toBeVisible({ timeout: 15000 });

    console.log('✅ Booking extended by days successfully');
  });

  test('EXT-001: Extend Booking Duration - Verify Extension Appears', async ({ page }) => {
    // Create guest and room via API to get real numeric IDs
    const guestData = generateUniqueGuest();
    const guestPayload = {
      firstName: guestData.firstName,
      lastName: guestData.lastName,
      countryCode: guestData.countryCode || '+63',
      mobileNumber: guestData.mobileNumber,
      address: guestData.address || 'Test Address',
      vehiclePlateNumber: guestData.vehiclePlateNumber,
      status: 'ready'
    };
    const createdGuest = await createGuestViaAPI(page, guestPayload);
    const guestId = createdGuest.id;
    createdGuestIds.push(guestId);

    const roomData = generateUniqueRoom();
    const roomPayload = {
      name: roomData.name,
      capacity: roomData.capacity,
      weekdayPrice: roomData.weekdayPrice,
      weekendPrice: roomData.weekendPrice,
      weekdayHourRate: roomData.weekdayHourRate,
      weekendHourRate: roomData.weekendHourRate,
      roomType: 'Suite', // Valid enum value
      status: 'vacant'
    };
    const createdRoom = await createRoomViaAPI(page, roomPayload);
    const roomId = createdRoom.id;
    createdRoomIds.push(roomId);

    // Create booking via API with CHECKED_IN status
    // IMPORTANT: Extension is only allowed when checkout date is the same as current date
    // The booking must have started in the past (check-in date in the past) 
    // but checkout date must be today (same as current date)
    const today = new Date();
    const checkInDate = new Date(today);
    checkInDate.setDate(checkInDate.getDate() - 1); // Check-in yesterday (past)
    checkInDate.setHours(14, 0, 0, 0); // 2:00 PM check-in
    
    const checkOutDate = new Date(today);
    checkOutDate.setHours(23, 59, 59, 999); // End of today (same as current date)
    
    const bookingPayload = {
      guestId: Number(guestId),
      roomIds: [Number(roomId)],
      checkInDateTime: checkInDate.toISOString(),
      checkOutDateTime: checkOutDate.toISOString(),
      numberOfGuests: 2,
      adultsCount: 2,
      kidsCount: 0,
      seniorsCount: 0,
      pwdCount: 0,
      status: 'checked_in'
    };
    
    const createdBooking = await createBookingViaAPI(page, bookingPayload);
    createdBookingIds.push(createdBooking.id);
    
    // Create extension via API (2 hours)
    // Extension starts from the checkout date (end of today)
    const extensionStartDateTime = new Date(checkOutDate);
    const extensionEndDateTime = new Date(extensionStartDateTime);
    extensionEndDateTime.setHours(extensionEndDateTime.getHours() + 2); // Add 2 hours
    
    const extensionPayload = {
      bookingId: Number(createdBooking.id),
      roomId: Number(roomId),
      extensionType: 'hour',
      extensionValue: 2,
      startDateTime: extensionStartDateTime.toISOString(),
      endDateTime: extensionEndDateTime.toISOString()
    };
    
    await createExtensionViaAPI(page, createdBooking.id, extensionPayload);
    await page.waitForTimeout(1000);

    // Navigate to booking edit page to verify extension section appears
    await dashboardPage.navigateToSection('Bookings');
    await bookingsPage.verifyBookingsPage();
    await page.waitForTimeout(3000); // Wait longer for bookings list to load
    
    // Use guest name from the created guest object
    const guestFullName = `${createdGuest.firstName} ${createdGuest.lastName}`;
    const bookingRow = page.locator('tbody tr').filter({ hasText: new RegExp(guestFullName, 'i') }).first();
    await bookingRow.waitFor({ state: 'visible', timeout: 15000 });
    
    // Click actions menu
    const actionsDropdown = bookingRow.getByRole('button', { name: 'Actions menu' });
    await actionsDropdown.click();
    await page.waitForTimeout(500);
    
    // Click Edit Booking
    const editButton = page.getByRole('button', { name: 'Edit Booking' });
    await editButton.click();
    await page.waitForTimeout(2000);
    
    // Wait for form to load
    await page.waitForSelector('#checkInDateTime', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Wait for extension section to appear - it loads asynchronously
    const extensionSection = page.locator('text=/Booking Extensions/i');
    
    // Wait for loading state to finish if it exists
    try {
      const loadingState = page.locator('text=/Loading extensions/i');
      const isLoading = await loadingState.isVisible({ timeout: 2000 }).catch(() => false);
      if (isLoading) {
        await loadingState.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
      }
    } catch (e) {
      // Loading state might not appear, continue
    }
    
    // Scroll to bottom to ensure extension section is visible
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // Verify extension section appears (wait up to 15 seconds for it to load)
    await expect(extensionSection.first()).toBeVisible({ timeout: 15000 });

    // Verify "Extension History" header is visible
    const extensionHistory = page.locator('text=/Extension History/i');
    await extensionHistory.first().scrollIntoViewIfNeeded();
    await expect(extensionHistory.first()).toBeVisible({ timeout: 5000 });

    // Verify extension details are shown - look for "Extension #1" or duration/period/cost
    const extensionDetails = page.locator('text=/Extension #|Duration|Period|Cost/i');
    await extensionDetails.first().scrollIntoViewIfNeeded();
    await expect(extensionDetails.first()).toBeVisible({ timeout: 5000 });

    console.log('✅ Extension appears in extensions list');
  });
});
