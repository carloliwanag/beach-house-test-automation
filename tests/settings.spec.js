// @ts-check
import { test, expect } from '@playwright/test';
import { 
  LoginPage, 
  DashboardPage, 
  SettingsPage, 
  ResortInfoPage, 
  EntranceFeesPage 
} from '../page-objects/index.js';
import { 
  testUsers, 
  testResortInfo, 
  testEntranceFees,
  generateUniqueResortInfo,
  generateFutureEffectiveDate
} from '../fixtures/test-data.js';
import { testCleanup, setAuthToken } from '../fixtures/cleanup.js';

test.describe('Settings Management', () => {
  let loginPage, dashboardPage, settingsPage, resortInfoPage, entranceFeesPage;
  let authToken;

  test.beforeEach(async ({ page }) => {
    // Initialize page objects
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    settingsPage = new SettingsPage(page);
    resortInfoPage = new ResortInfoPage(page);
    entranceFeesPage = new EntranceFeesPage(page);

    // Login
    await loginPage.goto();
    await loginPage.login(testUsers.validUser.username, testUsers.validUser.password);
    await dashboardPage.verifyAuthenticated(testUsers.validUser.username);

    // Set auth token for cleanup operations
    authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    setAuthToken(authToken);

    // Navigate to Settings
    await dashboardPage.navigateToSection('Settings');
    await settingsPage.verifySettingsPage();
  });

  test.afterEach(async () => {
    // Note: Settings don't typically need cleanup as they're configuration updates,
    // not new entity creation. In a real scenario, you might want to reset to default values.
    console.log('Settings test completed');
  });

  test.afterAll(async () => {
    console.log('🧹 Settings tests completed - no cleanup needed for configuration updates');
  });

  test('should display settings page with correct tabs', async ({ page }) => {
    // Verify page elements
    await settingsPage.verifySettingsPage();
    
    // Verify General tab is active by default
    await settingsPage.verifyActiveTab('general');
    await resortInfoPage.verifyResortInfoForm();
  });

  test('should be able to switch between tabs', async ({ page }) => {
    // Verify General tab is active initially
    await settingsPage.verifyActiveTab('general');
    await resortInfoPage.verifyResortInfoForm();

    // Switch to Pricing tab
    await settingsPage.switchToPricingTab();
    await settingsPage.verifyActiveTab('pricing');
    await entranceFeesPage.verifyEntranceFeesForm();

    // Switch back to General tab
    await settingsPage.switchToGeneralTab();
    await settingsPage.verifyActiveTab('general');
    await resortInfoPage.verifyResortInfoForm();
  });

  test('should be able to update resort information with basic data', async ({ page }) => {
    // Navigate to General tab
    await settingsPage.switchToGeneralTab();
    await resortInfoPage.verifyResortInfoForm();

    // Update resort info with basic data
    const resortData = generateUniqueResortInfo();
    await resortInfoPage.updateResortInfo(resortData);

    // Verify success message
    await resortInfoPage.verifySuccessMessage();

    // Verify data is saved by checking form values
    const savedData = await resortInfoPage.getCurrentResortInfo();
    expect(savedData.name).toBe(resortData.name);
    expect(savedData.phone).toBe(resortData.phone);
    expect(savedData.address).toBe(resortData.address);
    expect(savedData.email).toBe(resortData.email);
  });

  test('should be able to update resort information with complete data', async ({ page }) => {
    // Navigate to General tab
    await settingsPage.switchToGeneralTab();
    await resortInfoPage.verifyResortInfoForm();

    // Update with complete data including optional fields
    const completeData = { ...testResortInfo.complete };
    completeData.name += ` ${Date.now()}`; // Make unique
    
    await resortInfoPage.updateResortInfo(completeData);

    // Verify success message
    await resortInfoPage.verifySuccessMessage();

    // Verify all data is saved
    const savedData = await resortInfoPage.getCurrentResortInfo();
    expect(savedData.name).toBe(completeData.name);
    expect(savedData.website).toBe(completeData.website);
    expect(savedData.logoUrl).toBe(completeData.logoUrl);
  });

  test('should show validation error for missing required fields', async ({ page }) => {
    // Navigate to General tab
    await settingsPage.switchToGeneralTab();
    await resortInfoPage.verifyResortInfoForm();

    // Clear all required fields
    await resortInfoPage.clearAllFields();

    // Try to save
    await resortInfoPage.saveResortInfo();

    // Verify validation error message
    await resortInfoPage.verifyValidationError('Please fill in all required fields');
  });

  test('should be able to update entrance fees with basic rates', async ({ page }) => {
    // Navigate to Pricing tab
    await settingsPage.switchToPricingTab();
    await entranceFeesPage.verifyEntranceFeesForm();

    // Update with basic entrance fees
    const feesData = {
      ...testEntranceFees.basic,
      effectiveDate: generateFutureEffectiveDate(7) // 7 days from now
    };

    await entranceFeesPage.updateEntranceFees(feesData);

    // Verify success message
    await entranceFeesPage.verifySuccessMessage();

    // Verify rates are correctly displayed
    await entranceFeesPage.verifyDisplayedRates({
      dayTour: feesData.dayTour,
      overnight: feesData.overnight
    });
  });

  test('should be able to update entrance fees with different currency', async ({ page }) => {
    // Navigate to Pricing tab
    await settingsPage.switchToPricingTab();
    await entranceFeesPage.verifyEntranceFeesForm();

    // Update with USD currency
    const usdFeesData = {
      ...testEntranceFees.usd,
      effectiveDate: generateFutureEffectiveDate(14) // 14 days from now
    };

    await entranceFeesPage.updateEntranceFees(usdFeesData);

    // Verify success message
    await entranceFeesPage.verifySuccessMessage();

    // Verify rates are saved correctly
    await entranceFeesPage.verifyDisplayedRates({
      dayTour: usdFeesData.dayTour,
      overnight: usdFeesData.overnight
    });
  });

  test('should be able to update individual entrance fee rates', async ({ page }) => {
    // Navigate to Pricing tab
    await settingsPage.switchToPricingTab();
    await entranceFeesPage.verifyEntranceFeesForm();

    // Update only day tour rates
    const dayTourRates = { adult: 180, kid: 120, senior: 140, pwd: 140 };
    await entranceFeesPage.fillDayTourRates(dayTourRates);
    await entranceFeesPage.saveEntranceFees();

    // Verify success message
    await entranceFeesPage.verifySuccessMessage();

    // Verify day tour rates are updated
    const savedDayTour = await entranceFeesPage.getCurrentDayTourRates();
    expect(savedDayTour.adult).toBe(dayTourRates.adult);
    expect(savedDayTour.kid).toBe(dayTourRates.kid);
  });

  test.skip('should persist data when switching between tabs', async ({ page }) => {
    // Update resort info in General tab
    await settingsPage.switchToGeneralTab();
    const resortData = generateUniqueResortInfo();
    await resortInfoPage.updateResortInfo(resortData); // Save immediately

    // Verify resort data is saved
    await resortInfoPage.verifySuccessMessage();

    // Switch to Pricing tab and update fees
    await settingsPage.switchToPricingTab();
    const feesData = testEntranceFees.basic;
    await entranceFeesPage.updateEntranceFees(feesData); // Save immediately

    // Verify pricing data is saved
    await entranceFeesPage.verifySuccessMessage();

    // Switch back to General tab and verify resort info persisted
    await settingsPage.switchToGeneralTab();
    const savedResortData = await resortInfoPage.getCurrentResortInfo();
    expect(savedResortData.name).toBe(resortData.name);
    expect(savedResortData.email).toBe(resortData.email);

    // Switch back to pricing and verify rates persisted
    await settingsPage.switchToPricingTab();
    await entranceFeesPage.verifyDisplayedRates({
      dayTour: feesData.dayTour,
      overnight: feesData.overnight
    });
  });
});
