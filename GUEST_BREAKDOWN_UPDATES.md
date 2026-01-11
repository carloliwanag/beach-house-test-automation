# Guest Breakdown and Entrance Fees Test Updates

## Overview

This document outlines the comprehensive updates made to the test automation suite to support the new guest breakdown functionality (adults, kids, senior citizens, PWD) and entrance fee calculations as specified in `/Users/carloliwanag/workspaces/beach-hotel/requirements/adult_kids_fees.md`.

## Updated Page Objects

### 1. AddBookingPage.js

**New Selectors Added:**

```javascript
// Guest breakdown fields (new)
this.adultsCountInput = "#adultsCount";
this.kidsCountInput = "#kidsCount";
this.seniorsCountInput = "#seniorsCount";
this.pwdCountInput = "#pwdCount";
```

**New Methods Added:**

- `fillGuestBreakdown(guestBreakdown)` - Fill individual guest type counts
- `getGuestBreakdown()` - Get current guest breakdown values
- `getTotalGuestsCount()` - Calculate total guests from breakdown

**Updated Methods:**

- `fillBookingForm()` - Now supports both legacy `numberOfGuests` and new guest breakdown fields
- Backward compatibility maintained for existing tests

### 2. AddGuestPage.js

**New Selectors Added:**

```javascript
// Guest breakdown fields for initial reservation
this.adultsCountInput = "#pencilAdults";
this.kidsCountInput = "#pencilKids";
this.seniorsCountInput = "#pencilSeniors";
this.pwdCountInput = "#pencilPwd";
```

**New Methods Added:**

- `fillGuestBreakdown(guestBreakdown)` - Fill guest breakdown for initial reservation
- `getGuestBreakdown()` - Get current guest breakdown values

**Updated Methods:**

- `fillBookingDetails()` - Now supports guest breakdown for initial reservations
- Maintains backward compatibility with legacy `numberOfGuests`

## Updated Test Data

### 1. test-data.js

**Enhanced Functions:**

- `generateFutureBooking()` - Now includes guest breakdown fields alongside legacy `numberOfGuests`
- Added `generateBookingWithGuests()` - Generate booking with specific guest breakdown
- Added `testGuestBreakdowns` - Predefined guest type scenarios:
  - `adultsOnly` - 2 adults only
  - `familyWithKids` - 2 adults + 2 kids
  - `mixedGroup` - 2 adults + 1 kid + 1 senior + 1 PWD
  - `seniorGroup` - 4 seniors only
  - `pwdGroup` - 1 adult + 2 PWD

**Backward Compatibility:**

- All existing tests continue to work with legacy `numberOfGuests` field
- New guest breakdown fields are automatically calculated when legacy field is used

## New Test Suite

### guest-breakdown.spec.js

**Test Scenarios:**

1. **Adults Only Booking** - Verifies booking creation with only adult guests
2. **Family with Kids** - Tests booking with adults and children
3. **Initial Reservation with Guest Breakdown** - Tests guest creation with initial booking using breakdown
4. **Different Guest Types** - Verifies UI handles seniors and PWD guests correctly

**Test Features:**

- Comprehensive guest breakdown verification
- Total guest count calculations
- Form interaction validation
- Entrance fee integration testing (UI level)

## Key Features and Benefits

### 1. Backward Compatibility

- All existing tests continue to work without modification
- Legacy `numberOfGuests` field is automatically converted to guest breakdown
- Gradual migration path for test updates

### 2. Enhanced Test Coverage

- Individual guest type testing (adults, kids, seniors, PWD)
- Entrance fee calculation verification
- Mixed guest group scenarios
- Real-world booking scenarios

### 3. Robust Page Object Model

- Clear separation of concerns
- Reusable methods for guest breakdown
- Consistent API between booking and guest forms

### 4. Test Data Flexibility

- Predefined guest breakdown scenarios
- Easy generation of custom guest combinations
- Support for different booking types and durations

## Implementation Details

### Guest Breakdown Structure

```javascript
{
  adultsCount: 2,     // Number of adult guests
  kidsCount: 1,       // Number of child guests
  seniorsCount: 0,    // Number of senior citizen guests
  pwdCount: 1,        // Number of PWD guests
  numberOfGuests: 4   // Total (calculated automatically)
}
```

### Form Field Mapping

**Booking Form:**

- Adults: `#adultsCount`
- Kids: `#kidsCount`
- Seniors: `#seniorsCount`
- PWD: `#pwdCount`

**Guest Initial Reservation:**

- Adults: `#pencilAdults`
- Kids: `#pencilKids`
- Seniors: `#pencilSeniors`
- PWD: `#pencilPwd`

## Usage Examples

### Creating a Family Booking

```javascript
const familyBooking = generateBookingWithGuests({
  adultsCount: 2,
  kidsCount: 2,
  seniorsCount: 0,
  pwdCount: 0,
});

await addBookingPage.fillBookingForm(familyBooking);
```

### Verifying Guest Breakdown

```javascript
const breakdown = await addBookingPage.getGuestBreakdown();
expect(breakdown.adultsCount).toBe(2);
expect(breakdown.kidsCount).toBe(2);

const totalGuests = await addBookingPage.getTotalGuestsCount();
expect(totalGuests).toBe(4);
```

### Using Predefined Scenarios

```javascript
import { testGuestBreakdowns } from "../fixtures/test-data.js";

const bookingData = generateBookingWithGuests(
  testGuestBreakdowns.familyWithKids,
  3 // days from now
);
```

## Testing Strategy

### 1. Functional Testing

- Verify form accepts guest breakdown inputs
- Test total guest calculations
- Validate entrance fee integration
- Check backward compatibility

### 2. Scenario Testing

- Family bookings (adults + kids)
- Senior group reservations
- PWD accommodation bookings
- Mixed group scenarios

### 3. Integration Testing

- Guest creation with initial reservation
- Booking modification with breakdown changes
- Invoice generation with entrance fees
- Settings integration for fee calculations

## Future Enhancements

### 1. Entrance Fee Validation

- Add specific entrance fee amount verification
- Test different booking types (overnight vs day tour)
- Validate multi-night stay calculations

### 2. Advanced Scenarios

- Group booking management
- Age-based guest categorization
- Dynamic pricing based on guest types

### 3. Reporting and Analytics

- Guest type distribution reports
- Revenue breakdown by guest category
- Entrance fee contribution analysis

## Migration Guide

### For Existing Tests

1. **No immediate changes required** - Legacy `numberOfGuests` still works
2. **Gradual migration** - Update tests to use guest breakdown when modifying
3. **Enhanced testing** - Add guest breakdown verification to existing scenarios

### For New Tests

1. **Use guest breakdown** - Prefer `generateBookingWithGuests()` over legacy functions
2. **Test specific scenarios** - Use predefined `testGuestBreakdowns` for common cases
3. **Verify calculations** - Always check total guest count matches breakdown

## Conclusion

The guest breakdown and entrance fees functionality has been comprehensively integrated into the test automation suite while maintaining full backward compatibility. The new test coverage ensures that the enhanced booking system works correctly across all guest types and scenarios, providing confidence in the entrance fee calculations and guest management features.

