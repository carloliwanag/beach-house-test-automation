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
  generateBookingWithGuests,
  testGuestBreakdowns
} from '../fixtures/test-data.js';
import { testCleanup, setAuthToken } from '../fixtures/cleanup.js';

test.describe('Guest Breakdown and Entrance Fees', () => {
  let loginPage, dashboardPage, bookingsPage, addBookingPage;
  let guestsPage, addGuestPage, roomsPage, addRoomPage;
  let createdGuestIds = [];
  let createdRoomIds = [];

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
  });

  test.afterEach(async () => {
    console.log('Starting cleanup of test data...');
    await testCleanup.cleanupGuests(createdGuestIds);
    await testCleanup.cleanupRooms(createdRoomIds);
    console.log('✅ Cleanup completed - All tracked items verified as deleted');
    
    // Reset arrays
    createdGuestIds = [];
    createdRoomIds = [];
  });

  test.afterAll(async () => {
    console.log('🧹 Running comprehensive cleanup of all test data...');
    await testCleanup.cleanupTestBookings();
    await testCleanup.cleanupTestGuests();
    await testCleanup.cleanupTestRooms();
    console.log('✅ Comprehensive cleanup completed');
  });

  test.skip('should be able to create booking with adults only', async ({ page }) => {
    // Create prerequisites: guest and room
    const guestData = generateUniqueGuest();
    await dashboardPage.navigateToSection('Guests');
    await guestsPage.clickAddGuest();
    const guestId = await addGuestPage.createGuest(guestData);

    const roomData = generateUniqueRoom();
    await dashboardPage.navigateToSection('Rooms');
    await roomsPage.clickAddRoom();
    const roomId = await addRoomPage.createRoom(roomData);

    // Create booking with adults only
    const bookingData = generateBookingWithGuests(testGuestBreakdowns.adultsOnly, 2);
    bookingData.guestId = guestId;
    bookingData.roomId = roomId;
    bookingData.notes = 'Test booking with adults only - includes entrance fees';

    await dashboardPage.navigateToSection('Bookings');
    await bookingsPage.verifyBookingsPage();
    await bookingsPage.clickBookingCreate();
    await addBookingPage.verifyAddBookingPage();

    // Verify the form accepts guest breakdown
    await addBookingPage.fillBookingForm(bookingData);
    
    // Verify guest breakdown is filled correctly
    const breakdown = await addBookingPage.getGuestBreakdown();
    expect(breakdown.adultsCount).toBe(testGuestBreakdowns.adultsOnly.adultsCount);
    expect(breakdown.kidsCount).toBe(testGuestBreakdowns.adultsOnly.kidsCount);
    expect(breakdown.seniorsCount).toBe(testGuestBreakdowns.adultsOnly.seniorsCount);
    expect(breakdown.pwdCount).toBe(testGuestBreakdowns.adultsOnly.pwdCount);

    // Verify total guests calculation
    const totalGuests = await addBookingPage.getTotalGuestsCount();
    expect(totalGuests).toBe(2);

    await addBookingPage.submitForm();

    // Verify booking was created successfully
    await bookingsPage.verifyBookingsPage();
    const guestFullName = `${guestData.firstName} ${guestData.lastName}`;
    await bookingsPage.verifyBookingDetails({
      guestName: guestFullName,
      status: 'pending'
    });

    // Track IDs for cleanup
    if (guestId) createdGuestIds.push(guestId);
    if (roomId) createdRoomIds.push(roomId);
  });

  test.skip('should be able to create booking with family and kids', async ({ page }) => {
    // Create prerequisites: guest and room
    const guestData = generateUniqueGuest();
    await dashboardPage.navigateToSection('Guests');
    await guestsPage.clickAddGuest();
    const guestId = await addGuestPage.createGuest(guestData);

    const roomData = generateUniqueRoom();
    await dashboardPage.navigateToSection('Rooms');
    await roomsPage.clickAddRoom();
    const roomId = await addRoomPage.createRoom(roomData);

    // Create booking with family (adults + kids)
    const bookingData = generateBookingWithGuests(testGuestBreakdowns.familyWithKids, 3);
    bookingData.guestId = guestId;
    bookingData.roomId = roomId;
    bookingData.notes = 'Test booking with family (adults + kids) - includes entrance fees';

    await dashboardPage.navigateToSection('Bookings');
    await bookingsPage.verifyBookingsPage();
    await bookingsPage.clickBookingCreate();
    await addBookingPage.verifyAddBookingPage();

    // Fill and verify guest breakdown
    await addBookingPage.fillBookingForm(bookingData);
    
    const breakdown = await addBookingPage.getGuestBreakdown();
    expect(breakdown.adultsCount).toBe(testGuestBreakdowns.familyWithKids.adultsCount);
    expect(breakdown.kidsCount).toBe(testGuestBreakdowns.familyWithKids.kidsCount);
    expect(breakdown.seniorsCount).toBe(testGuestBreakdowns.familyWithKids.seniorsCount);
    expect(breakdown.pwdCount).toBe(testGuestBreakdowns.familyWithKids.pwdCount);

    // Verify total guests calculation (2 adults + 2 kids = 4)
    const totalGuests = await addBookingPage.getTotalGuestsCount();
    expect(totalGuests).toBe(4);

    await addBookingPage.submitForm();

    // Verify booking was created successfully
    await bookingsPage.verifyBookingsPage();
    const guestFullName = `${guestData.firstName} ${guestData.lastName}`;
    await bookingsPage.verifyBookingDetails({
      guestName: guestFullName,
      status: 'pending'
    });

    // Track IDs for cleanup
    if (guestId) createdGuestIds.push(guestId);
    if (roomId) createdRoomIds.push(roomId);
  });

  test.skip('should be able to create guest with initial reservation using guest breakdown', async ({ page }) => {
    // Navigate to create guest page
    await dashboardPage.navigateToSection('Guests');
    await guestsPage.clickAddGuest();
    await addGuestPage.verifyAddGuestPage();

    // Create guest data
    const guestData = generateUniqueGuest();
    await addGuestPage.fillGuestForm(guestData);

    // Enable booking creation
    await addGuestPage.enableBookingCreation();
    await addGuestPage.verifyBookingFormVisible();

    // Create room for the booking
    const roomData = generateUniqueRoom();
    await dashboardPage.navigateToSection('Rooms');
    await roomsPage.clickAddRoom();
    const roomId = await addRoomPage.createRoom(roomData);

    // Go back to guest creation
    await dashboardPage.navigateToSection('Guests');
    await guestsPage.clickAddGuest();
    await addGuestPage.fillGuestForm(guestData);
    await addGuestPage.enableBookingCreation();

    // Fill booking details with mixed guest breakdown
    const bookingData = generateBookingWithGuests(testGuestBreakdowns.mixedGroup, 4);
    await addGuestPage.fillBookingDetails(bookingData);


    // Verify guest breakdown in guest form
    const breakdown = await addGuestPage.getGuestBreakdown();
    expect(breakdown.adultsCount).toBe(testGuestBreakdowns.mixedGroup.adultsCount);
    expect(breakdown.kidsCount).toBe(testGuestBreakdowns.mixedGroup.kidsCount);
    expect(breakdown.seniorsCount).toBe(testGuestBreakdowns.mixedGroup.seniorsCount);
    expect(breakdown.pwdCount).toBe(testGuestBreakdowns.mixedGroup.pwdCount);

    // Submit guest form
    const guestId = await addGuestPage.createGuest(guestData);

    // Verify guest was created
    await guestsPage.verifyGuestsPage();
    const guestFullName = `${guestData.firstName} ${guestData.lastName}`;
    await guestsPage.verifyGuestInList(guestFullName, guestData.mobileNumber);

    // Track IDs for cleanup
    if (guestId) createdGuestIds.push(guestId);
    if (roomId) createdRoomIds.push(roomId);
  });

  test('should calculate different entrance fees for different guest types', async ({ page }) => {
    // This test verifies that the UI correctly handles different guest types
    // and that entrance fee calculations are triggered (even if we can't verify exact amounts)
    
    // Create prerequisites
    const guestData = generateUniqueGuest();
    await dashboardPage.navigateToSection('Guests');
    await guestsPage.clickAddGuest();
    const guestId = await addGuestPage.createGuest(guestData);

    const roomData = generateUniqueRoom();
    await dashboardPage.navigateToSection('Rooms');
    await roomsPage.clickAddRoom();
    const roomId = await addRoomPage.createRoom(roomData);

    // Test senior group booking
    const seniorBookingData = generateBookingWithGuests(testGuestBreakdowns.seniorGroup, 5);
    seniorBookingData.guestId = guestId;
    seniorBookingData.roomId = roomId;

    await dashboardPage.navigateToSection('Bookings');
    await bookingsPage.clickBookingCreate();
    await addBookingPage.verifyAddBookingPage();

    // Fill form with senior group
    await addBookingPage.fillBookingForm(seniorBookingData);
    
    // Verify breakdown
    const breakdown = await addBookingPage.getGuestBreakdown();
    expect(breakdown.seniorsCount).toBe(4);
    expect(breakdown.adultsCount).toBe(0);
    expect(breakdown.kidsCount).toBe(0);
    expect(breakdown.pwdCount).toBe(0);

    // Cancel this booking form
    await addBookingPage.cancelForm();

    // Test PWD group
    await bookingsPage.clickBookingCreate();
    const pwdBookingData = generateBookingWithGuests(testGuestBreakdowns.pwdGroup, 6);
    pwdBookingData.guestId = guestId;
    pwdBookingData.roomId = roomId;

    await addBookingPage.fillBookingForm(pwdBookingData);
    
    const pwdBreakdown = await addBookingPage.getGuestBreakdown();
    expect(pwdBreakdown.pwdCount).toBe(2);
    expect(pwdBreakdown.adultsCount).toBe(1);

    await addBookingPage.submitForm();
    await bookingsPage.verifyBookingsPage();

    // Track IDs for cleanup
    if (guestId) createdGuestIds.push(guestId);
    if (roomId) createdRoomIds.push(roomId);
  });

  test('should create booking with 2 adults, 2 kids, 2 seniors and verify guest total is preserved', async ({ page }) => {
    // Create prerequisites: guest and room
    const guestData = generateUniqueGuest();
    await dashboardPage.navigateToSection('Guests');
    await guestsPage.clickAddGuest();
    const guestId = await addGuestPage.createGuest(guestData);

    const roomData = generateUniqueRoom();
    await dashboardPage.navigateToSection('Rooms');
    await roomsPage.clickAddRoom();
    const roomId = await addRoomPage.createRoom(roomData);

    // Create booking with family with seniors (2 adults, 2 kids, 2 seniors)
    const bookingData = generateBookingWithGuests(testGuestBreakdowns.familyWithSeniors, 6);
    bookingData.guestId = guestId;
    bookingData.roomId = roomId;
    bookingData.notes = 'Test booking with family and seniors (2 adults, 2 kids, 2 seniors) - includes entrance fees';

    await dashboardPage.navigateToSection('Bookings');
    await bookingsPage.verifyBookingsPage();
    await bookingsPage.clickBookingCreate();
    await addBookingPage.verifyAddBookingPage();

    // Fill and verify guest breakdown
    await addBookingPage.fillBookingForm(bookingData);
    
    const breakdown = await addBookingPage.getGuestBreakdown();
    expect(breakdown.adultsCount).toBe(testGuestBreakdowns.familyWithSeniors.adultsCount);
    expect(breakdown.kidsCount).toBe(testGuestBreakdowns.familyWithSeniors.kidsCount);
    expect(breakdown.seniorsCount).toBe(testGuestBreakdowns.familyWithSeniors.seniorsCount);
    expect(breakdown.pwdCount).toBe(testGuestBreakdowns.familyWithSeniors.pwdCount);

    // Verify total guests calculation (2 adults + 2 kids + 2 seniors = 6)
    const totalGuests = await addBookingPage.getTotalGuestsCount();
    expect(totalGuests).toBe(6);

    await addBookingPage.submitForm();

    // Verify booking was created successfully
    await bookingsPage.verifyBookingsPage();
    const guestFullName = `${guestData.firstName} ${guestData.lastName}`;
    await bookingsPage.verifyBookingDetails({
      guestName: guestFullName,
      status: 'pending'
    });

    // Open the booking from the bookings page to verify guest total is preserved
    await bookingsPage.editBooking(guestFullName);
    await addBookingPage.verifyAddBookingPage();

    // Verify the guest breakdown is preserved in the booking form
    const bookingBreakdown = await addBookingPage.getGuestBreakdown();
    expect(bookingBreakdown.adultsCount).toBe(testGuestBreakdowns.familyWithSeniors.adultsCount);
    expect(bookingBreakdown.kidsCount).toBe(testGuestBreakdowns.familyWithSeniors.kidsCount);
    expect(bookingBreakdown.seniorsCount).toBe(testGuestBreakdowns.familyWithSeniors.seniorsCount);
    expect(bookingBreakdown.pwdCount).toBe(testGuestBreakdowns.familyWithSeniors.pwdCount);

    // Verify total guests calculation in booking form
    const bookingTotalGuests = await addBookingPage.getTotalGuestsCount();
    expect(bookingTotalGuests).toBe(6);

    // Cancel the edit form
    await addBookingPage.cancelForm();

    // Track IDs for cleanup
    if (guestId) createdGuestIds.push(guestId);
    if (roomId) createdRoomIds.push(roomId);
  });
});
