// @ts-check
import { test } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage.js';
import { testCleanup, setAuthToken } from '../fixtures/cleanup.js';
import { testUsers } from '../fixtures/test-data.js';

test('Cleanup all test data', async ({ page }) => {
  console.log('🧹 Starting comprehensive test data cleanup...');
  
  // Login to get auth token
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(testUsers.validUser.username, testUsers.validUser.password);
  
  // Get auth token from localStorage
  const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
  
  if (!authToken) {
    console.error('❌ No auth token found after login');
    return;
  }
  
  console.log('✅ Authentication successful\n');
  
  // Set auth token for cleanup
  setAuthToken(authToken);
  
  try {
    // Clean up all test data types in order: bookings first, then guests and rooms
    console.log('🧹 Cleaning up test bookings...');
    await testCleanup.cleanupTestBookings();
    console.log('');
    
    console.log('🧹 Cleaning up test guests...');
    await testCleanup.cleanupTestGuests();
    console.log('');
    
    console.log('🧹 Cleaning up test rooms...');
    await testCleanup.cleanupTestRooms();
    console.log('');
    
    console.log('✅ Comprehensive cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Cleanup error:', error.message);
    throw error;
  }
});
