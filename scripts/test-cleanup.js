// @ts-check
/**
 * Standalone cleanup script for manually cleaning up test data
 * 
 * Usage:
 *   node scripts/test-cleanup.js [auth-token]
 * 
 * If no token is provided, you'll need to set it manually or use cleanup-script.js instead
 * 
 * To get an auth token:
 *   1. Login to the app in browser
 *   2. Open browser console
 *   3. Run: localStorage.getItem('auth_token')
 *   4. Copy the token and pass it as argument
 */

import { testCleanup, setAuthToken } from '../fixtures/cleanup.js';
import { testUsers } from '../fixtures/test-data.js';

async function runCleanup(authToken = null) {
  console.log('🧹 Starting comprehensive test data cleanup...\n');
  
  // Check if token was provided
  if (!authToken) {
    const tokenFromArgs = process.argv[2];
    if (tokenFromArgs) {
      authToken = tokenFromArgs;
      console.log('✅ Using auth token from command line argument');
    } else {
      console.error('❌ No auth token provided!');
      console.error('\nUsage:');
      console.error('  node scripts/test-cleanup.js <auth-token>');
      console.error('\nTo get an auth token:');
      console.error('  1. Login to http://localhost:5173');
      console.error('  2. Open browser console');
      console.error('  3. Run: localStorage.getItem("auth_token")');
      console.error('  4. Copy the token and run: node scripts/test-cleanup.js <token>');
      console.error('\nAlternatively, use cleanup-script.js which handles login automatically:');
      console.error('  npx playwright test cleanup-script.js');
      process.exit(1);
    }
  }
  
  // Set the auth token
  setAuthToken(authToken);
  console.log('✅ Auth token set\n');
  
  // Run cleanup in order: bookings first (they reference guests/rooms), then guests and rooms
  try {
    console.log('🧹 Cleaning up test bookings...');
    await testCleanup.cleanupTestBookings();
    console.log('✅ Bookings cleanup completed\n');
  } catch (error) {
    console.error('❌ Error cleaning up test bookings:', error.message);
  }
  
  try {
    console.log('🧹 Cleaning up test guests...');
    await testCleanup.cleanupTestGuests();
    console.log('✅ Guests cleanup completed\n');
  } catch (error) {
    console.error('❌ Error cleaning up test guests:', error.message);
  }
  
  try {
    console.log('🧹 Cleaning up test rooms...');
    await testCleanup.cleanupTestRooms();
    console.log('✅ Rooms cleanup completed\n');
  } catch (error) {
    console.error('❌ Error cleaning up test rooms:', error.message);
  }
  
  console.log('✅ Comprehensive cleanup completed!');
}

// Run cleanup
runCleanup().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
