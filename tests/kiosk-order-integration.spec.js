// @ts-check
import { test, expect } from '@playwright/test';
import { testUsers } from '../fixtures/test-data.js';

const BEACH_HOTEL_API = 'https://beach-hotel-backend-production.up.railway.app/api/v1';
const KIOSK_API    = 'https://playa-montana-kiosk-production.up.railway.app/api';
const KIOSK_URL    = 'https://playa-montana-kiosk-production.up.railway.app';

// Guest "Test Carlo" — ID 301 in the Beach Hotel system.
// The kiosk validates with lastName, so we use the last name field value.
const TEST_GUEST_ID        = 301;
const TEST_GUEST_LAST_NAME = 'Carlo';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Authenticate with the Beach Hotel API and return a JWT. */
async function getBeachHotelToken() {
  const res = await fetch(`${BEACH_HOTEL_API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: testUsers.validUser.username,
      password: testUsers.validUser.password,
    }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

/** Convenience wrapper for authenticated calls to the Beach Hotel API. */
async function bhApi(method, path, body, token) {
  const res = await fetch(`${BEACH_HOTEL_API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return res;
}

/**
 * Return candidate room ids to try for a new booking.
 * We fetch all rooms and exclude daytour tables and already-used ids.
 * The booking API itself will reject rooms with date conflicts.
 */
async function getCandidateRoomIds(token, excludeIds = []) {
  const res   = await bhApi('GET', '/rooms', undefined, token);
  if (!res.ok) throw new Error(`Failed to fetch rooms: ${res.status}`);
  const data  = await res.json();
  const rooms = Array.isArray(data) ? data : (data.data ?? []);
  return rooms
    .filter(r => !excludeIds.includes(r.id) && !/daytour/i.test(r.name))
    .map(r => r.id);
}

/**
 * Create a booking for the test guest, check it in, and return the bookingId
 * plus the auto-generated kioskPin.
 * Tries multiple vacant rooms until one is actually available for the dates.
 */
async function createCheckedInBooking(token, excludeRoomIds = []) {
  // Use today as check-in so the booking can be immediately checked in.
  const checkIn = new Date();
  checkIn.setHours(14, 0, 0, 0);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 1);
  checkOut.setHours(11, 0, 0, 0);

  const vacantIds = await getCandidateRoomIds(token, excludeRoomIds);
  if (vacantIds.length === 0) throw new Error('No candidate rooms found for test');

  let bookingId, roomId;
  for (const candidateRoomId of vacantIds) {
    const createRes = await bhApi('POST', '/bookings', {
      guestId:          TEST_GUEST_ID,
      roomIds:          [candidateRoomId],
      checkInDateTime:  checkIn.toISOString().slice(0, 16),
      checkOutDateTime: checkOut.toISOString().slice(0, 16),
      numberOfGuests:   1,
      adultsCount:      1,
      kidsCount:        0,
      seniorsCount:     0,
      pwdCount:         0,
      bookingType:      'overnight',
      notes:            'Automated kiosk integration test',
    }, token);

    if (createRes.ok) {
      const booking = await createRes.json();
      bookingId = booking.id;
      roomId    = candidateRoomId;
      break;
    }
    // Room not available for these dates — try next one
    console.log(`[setup] Room ${candidateRoomId} unavailable for dates, trying next...`);
  }

  if (!bookingId) throw new Error('Could not create booking: no rooms available for the test dates');

  // Walk through the required status transitions: pending → confirmed → checked_in.
  // The transition to checked_in triggers automatic kioskPin generation.
  for (const status of ['confirmed', 'checked_in']) {
    const res = await bhApi('PATCH', `/bookings/${bookingId}`, { status }, token);
    if (!res.ok) {
      throw new Error(`Status transition to '${status}' failed: ${res.status} ${await res.text()}`);
    }
  }

  // Fetch the updated booking to read the generated kioskPin.
  const getRes  = await bhApi('GET', `/bookings/${bookingId}`, undefined, token);
  const updated = await getRes.json();

  return { bookingId, kioskPin: updated.kioskPin, roomId };
}

/** Delete a booking — used in afterEach cleanup. */
async function deleteBooking(bookingId, token) {
  try {
    await bhApi('DELETE', `/bookings/${bookingId}`, undefined, token);
  } catch (err) {
    console.warn(`[cleanup] Failed to delete booking ${bookingId}:`, err.message);
  }
}

/** Update a kiosk order's status via the kiosk API. */
async function setKioskOrderStatus(orderId, status) {
  const res = await fetch(`${KIOSK_API}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return res;
}

/** Return food-type invoice items from a booking response. */
function extractFoodInvoiceItems(bookingData) {
  const invoices = bookingData.invoices ?? [];
  return invoices.flatMap(inv => {
    const items = inv.invoiceItems ?? inv.items ?? [];
    return items.filter(item => item.itemType === 'food');
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

// Run serially: each test creates/cancels bookings for the same room.
test.describe.configure({ mode: 'serial' });

test.describe('Kiosk Order Integration', () => {
  let authToken;
  let createdBookingIds = [];

  test.beforeAll(async () => {
    authToken = await getBeachHotelToken();
  });

  test.afterEach(async () => {
    for (const id of createdBookingIds) {
      await deleteBooking(id, authToken);
    }
    createdBookingIds = [];
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  test('guest logs in, places order, order is served, invoice item added to booking', async ({ page }) => {
    // 1. Set up: create a checked-in booking and retrieve the kiosk PIN.
    const { bookingId, kioskPin } = await createCheckedInBooking(authToken);
    createdBookingIds.push(bookingId);
    expect(kioskPin, 'Checked-in booking must have a kioskPin').toBeTruthy();

    // 2. Open the kiosk welcome page and log in.
    await page.goto(KIOSK_URL);
    await expect(page.locator('h1').filter({ hasText: 'Welcome' })).toBeVisible({ timeout: 15000 });

    await page.fill('#lastName', TEST_GUEST_LAST_NAME);
    await page.fill('#pin', String(kioskPin));
    await page.getByRole('button', { name: 'Start Order' }).click();

    // 3. Verify navigation to the menu.
    await expect(page).toHaveURL(/\/menu/, { timeout: 15000 });

    // 4. Wait for menu items to load and add the first available item.
    const firstAddButton = page.getByRole('button', { name: 'Add' }).first();
    await expect(firstAddButton).toBeVisible({ timeout: 15000 });
    await firstAddButton.click();

    // 5. Open cart via the CartButton that appears after adding an item.
    const viewOrderButton = page.getByRole('button', { name: /View Order/ });
    await expect(viewOrderButton).toBeVisible();
    await viewOrderButton.click();

    // 6. On the cart page, verify content and place the order.
    await expect(page).toHaveURL(/\/cart/);
    await expect(page.getByRole('heading', { name: 'Review & Place Order' })).toBeVisible();

    await page.getByRole('button', { name: 'Place Order' }).click();

    // 7. Confirm the order was placed.
    await expect(page).toHaveURL(/\/confirmation/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Order Placed!' })).toBeVisible();

    // 8. Retrieve the new order from the kiosk API.
    // charge-booking is async; give it a moment to land.
    await page.waitForTimeout(3000);

    const ordersRes = await fetch(`${KIOSK_API}/orders`);
    expect(ordersRes.ok).toBe(true);
    const orders = await ordersRes.json();
    const order  = orders.find(o => o.booking_id === bookingId);
    expect(order, 'Order should appear in kiosk orders for this booking').toBeTruthy();

    // 9. Walk the order through the kitchen workflow.
    for (const status of ['preparing', 'ready', 'served']) {
      const res = await setKioskOrderStatus(order.id, status);
      expect(res.ok, `Status update to "${status}" should succeed`).toBe(true);
    }

    // 10. Verify the invoice item was charged to the booking.
    await page.waitForTimeout(2000); // final async propagation
    const bookingRes  = await bhApi('GET', `/bookings/${bookingId}`, undefined, authToken);
    const bookingData = await bookingRes.json();
    const foodItems   = extractFoodInvoiceItems(bookingData);

    expect(foodItems.length, 'Booking invoice should contain at least one food charge').toBeGreaterThan(0);
  });

  // ── Edge case: invalid PIN ──────────────────────────────────────────────────

  test('invalid PIN is rejected with an error message', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await expect(page.locator('h1').filter({ hasText: 'Welcome' })).toBeVisible({ timeout: 15000 });

    await page.fill('#lastName', TEST_GUEST_LAST_NAME);
    await page.fill('#pin', '0000'); // wrong PIN
    await page.getByRole('button', { name: 'Start Order' }).click();

    await expect(page.locator('text=Invalid last name or PIN')).toBeVisible({ timeout: 10000 });
    // Must stay on the welcome page.
    await expect(page).not.toHaveURL(/\/menu/);
  });

  // ── Edge case: cancellation reverses the invoice charge ────────────────────

  test('cancelling a pending order removes the invoice charge from the booking', async ({ page }) => {
    const { bookingId, kioskPin } = await createCheckedInBooking(authToken);
    createdBookingIds.push(bookingId);

    // Place an order through the kiosk UI.
    await page.goto(KIOSK_URL);
    await page.waitForLoadState('networkidle');
    await page.fill('#lastName', TEST_GUEST_LAST_NAME);
    await page.fill('#pin', String(kioskPin));
    await page.getByRole('button', { name: 'Start Order' }).click();
    await expect(page).toHaveURL(/\/menu/, { timeout: 15000 });

    await expect(page.getByRole('button', { name: 'Add' }).first()).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Add' }).first().click();

    await page.getByRole('button', { name: /View Order/ }).click();
    await expect(page).toHaveURL(/\/cart/);
    await page.getByRole('button', { name: 'Place Order' }).click();
    await expect(page).toHaveURL(/\/confirmation/, { timeout: 15000 });

    // Wait for the async charge-booking call to complete.
    await page.waitForTimeout(5000);

    // Find the order.
    const ordersRes = await fetch(`${KIOSK_API}/orders`);
    const orders    = await ordersRes.json();
    const order     = orders.find(o => o.booking_id === bookingId);
    expect(order, 'Order should exist').toBeTruthy();

    // Verify a food charge was added to the invoice.
    const beforeRes  = await bhApi('GET', `/bookings/${bookingId}`, undefined, authToken);
    const beforeData = await beforeRes.json();
    const foodBefore = extractFoodInvoiceItems(beforeData);
    expect(foodBefore.length, 'Invoice should have food items before cancellation').toBeGreaterThan(0);

    // Cancel the order.
    const cancelRes = await fetch(`${KIOSK_API}/orders/${order.id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(cancelRes.ok).toBe(true);
    const cancelData = await cancelRes.json();
    expect(cancelData.status).toBe('cancelled');

    // Wait for the async uncharge-booking call.
    await page.waitForTimeout(4000);

    // Verify the invoice charge was removed.
    const afterRes  = await bhApi('GET', `/bookings/${bookingId}`, undefined, authToken);
    const afterData = await afterRes.json();
    const foodAfter = extractFoodInvoiceItems(afterData);
    expect(foodAfter.length, 'Invoice food charges should be removed after cancellation')
      .toBeLessThan(foodBefore.length);
  });

  // ── Edge case: per-order spending limit ────────────────────────────────────

  test('order exceeding the ₱5,000 per-order cap is rejected', async () => {
    const { bookingId } = await createCheckedInBooking(authToken);
    createdBookingIds.push(bookingId);

    const res = await fetch(`${KIOSK_API}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId,
        guestName: 'Test Carlo',
        items: [{
          menuItemId: 999,
          itemName:   'Over-limit Item',
          unitPrice:  5001,
          quantity:   1,
        }],
      }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('spending_limit');
    expect(body.message).toContain('5,000');
  });

  // ── Edge case: cannot cancel a served order ────────────────────────────────

  test('cancelling a served order returns 409 not_cancellable', async () => {
    const { bookingId } = await createCheckedInBooking(authToken);
    createdBookingIds.push(bookingId);

    // Place a small order via the kiosk API directly.
    const orderRes = await fetch(`${KIOSK_API}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId,
        guestName: 'Test Carlo',
        items: [{
          menuItemId: 1,
          itemName:   'Test Item',
          unitPrice:  100,
          quantity:   1,
        }],
      }),
    });
    expect(orderRes.ok).toBe(true);
    const { orderId } = await orderRes.json();

    // Advance to served.
    for (const status of ['preparing', 'ready', 'served']) {
      await setKioskOrderStatus(orderId, status);
    }

    // Attempt cancellation — must be rejected.
    const cancelRes = await fetch(`${KIOSK_API}/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(cancelRes.status).toBe(409);
    const body = await cancelRes.json();
    expect(body.error).toBe('not_cancellable');
  });
});

// ── Kitchen Board ─────────────────────────────────────────────────────────────

test.describe('Kitchen Board Order Status Flow', () => {
  test.describe.configure({ mode: 'serial' });

  let authToken;
  let createdBookingIds = [];

  test.beforeAll(async () => {
    authToken = await getBeachHotelToken();
    await clearStaleKioskOrders();
  });

  test.afterEach(async () => {
    for (const id of createdBookingIds) {
      await deleteBooking(id, authToken);
    }
    createdBookingIds = [];
    // Serve any lingering active orders so the board stays clean for the next test
    await clearStaleKioskOrders();
  });

  /**
   * Place a small order via the kiosk API and return the orderId.
   * Faster than going through the UI for kitchen-focused tests.
   */
  async function placeKioskOrder(bookingId, itemName = 'Test Burger') {
    const res = await fetch(`${KIOSK_API}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId,
        guestName: 'Test Carlo',
        deliveryRoom: 'Test Room',
        items: [{ menuItemId: 1, itemName, unitPrice: 200, quantity: 1 }],
      }),
    });
    if (!res.ok) throw new Error(`Place order failed: ${res.status} ${await res.text()}`);
    const { orderId } = await res.json();
    return orderId;
  }

  /**
   * Return the OrderCard locator for a specific order id on the kitchen board.
   *
   * OrderCard DOM structure:
   *   div.bg-white.rounded-xl   ← card root   (3 levels up from the span)
   *     div.flex.items-center   ← header row
   *       div                   ← left cluster
   *         span.text-lg.font-bold  ← "#orderId" span
   *
   * We navigate up 3 levels from the span to reach the card root.
   */
  function getOrderCard(page, orderId) {
    return page
      .locator(`span.text-lg.font-bold:text-is("#${orderId}")`)
      .locator('../../..');
  }

  /** Mark all stale non-served/non-cancelled orders as served so the board is clean. */
  async function clearStaleKioskOrders() {
    const res    = await fetch(`${KIOSK_API}/orders`);
    const data   = await res.json();
    const orders = Array.isArray(data) ? data : [];
    const stale  = orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status));
    for (const o of stale) {
      await fetch(`${KIOSK_API}/orders/${o.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'served' }),
      });
    }
    console.log(`[kitchen setup] Cleared ${stale.length} stale order(s) from board`);
  }

  // ── Test 1: full kitchen workflow ──────────────────────────────────────────

  test('order progresses through Pending → Preparing → Ready → Served on kitchen board', async ({ page }) => {
    const { bookingId } = await createCheckedInBooking(authToken);
    createdBookingIds.push(bookingId);
    const orderId = await placeKioskOrder(bookingId, 'Test Burger');

    await page.goto(`${KIOSK_URL}/kitchen`);
    await expect(page.locator('header').getByText('Kitchen Display')).toBeVisible({ timeout: 10000 });

    // ── Pending ───────────────────────────────────────────────────────────────
    const card = getOrderCard(page, orderId);
    await expect(card).toBeVisible({ timeout: 10000 });

    // Verify action button matches pending state
    await expect(card.getByRole('button', { name: 'Start Preparing' })).toBeVisible();
    // Cancel (✕) should be available while pending
    await expect(card.getByTitle('Cancel order')).toBeVisible();

    // ── Pending → Preparing ───────────────────────────────────────────────────
    await Promise.all([
      page.waitForResponse(r => r.url().includes(`/orders/${orderId}/status`) && r.request().method() === 'PATCH'),
      card.getByRole('button', { name: 'Start Preparing' }).click(),
    ]);
    await expect(card.getByRole('button', { name: 'Mark Ready' })).toBeVisible({ timeout: 10000 });
    // Cancel still available in preparing
    await expect(card.getByTitle('Cancel order')).toBeVisible();

    // ── Preparing → Ready ─────────────────────────────────────────────────────
    await Promise.all([
      page.waitForResponse(r => r.url().includes(`/orders/${orderId}/status`) && r.request().method() === 'PATCH'),
      card.getByRole('button', { name: 'Mark Ready' }).click(),
    ]);
    await expect(card.getByRole('button', { name: 'Mark Served' })).toBeVisible({ timeout: 10000 });
    // Cancel NOT available once ready (button has title "Cancel order")
    await expect(card.getByTitle('Cancel order')).not.toBeVisible();

    // ── Ready → Served → off board ────────────────────────────────────────────
    await Promise.all([
      page.waitForResponse(r => r.url().includes(`/orders/${orderId}/status`) && r.request().method() === 'PATCH'),
      card.getByRole('button', { name: 'Mark Served' }).click(),
    ]);
    // Served orders are filtered out; card should disappear from the board
    await expect(card).not.toBeVisible({ timeout: 10000 });

    // Confirm status via API
    const orderRes  = await fetch(`${KIOSK_API}/orders/${orderId}`);
    const orderData = await orderRes.json();
    expect(orderData.status).toBe('served');
  });

  // ── Test 2: cancel from kitchen board ─────────────────────────────────────

  test('kitchen staff can cancel a pending order from the board', async ({ page }) => {
    const { bookingId } = await createCheckedInBooking(authToken);
    createdBookingIds.push(bookingId);
    const orderId = await placeKioskOrder(bookingId, 'Test Salad');

    await page.goto(`${KIOSK_URL}/kitchen`);
    await expect(page.locator('header').getByText('Kitchen Display')).toBeVisible({ timeout: 10000 });

    const card = getOrderCard(page, orderId);
    await expect(card).toBeVisible({ timeout: 10000 });

    // Click cancel and wait for the API response to complete before asserting.
    // cancelOrder in useOrderStream only removes the card via Socket.io; we
    // wait for the HTTP cancel response so the server has emitted the socket
    // event, then give the UI time to react.
    const [cancelResponse] = await Promise.all([
      page.waitForResponse(r => r.url().includes(`/orders/${orderId}/cancel`) && r.request().method() === 'POST'),
      card.getByTitle('Cancel order').click(),
    ]);
    expect(cancelResponse.ok()).toBe(true);

    // Card should vanish from the board (removed via Socket.io order_updated event).
    // If Socket.io is slow, the board will also update on the next 5-second poll.
    await expect(card).not.toBeVisible({ timeout: 15000 });

    // Confirm cancellation via API
    const orderRes  = await fetch(`${KIOSK_API}/orders/${orderId}`);
    const orderData = await orderRes.json();
    expect(orderData.status).toBe('cancelled');
  });

  // ── Test 3: new order shows live without page reload ──────────────────────

  test('a new order placed while kitchen board is open appears without refresh', async ({ page }) => {
    const { bookingId } = await createCheckedInBooking(authToken);
    createdBookingIds.push(bookingId);

    // Open kitchen board first, before the order exists.
    // KitchenBoard is lazy-loaded; wait for the header span to appear.
    await page.goto(`${KIOSK_URL}/kitchen`);
    await expect(page.locator('header').getByText('Kitchen Display')).toBeVisible({ timeout: 15000 });

    // Place the order AFTER the board is open (simulates a guest ordering while
    // kitchen staff are watching the display)
    const orderId = await placeKioskOrder(bookingId, 'Live Test Item');

    // The new order should appear via Socket.io (or polling fallback) without
    // any manual page reload
    const card = getOrderCard(page, orderId);
    await expect(card).toBeVisible({ timeout: 20000 });
    await expect(card.getByRole('button', { name: 'Start Preparing' })).toBeVisible();
  });
});
