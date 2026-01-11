// @ts-check
import { test, expect } from '@playwright/test';
import { LoginPage, DashboardPage } from '../page-objects/index.js';
import { testUsers } from '../fixtures/test-data.js';

test.describe('General Application Tests', () => {
  test('has title', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.expectTitle(/Beach Hotel Resort/);
  });

  test('is able to sign with correct credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    // Navigate and login
    await loginPage.goto();
    await loginPage.login(testUsers.validUser.username, testUsers.validUser.password);

    // Verify successful authentication
    await dashboardPage.verifyAuthenticated(testUsers.validUser.username);
    
    // Verify we're on the main dashboard (BookingsPage)
    await dashboardPage.expectTextVisible('Create Booking');
  });
});