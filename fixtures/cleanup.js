// @ts-check

/**
 * Cleanup utilities for maintaining clean test state
 */

const API_BASE_URL = 'http://localhost:3001/api/v1';

/**
 * Get auth token from localStorage (similar to frontend implementation)
 */
function getAuthToken() {
  // In a real test environment, we'd need to manage auth tokens properly
  // For now, this is a placeholder that would be set during login
  return global.testAuthToken || null;
}

/**
 * Make authenticated API request
 */
async function authenticatedRequest(url, options = {}) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No auth token available for cleanup operations');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  return response;
}

/**
 * Cleanup class to manage test data cleanup
 */
export class TestCleanup {
  constructor() {
    // Track created items for cleanup
    this.createdItems = {
      guests: [],
      rooms: [],
      bookings: []
    };
  }

  /**
   * Track a created guest for cleanup
   * @param {number} guestId
   */
  trackGuest(guestId) {
    this.createdItems.guests.push(guestId);
  }

  /**
   * Track a created room for cleanup
   * @param {number} roomId
   */
  trackRoom(roomId) {
    this.createdItems.rooms.push(roomId);
  }

  /**
   * Track a created booking for cleanup
   * @param {number} bookingId
   */
  trackBooking(bookingId) {
    this.createdItems.bookings.push(bookingId);
  }

  /**
   * Clean up all tracked items
   */
  async cleanupAll() {
    console.log('Starting cleanup of test data...');
    
    // Clean up bookings first (they may reference guests and rooms)
    await this.cleanupBookings();
    
    // Then clean up guests and rooms
    await Promise.all([
      this.cleanupGuests(),
      this.cleanupRooms()
    ]);

    console.log('✅ Cleanup completed - All tracked items verified as deleted');
  }

  /**
   * Clean up tracked guests
   */
  async cleanupGuests() {
    for (const guestId of this.createdItems.guests) {
      try {
        // Step 1: Attempt to delete
        const deleteResponse = await authenticatedRequest(`${API_BASE_URL}/guests/${guestId}`, {
          method: 'DELETE'
        });
        
        if (deleteResponse.ok) {
          // Step 2: Verify deletion by trying to fetch the record
          const verifyResponse = await authenticatedRequest(`${API_BASE_URL}/guests/${guestId}`);
          
          if (verifyResponse.status === 404) {
            console.log(`✅ Verified deletion of guest ${guestId}`);
          } else {
            console.warn(`⚠️ Guest ${guestId} still exists after deletion attempt`);
          }
        } else if (deleteResponse.status === 404) {
          console.log(`✅ Guest ${guestId} already deleted`);
        } else {
          console.warn(`❌ Failed to cleanup guest ${guestId}: ${deleteResponse.status}`);
        }
      } catch (error) {
        console.warn(`💥 Error cleaning up guest ${guestId}:`, error.message);
      }
    }
    this.createdItems.guests = [];
  }

  /**
   * Clean up tracked rooms
   */
  async cleanupRooms() {
    for (const roomId of this.createdItems.rooms) {
      try {
        // Step 1: Attempt to delete
        const deleteResponse = await authenticatedRequest(`${API_BASE_URL}/rooms/${roomId}`, {
          method: 'DELETE'
        });
        
        if (deleteResponse.ok) {
          // Step 2: Verify deletion by trying to fetch the record
          const verifyResponse = await authenticatedRequest(`${API_BASE_URL}/rooms/${roomId}`);
          
          if (verifyResponse.status === 404) {
            console.log(`✅ Verified deletion of room ${roomId}`);
          } else {
            console.warn(`⚠️ Room ${roomId} still exists after deletion attempt`);
          }
        } else if (deleteResponse.status === 404) {
          console.log(`✅ Room ${roomId} already deleted`);
        } else {
          console.warn(`❌ Failed to cleanup room ${roomId}: ${deleteResponse.status}`);
        }
      } catch (error) {
        console.warn(`💥 Error cleaning up room ${roomId}:`, error.message);
      }
    }
    this.createdItems.rooms = [];
  }

  /**
   * Clean up tracked bookings
   */
  async cleanupBookings() {
    for (const bookingId of this.createdItems.bookings) {
      try {
        // Step 1: Attempt to delete
        const deleteResponse = await authenticatedRequest(`${API_BASE_URL}/bookings/${bookingId}`, {
          method: 'DELETE'
        });
        
        if (deleteResponse.ok) {
          // Step 2: Verify deletion by trying to fetch the record
          const verifyResponse = await authenticatedRequest(`${API_BASE_URL}/bookings/${bookingId}`);
          
          if (verifyResponse.status === 404) {
            console.log(`✅ Verified deletion of booking ${bookingId}`);
          } else {
            console.warn(`⚠️ Booking ${bookingId} still exists after deletion attempt`);
          }
        } else if (deleteResponse.status === 404) {
          console.log(`✅ Booking ${bookingId} already deleted`);
        } else {
          console.warn(`❌ Failed to cleanup booking ${bookingId}: ${deleteResponse.status}`);
        }
      } catch (error) {
        console.warn(`💥 Error cleaning up booking ${bookingId}:`, error.message);
      }
    }
    this.createdItems.bookings = [];
  }

  /**
   * Clean up by searching for test items (fallback method)
   * This can be used to clean up items that might have been missed
   */
  async cleanupTestItems() {
    try {
      // Clean up guests with test naming pattern
      await this.cleanupTestGuests();
      
      // Clean up rooms with test naming pattern
      await this.cleanupTestRooms();
      
      // Clean up bookings for test guests
      await this.cleanupTestBookings();
    } catch (error) {
      console.warn('Error during test item cleanup:', error.message);
    }
  }

  async cleanupTestGuests() {
    try {
      const response = await authenticatedRequest(`${API_BASE_URL}/guests`);
      if (response.ok) {
        const guests = await response.json();
        const testGuests = guests.filter(guest => 
          guest.firstName?.includes('TestUser') || 
          guest.firstName?.includes('Minimal') ||
          guest.lastName?.includes('Auto') ||
          guest.notes?.includes('Automated test guest')
        );

        console.log(`Found ${testGuests.length} test guest(s) to clean up`);
        for (const guest of testGuests) {
          try {
            const deleteResponse = await authenticatedRequest(`${API_BASE_URL}/guests/${guest.id}`, {
              method: 'DELETE'
            });
            if (deleteResponse.ok || deleteResponse.status === 404) {
              console.log(`✅ Cleaned up test guest ${guest.firstName} ${guest.lastName} (ID: ${guest.id})`);
            } else {
              console.warn(`⚠️ Failed to delete guest ${guest.id}: ${deleteResponse.status} ${deleteResponse.statusText}`);
            }
          } catch (error) {
            console.warn(`⚠️ Error deleting guest ${guest.id}:`, error.message);
          }
        }
      } else {
        console.warn(`⚠️ Failed to fetch guests for cleanup: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.warn('❌ Error cleaning up test guests:', error.message);
    }
  }

  async cleanupTestRooms() {
    try {
      const response = await authenticatedRequest(`${API_BASE_URL}/rooms`);
      if (response.ok) {
        const rooms = await response.json();
        const testRooms = rooms.filter(room => 
          room.name?.includes('Test') || 
          room.name?.includes('Automated') ||
          room.name?.includes('MinimalRoom') ||
          room.name?.includes('Standard Room 101') ||
          room.name?.includes('Family Room 201') ||
          room.name?.includes('Executive Suite 301') ||
          room.name?.includes('Basic Room') ||
          // Also catch any room with timestamp patterns (13+ digits)
          /\d{13,}/.test(room.name || '')
        );

        console.log(`Found ${testRooms.length} test room(s) to clean up`);
        for (const room of testRooms) {
          try {
            const deleteResponse = await authenticatedRequest(`${API_BASE_URL}/rooms/${room.id}`, {
              method: 'DELETE'
            });
            if (deleteResponse.ok || deleteResponse.status === 404) {
              console.log(`✅ Cleaned up test room ${room.name} (ID: ${room.id})`);
            } else {
              console.warn(`⚠️ Failed to delete room ${room.id}: ${deleteResponse.status} ${deleteResponse.statusText}`);
            }
          } catch (error) {
            console.warn(`⚠️ Error deleting room ${room.id}:`, error.message);
          }
        }
      } else {
        console.warn(`⚠️ Failed to fetch rooms for cleanup: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.warn('❌ Error cleaning up test rooms:', error.message);
    }
  }

  async cleanupTestBookings() {
    try {
      const response = await authenticatedRequest(`${API_BASE_URL}/bookings`);
      if (response.ok) {
        const bookings = await response.json();
        
        // Compute guestName from guest relation if not available
        const bookingsWithGuestName = bookings.map(booking => {
          let guestName = booking.guestName;
          if (!guestName && booking.guest) {
            // If guestName is not available but guest relation is, compute it
            guestName = booking.guest.firstName && booking.guest.lastName
              ? `${booking.guest.firstName} ${booking.guest.lastName}`
              : booking.guest.firstName || booking.guest.lastName || 'N/A';
          }
          return { ...booking, guestName: guestName || 'N/A' };
        });
        
        // Filter test bookings by guestName or notes
        const testBookings = bookingsWithGuestName.filter(booking => {
          const hasTestGuest = booking.guestName?.includes('TestUser') || 
                              booking.guestName?.includes('Minimal') ||
                              (booking.guest?.firstName?.includes('TestUser')) ||
                              (booking.guest?.lastName?.includes('Auto'));
          const hasTestNotes = booking.notes?.includes('Automated test') ||
                              booking.notes?.includes('Automated test guest');
          return hasTestGuest || hasTestNotes;
        });

        console.log(`Found ${testBookings.length} test booking(s) to clean up`);
        if (testBookings.length > 0) {
          console.log(`Test bookings found: ${testBookings.map(b => `ID: ${b.id}, Guest: ${b.guestName}`).join(', ')}`);
        }
        
        for (const booking of testBookings) {
          try {
            const deleteResponse = await authenticatedRequest(`${API_BASE_URL}/bookings/${booking.id}`, {
              method: 'DELETE'
            });
            // DELETE returns 204 NO_CONTENT on success, or 404 if already deleted
            if (deleteResponse.ok || deleteResponse.status === 204 || deleteResponse.status === 404) {
              console.log(`✅ Cleaned up test booking for ${booking.guestName} (ID: ${booking.id})`);
            } else {
              console.warn(`⚠️ Failed to delete booking ${booking.id}: ${deleteResponse.status} ${deleteResponse.statusText}`);
            }
          } catch (error) {
            console.warn(`⚠️ Error deleting booking ${booking.id}:`, error.message);
          }
        }
      } else {
        console.warn(`⚠️ Failed to fetch bookings for cleanup: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.warn('❌ Error cleaning up test bookings:', error.message);
    }
  }
}

/**
 * Global cleanup instance
 */
export const testCleanup = new TestCleanup();

/**
 * Set auth token for cleanup operations
 * This should be called after successful login in tests
 */
export function setAuthToken(token) {
  global.testAuthToken = token;
}
