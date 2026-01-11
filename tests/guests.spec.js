// @ts-check
import { test, expect } from '@playwright/test';
import { 
  LoginPage, 
  DashboardPage, 
  GuestsPage, 
  AddGuestPage,
  BookingsPage 
} from '../page-objects/index.js';
import { 
  testUsers, 
  testGuests, 
  generateUniqueGuest, 
  validationMessages, 
  generateFutureBooking 
} from '../fixtures/test-data.js';
import { testCleanup, setAuthToken } from '../fixtures/cleanup.js';

test.describe('Guest Management', () => {
  let loginPage, dashboardPage, guestsPage, addGuestPage, bookingsPage;
  let createdGuestIds = []; // Track guest IDs for cleanup

  test.beforeEach(async ({ page }) => {
    // Initialize page objects
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    guestsPage = new GuestsPage(page);
    addGuestPage = new AddGuestPage(page);
    bookingsPage = new BookingsPage(page);

    // Login before each test
    await loginPage.goto();
    await loginPage.login(testUsers.validUser.username, testUsers.validUser.password);
    await dashboardPage.verifyAuthenticated(testUsers.validUser.username);
    
    // Set auth token for cleanup operations
    const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    setAuthToken(authToken);
  });

  test.afterEach(async () => {
    // Clean up created guests from this specific test
    for (const guestId of createdGuestIds) {
      testCleanup.trackGuest(guestId);
    }
    await testCleanup.cleanupGuests();
    createdGuestIds = []; // Reset for next test
  });

  test.afterAll(async () => {
    // Final cleanup: remove any remaining test data that might have been missed
    console.log('🧹 Running comprehensive cleanup of all test data...');
    await testCleanup.cleanupTestGuests();
    await testCleanup.cleanupTestRooms();
    await testCleanup.cleanupTestBookings();
    console.log('✅ Comprehensive cleanup completed');
  });

  test('should be able to add a new guest with valid data', async () => {
    // Generate unique guest data to avoid conflicts
    const guestData = generateUniqueGuest();

    // Navigate to guests page
    await dashboardPage.navigateToSection('Guests');
    await guestsPage.verifyGuestsPage();

    // Click Add Guest button
    await guestsPage.clickAddGuest();
    await addGuestPage.verifyAddGuestPage();

    // Fill and submit the form, capture the guest ID
    const guestId = await addGuestPage.createGuest(guestData);
    if (guestId) {
      createdGuestIds.push(guestId);
    }

    // Verify we're back on the guests page
    await guestsPage.verifyGuestsPage();

    // Verify the guest appears in the list
    await guestsPage.verifyGuestInList(
      guestData.firstName, 
      guestData.lastName, 
      guestData.mobileNumber
    );
  });

  test('should show validation errors for invalid guest data', async () => {
    // Navigate to guests page and add guest form
    await dashboardPage.navigateToSection('Guests');
    await guestsPage.clickAddGuest();
    await addGuestPage.verifyAddGuestPage();

    // Try to submit form with invalid data
    await addGuestPage.fillGuestForm(testGuests.invalidGuest);
    await addGuestPage.submitForm();

    // Verify validation errors are displayed
    await addGuestPage.verifyValidationErrors([
      validationMessages.requiredFirstName,
      validationMessages.requiredLastName,
      validationMessages.invalidMobile
    ]);
  });

  test('should be able to cancel guest creation', async () => {
    // Navigate to add guest form
    await dashboardPage.navigateToSection('Guests');
    await guestsPage.clickAddGuest();
    await addGuestPage.verifyAddGuestPage();

    // Fill some data
    await addGuestPage.fillGuestForm({
      firstName: 'Test',
      lastName: 'Cancel',
      mobileNumber: '9123456789'
    });

    // Cancel the form
    await addGuestPage.cancelForm();

    // Verify we're back on guests page
    await guestsPage.verifyGuestsPage();
  });

  test('should be able to add guest with minimal required data', async () => {
    const timestamp = Date.now();
    const guestData = {
      firstName: `Minimal${timestamp}`,
      lastName: `Test${timestamp}`,
      mobileNumber: `911${String(timestamp).slice(-7)}`,
      address: `${timestamp} Test Address`
    };

    // Navigate to guests and add guest
    await dashboardPage.navigateToSection('Guests');
    await guestsPage.clickAddGuest();
    const guestId = await addGuestPage.createGuest(guestData);
    if (guestId) {
      createdGuestIds.push(guestId);
    }

    // Verify success
    await guestsPage.verifyGuestsPage();
    await guestsPage.verifyGuestInList(
      guestData.firstName, 
      guestData.lastName, 
      guestData.mobileNumber
    );
  });

  test('should be able to add international guest', async () => {
    const guestData = generateUniqueGuest();
    guestData.countryCode = '+1'; // US number
    const timestamp = Date.now();
    guestData.mobileNumber = `555${String(timestamp).slice(-7)}`;

    // Navigate to guests and add guest
    await dashboardPage.navigateToSection('Guests');
    await guestsPage.clickAddGuest();
    const guestId = await addGuestPage.createGuest(guestData);
    if (guestId) {
      createdGuestIds.push(guestId);
    }

    // Verify success
    await guestsPage.verifyGuestsPage();
    await guestsPage.verifyGuestInList(
      guestData.firstName, 
      guestData.lastName, 
      guestData.mobileNumber
    );
  });

  test('should be able to add guest with address and verify booking section is available', async () => {
    // Generate unique guest data
    const guestData = generateUniqueGuest();
    
    // Navigate to guests page and add guest form
    await dashboardPage.navigateToSection('Guests');
    await guestsPage.verifyGuestsPage();
    await guestsPage.clickAddGuest();
    await addGuestPage.verifyAddGuestPage();

    // Verify booking section is available for future booking implementation
    await addGuestPage.verifyBookingSection();

    // Create guest with address field (required field)
    const guestId = await addGuestPage.createGuest(guestData);
    if (guestId) {
      createdGuestIds.push(guestId);
    }

    // Verify we're back on guests page and guest was created
    await guestsPage.verifyGuestsPage();
    await guestsPage.verifyGuestInList(
      guestData.firstName, 
      guestData.lastName, 
      guestData.mobileNumber
    );
  });
});
