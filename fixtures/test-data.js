// @ts-check

/**
 * Test data for various test scenarios
 */

export const testUsers = {
  validUser: {
    username: 'john',
    password: 'changeme%%!22'
  },
  invalidUser: {
    username: 'invalid',
    password: 'wrong'
  }
};

export const testGuests = {
  validGuest: {
    firstName: 'John',
    lastName: 'Smith',
    mobileNumber: '9123456789',
    countryCode: '+63',
    notes: 'Test guest created via automation',
    status: 'not_ready'
  },
  
  minimalGuest: {
    firstName: 'Jane',
    lastName: 'Doe',
    mobileNumber: '9987654321'
  },
  
  internationalGuest: {
    firstName: 'Mike',
    lastName: 'Johnson',
    mobileNumber: '5551234567',
    countryCode: '+1',
    notes: 'Guest from USA',
    status: 'ready'
  },
  
  invalidGuest: {
    firstName: '',
    lastName: '',
    mobileNumber: '123' // Too short
  }
};

export const validationMessages = {
  requiredFirstName: 'First name is required',
  requiredLastName: 'Last name is required',
  requiredMobile: 'Mobile number is required',
  invalidMobile: 'Please enter a valid 10-digit mobile number'
};

// Generate unique guest data for tests that need unique values
export function generateUniqueGuest() {
  const timestamp = Date.now();
  return {
    firstName: `TestUser${timestamp}`,
    lastName: `Auto${timestamp}`,
    mobileNumber: `912345${String(timestamp).slice(-4)}`,
    countryCode: '+63',
    address: `${timestamp} Test Street, Test City`,
    notes: `Automated test guest created at ${new Date().toISOString()}`,
    status: 'not_ready'
  };
}

// Booking test data
export const testBookings = {
  overnightBooking: {
    checkInDateTime: '2024-12-01T15:00',
    checkOutDateTime: '2024-12-02T11:00',
    numberOfGuests: 2,
    bookingType: 'overnight'
  },
  
  dayUseBooking: {
    checkInDateTime: '2024-12-01T08:00',
    checkOutDateTime: '2024-12-01T18:00',
    numberOfGuests: 1,
    bookingType: 'day_use'
  }
};

// Generate future booking dates to avoid conflicts
export function generateFutureBooking(daysFromNow = 1) {
  const checkInDate = new Date();
  checkInDate.setDate(checkInDate.getDate() + daysFromNow);
  checkInDate.setHours(15, 0, 0, 0); // 3:00 PM check-in
  
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkOutDate.getDate() + 1);
  checkOutDate.setHours(11, 0, 0, 0); // 11:00 AM check-out
  
  return {
    checkInDateTime: checkInDate.toISOString().slice(0, 16),
    checkOutDateTime: checkOutDate.toISOString().slice(0, 16),
    // Guest breakdown (new format)
    adultsCount: 2,
    kidsCount: 0,
    seniorsCount: 0,
    pwdCount: 0,
    // Legacy field for backward compatibility
    numberOfGuests: 2
  };
}

/**
 * Generate booking data with specific guest breakdown
 * @param {Object} guestBreakdown
 * @param {number} guestBreakdown.adultsCount
 * @param {number} guestBreakdown.kidsCount
 * @param {number} guestBreakdown.seniorsCount
 * @param {number} guestBreakdown.pwdCount
 * @param {number} daysFromNow - Days from current date for check-in
 * @returns {Object}
 */
export function generateBookingWithGuests(guestBreakdown, daysFromNow = 1) {
  const baseBooking = generateFutureBooking(daysFromNow);
  const totalGuests = guestBreakdown.adultsCount + guestBreakdown.kidsCount + guestBreakdown.seniorsCount + guestBreakdown.pwdCount;
  
  return {
    ...baseBooking,
    ...guestBreakdown,
    numberOfGuests: totalGuests
  };
}

// Room test data
export const testRooms = {
  standardRoom: {
    name: 'Standard Room 101',
    capacity: 2,
    price: 1500, // Legacy support
    weekdayPrice: 1500,
    weekendPrice: 1950,
    weekdayHourRate: 200,
    weekendHourRate: 260
  },

  familyRoom: {
    name: 'Family Room 201',
    capacity: 4,
    price: 2500, // Legacy support
    weekdayPrice: 2500,
    weekendPrice: 3250,
    weekdayHourRate: 300,
    weekendHourRate: 390
  },

  suiteRoom: {
    name: 'Executive Suite 301',
    capacity: 6,
    price: 4000, // Legacy support
    weekdayPrice: 4000,
    weekendPrice: 5200,
    weekdayHourRate: 500,
    weekendHourRate: 650
  },

  minimalRoom: {
    name: 'Basic Room',
    capacity: 1,
    price: 1000, // Legacy support
    weekdayPrice: 1000,
    weekendPrice: 1300,
    weekdayHourRate: 150,
    weekendHourRate: 195
  }
};

// Generate unique room data
export function generateUniqueRoom() {
  const timestamp = Date.now();
  const weekdayPrice = Math.floor(Math.random() * 3000) + 1000; // 1000-4000 price
  const weekendPrice = Math.floor(weekdayPrice * 1.3); // Weekend is typically 30% more
  return {
    name: `TestRoom${timestamp}`,
    capacity: Math.floor(Math.random() * 4) + 1, // 1-4 capacity
    // Legacy support - keep price for backward compatibility
    price: weekdayPrice,
    weekdayPrice: weekdayPrice,
    weekendPrice: weekendPrice,
    weekdayHourRate: Math.floor(weekdayPrice / 10), // Hourly rate is typically ~10% of daily rate
    weekendHourRate: Math.floor(weekendPrice / 10)
  };
}

// Generate unique booking data with future dates
export function generateUniqueBooking(guestId = null, roomId = null) {
  const futureBooking = generateFutureBooking(Math.floor(Math.random() * 30) + 1); // 1-30 days from now
  
  return {
    guestId,
    roomId,
    ...futureBooking,
    numberOfGuests: Math.floor(Math.random() * 4) + 1, // 1-4 guests
    bookingType: ['overnight', 'day_use', 'both'][Math.floor(Math.random() * 3)],
    notes: `Automated test booking created at ${new Date().toISOString()}`
  };
}

// Room validation messages
export const roomValidationMessages = {
  requiredName: 'Room name is required',
  requiredCapacity: 'Maximum number of people must be greater than 0',
  negativePrice: 'Pricing cannot be negative'
};

// Booking validation messages
export const bookingValidationMessages = {
  requiredGuest: 'Guest selection is required',
  requiredCheckIn: 'Check-in date and time is required',
  requiredCheckOut: 'Check-out date and time is required',
  invalidDateRange: 'Check-out must be after check-in',
  requiredGuests: 'Number of guests must be greater than 0',
  requiredRoom: 'Room selection is required'
};

// Settings test data
export const testResortInfo = {
  basic: {
    name: 'Paradise Beach Resort',
    phone: '+63 123 456 7890',
    address: '123 Beach Road, Paradise Island, Philippines',
    email: 'info@paradisebeach.com'
  },
  
  complete: {
    name: 'Paradise Beach Resort & Spa',
    phone: '+63 987 654 3210',
    address: '456 Ocean Drive, Tropical Island, Philippines',
    email: 'contact@paradisebeach.com',
    website: 'https://www.paradisebeach.com',
    logoUrl: '/uploads/resort-logo.png'
  },
  
  updated: {
    name: 'Updated Paradise Resort',
    phone: '+63 555 123 4567',
    address: 'Updated Address, New Location',
    email: 'new@paradisebeach.com',
    website: 'https://www.newparadise.com',
    logoUrl: '/uploads/new-logo.png'
  }
};

/**
 * Generate unique resort info for testing
 * @returns {Object}
 */
export function generateUniqueResortInfo() {
  const timestamp = Date.now();
  return {
    name: `Test Resort ${timestamp}`,
    phone: `+63 ${timestamp.toString().slice(-9)}`,
    address: `${timestamp} Test Street, Test City, Philippines`,
    email: `test${timestamp}@resort.com`,
    website: `https://test${timestamp}.com`,
    logoUrl: `/uploads/logo-${timestamp}.png`
  };
}

export const testEntranceFees = {
  basic: {
    dayTour: { adult: 150, kid: 100, senior: 120, pwd: 120 },
    overnight: { adult: 200, kid: 150, senior: 180, pwd: 180 },
    currency: 'PHP',
    effectiveDate: '2024-01-01'
  },
  
  updated: {
    dayTour: { adult: 200, kid: 120, senior: 150, pwd: 150 },
    overnight: { adult: 300, kid: 200, senior: 250, pwd: 250 },
    currency: 'PHP',
    effectiveDate: '2024-06-01'
  },
  
  usd: {
    dayTour: { adult: 5, kid: 3, senior: 4, pwd: 4 },
    overnight: { adult: 8, kid: 5, senior: 6, pwd: 6 },
    currency: 'USD',
    effectiveDate: '2024-01-01'
  }
};

/**
 * Generate future effective date
 * @param {number} daysFromNow - Days from current date
 * @returns {string} Date in YYYY-MM-DD format
 */
export function generateFutureEffectiveDate(daysFromNow = 30) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

// Guest breakdown test scenarios
export const testGuestBreakdowns = {
  adultsOnly: {
    adultsCount: 2,
    kidsCount: 0,
    seniorsCount: 0,
    pwdCount: 0
  },
  
  familyWithKids: {
    adultsCount: 2,
    kidsCount: 2,
    seniorsCount: 0,
    pwdCount: 0
  },
  
  mixedGroup: {
    adultsCount: 2,
    kidsCount: 1,
    seniorsCount: 1,
    pwdCount: 1
  },
  
  seniorGroup: {
    adultsCount: 0,
    kidsCount: 0,
    seniorsCount: 4,
    pwdCount: 0
  },
  
  pwdGroup: {
    adultsCount: 1,
    kidsCount: 0,
    seniorsCount: 0,
    pwdCount: 2
  },
  
  familyWithSeniors: {
    adultsCount: 2,
    kidsCount: 2,
    seniorsCount: 2,
    pwdCount: 0
  }
};
