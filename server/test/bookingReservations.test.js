const test = require('node:test');
const assert = require('node:assert/strict');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const {
  createCapacityClaim,
  releaseBookingCapacity,
  releaseLegacyCapacity,
  expireBooking,
  reconcileReservingBooking,
  approvePaidBooking,
  transitionBookingCancellation,
} = require('../services/bookingReservations');
const { admin } = require('../middleware/auth');
const cronAuth = require('../middleware/cronAuth');

const withStubs = async (model, stubs, run) => {
  const originals = new Map();
  for (const [name, replacement] of Object.entries(stubs)) {
    originals.set(name, model[name]);
    model[name] = replacement;
  }
  try {
    await run();
  } finally {
    for (const [name, original] of originals) model[name] = original;
  }
};

const makeEventStore = ({ availableSeats = 5, claims = [], releaseIds = [] } = {}) => ({
  _id: 'event-1',
  availableSeats,
  capacityClaims: claims,
  legacyCapacityReleaseIds: releaseIds,
});

const claimModelStubs = (event) => ({
  findOneAndUpdate: async (filter, update) => {
    const bookingId = update.$push?.capacityClaims?.bookingId;
    if (!bookingId) return null;
    const exists = event.capacityClaims.some((claim) => claim.bookingId === bookingId);
    const quantity = -update.$inc.availableSeats;
    assert.deepEqual(filter, {
      _id: event._id,
      availableSeats: { $gte: quantity },
      'capacityClaims.bookingId': { $ne: bookingId },
    });
    if (exists || event.availableSeats < quantity) return null;
    event.availableSeats += update.$inc.availableSeats;
    event.capacityClaims.push(update.$push.capacityClaims);
    return event;
  },
  findOne: (filter) => ({
    select: async () => event.capacityClaims.some((claim) => claim.bookingId === filter.capacityClaims.$elemMatch.bookingId)
      ? { _id: event._id }
      : null,
  }),
});

test('paid booking claims seats atomically at creation', async () => {
  const event = makeEventStore();
  await withStubs(Event, claimModelStubs(event), async () => {
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const result = await createCapacityClaim({
      eventId: event._id,
      bookingId: 'booking-paid',
      userId: 'user-1',
      quantity: 2,
      state: 'reserved',
      expiresAt: expiry,
    });
    assert.equal(result.created, true);
    assert.equal(event.availableSeats, 3);
    assert.equal(event.capacityClaims[0].state, 'reserved');
    assert.equal(event.capacityClaims[0].expiresAt, expiry);
  });
});

test('booking exceeding remaining capacity is rejected without changing seats', async () => {
  const event = makeEventStore({ availableSeats: 1 });
  await withStubs(Event, claimModelStubs(event), async () => {
    const result = await createCapacityClaim({
      eventId: event._id, bookingId: 'over', userId: 'u', quantity: 2, state: 'reserved',
    });
    assert.equal(result, null);
    assert.equal(event.availableSeats, 1);
    assert.equal(event.capacityClaims.length, 0);
  });
});

test('a user may reserve the same event more than once while capacity remains', async () => {
  const event = makeEventStore({ availableSeats: 3 });
  await withStubs(Event, claimModelStubs(event), async () => {
    const first = await createCapacityClaim({ eventId: event._id, bookingId: 'b1', userId: 'u1', quantity: 1, state: 'consumed' });
    const second = await createCapacityClaim({ eventId: event._id, bookingId: 'b2', userId: 'u1', quantity: 2, state: 'reserved' });
    assert.equal(first.created, true);
    assert.equal(second.created, true);
    assert.equal(event.availableSeats, 0);
    assert.deepEqual(event.capacityClaims.map((claim) => claim.userId), ['u1', 'u1']);
  });
});

test('simultaneous repeat claims cannot oversell event capacity', async () => {
  const event = makeEventStore({ availableSeats: 3 });
  await withStubs(Event, claimModelStubs(event), async () => {
    const results = await Promise.all([
      createCapacityClaim({ eventId: event._id, bookingId: 'b1', userId: 'u1', quantity: 2, state: 'reserved' }),
      createCapacityClaim({ eventId: event._id, bookingId: 'b2', userId: 'u1', quantity: 2, state: 'reserved' }),
    ]);
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal(event.availableSeats, 1);
    assert.equal(event.capacityClaims.length, 1);
  });
});

test('approval before expiry confirms without another seat decrement', async () => {
  const now = new Date();
  const booking = {
    _id: 'b', status: 'pending', capacityState: 'reserved',
    reservationExpiresAt: new Date(now.getTime() + 1000),
  };
  const availableSeats = 2;
  await withStubs(Booking, {
    findOneAndUpdate: async (filter, update) => {
      if (booking.status !== filter.status || booking.capacityState !== filter.capacityState || booking.reservationExpiresAt <= filter.reservationExpiresAt.$gt) return null;
      Object.assign(booking, update.$set);
      return booking;
    },
  }, async () => {
    const confirmed = await approvePaidBooking(booking._id, now);
    assert.equal(confirmed.status, 'confirmed');
    assert.equal(booking.capacityState, 'consumed');
    assert.equal(availableSeats, 2);
  });
});

test('admin approval persists either explicit payment choice independently of confirmed status', async () => {
  const now = new Date();
  for (const paymentStatus of ['paid', 'not_paid']) {
    const booking = { _id: `booking-${paymentStatus}`, status: 'pending', capacityState: 'reserved', reservationExpiresAt: new Date(now.getTime() + 60000) };
    const availableSeats = 4;
    await withStubs(Booking, {
      findOneAndUpdate: async (filter, update) => {
        assert.equal(filter.status, 'pending');
        Object.assign(booking, update.$set);
        return booking;
      },
    }, async () => {
      const confirmed = await approvePaidBooking(booking._id, now, paymentStatus);
      assert.equal(confirmed.status, 'confirmed');
      assert.equal(confirmed.paymentStatus, paymentStatus);
      assert.equal(booking.capacityState, 'consumed');
      assert.equal(availableSeats, 4);
    });
  }
});

test('approval after expiry cannot confirm', async () => {
  const now = new Date();
  const booking = { _id: 'b', status: 'pending', capacityState: 'reserved', reservationExpiresAt: now };
  await withStubs(Booking, {
    findOneAndUpdate: async (filter, update) => {
      if (booking.status !== filter.status || booking.capacityState !== filter.capacityState || booking.reservationExpiresAt <= filter.reservationExpiresAt.$gt) return null;
      Object.assign(booking, update.$set);
      return booking;
    },
  }, async () => assert.equal(await approvePaidBooking(booking._id, now), null));
});

test('rejection and repeated cancellation release a new reservation only once', async () => {
  const event = makeEventStore({
    availableSeats: 3,
    claims: [{ bookingId: 'b', userId: 'u', quantity: 2, state: 'reserved' }],
  });
  const booking = { _id: 'b', eventId: event._id, quantity: 2, capacityState: 'releasing' };
  await withStubs(Event, {
    findOneAndUpdate: async (filter, update) => {
      const claim = event.capacityClaims.find((item) => item.bookingId === filter.capacityClaims.$elemMatch.bookingId);
      if (!claim) return null;
      event.availableSeats += update.$inc.availableSeats;
      event.capacityClaims = event.capacityClaims.filter((item) => item.bookingId !== claim.bookingId);
      return event;
    },
  }, async () => withStubs(Booking, {
    updateOne: async () => ({ acknowledged: true }),
  }, async () => {
    await releaseBookingCapacity(booking);
    await releaseBookingCapacity(booking);
    assert.equal(event.availableSeats, 5);
    assert.equal(event.capacityClaims.length, 0);
  }));
});

test('cancellation transition is atomic and records admin rejection distinctly', async () => {
  const booking = { _id: 'b', status: 'pending', capacityState: 'reserved' };
  await withStubs(Booking, {
    findOneAndUpdate: async (filter, update) => {
      if (booking.status !== filter.status || booking.capacityState !== filter.capacityState) return null;
      Object.assign(booking, update.$set);
      return booking;
    },
  }, async () => {
    const cancelled = await transitionBookingCancellation(booking, { isAdmin: true });
    assert.equal(cancelled.status, 'cancelled');
    assert.equal(cancelled.capacityState, 'releasing');
    assert.equal(cancelled.cancellationReason, 'rejected');
    assert.equal(await transitionBookingCancellation(booking, { isAdmin: true }), null);
  });
});

test('approval and rejection racing on one pending booking have one winning transition', async () => {
  const now = new Date();
  const booking = {
    _id: 'race-b', status: 'pending', capacityState: 'reserved',
    reservationExpiresAt: new Date(now.getTime() + 60000),
  };
  await withStubs(Booking, {
    findOneAndUpdate: async (filter, update) => {
      if (booking.status !== filter.status || booking.capacityState !== filter.capacityState) return null;
      if (filter.reservationExpiresAt && booking.reservationExpiresAt <= filter.reservationExpiresAt.$gt) return null;
      Object.assign(booking, update.$set);
      return booking;
    },
  }, async () => {
    const outcomes = await Promise.all([
      approvePaidBooking(booking._id, now),
      transitionBookingCancellation({ ...booking, status: 'pending', capacityState: 'reserved' }, { isAdmin: true }),
    ]);
    assert.equal(outcomes.filter(Boolean).length, 1);
    assert.ok(['confirmed', 'cancelled'].includes(booking.status));
  });
});

test('cancellation of a legacy confirmed booking uses a durable exactly-once release marker', async () => {
  const event = makeEventStore({ availableSeats: 2 });
  await withStubs(Event, {
    findOneAndUpdate: async (filter, update) => {
      if (event.legacyCapacityReleaseIds.includes('legacy-b')) return null;
      event.availableSeats += update.$inc.availableSeats;
      event.legacyCapacityReleaseIds.push(update.$addToSet.legacyCapacityReleaseIds);
      return event;
    },
    exists: async (filter) => event.legacyCapacityReleaseIds.includes(filter.legacyCapacityReleaseIds),
  }, async () => {
    const args = { eventId: event._id, bookingId: 'legacy-b', quantity: 1 };
    assert.equal(await releaseLegacyCapacity(args), true);
    assert.equal(await releaseLegacyCapacity(args), true);
    assert.equal(event.availableSeats, 3);
    assert.equal(event.legacyCapacityReleaseIds.length, 1);
  });
});

test('expiry releases a reservation once and makes the booking non-approvable', async () => {
  const now = new Date();
  const booking = {
    _id: 'b', eventId: 'e', status: 'pending', capacityState: 'reserved', quantity: 1,
    reservationExpiresAt: new Date(now.getTime() - 1),
  };
  const event = makeEventStore({ availableSeats: 4, claims: [{ bookingId: 'b', quantity: 1, state: 'reserved' }] });
  await withStubs(Booking, {
    findOneAndUpdate: async (filter, update) => {
      if (booking.status !== filter.status || booking.capacityState !== 'reserved' || booking.reservationExpiresAt > filter.reservationExpiresAt.$lte) return null;
      Object.assign(booking, update.$set);
      return booking;
    },
    updateOne: async (filter, update) => {
      if (booking._id === filter._id && filter.capacityState.$in.includes(booking.capacityState)) Object.assign(booking, update.$set);
      return { acknowledged: true };
    },
  }, async () => withStubs(Ticket, {
    updateMany: async () => ({ acknowledged: true }),
  }, async () => withStubs(Event, {
    findOneAndUpdate: async (filter, update) => {
      if (!event.capacityClaims.some((claim) => claim.bookingId === filter.capacityClaims.$elemMatch.bookingId)) return null;
      event.availableSeats += update.$inc.availableSeats;
      event.capacityClaims = [];
      return event;
    },
  }, async () => {
    assert.equal(await expireBooking(booking._id, now), true);
    assert.equal(await expireBooking(booking._id, now), false);
    assert.equal(booking.status, 'cancelled');
    assert.equal(booking.cancellationReason, 'expired');
    assert.equal(booking.capacityState, 'released');
    assert.equal(event.availableSeats, 5);
  })));
});

test('expiry and user cancellation races release one reservation once', async () => {
  const now = new Date();
  const booking = {
    _id: 'race-expire', eventId: 'e', status: 'pending', capacityState: 'reserved', quantity: 1,
    reservationExpiresAt: new Date(now.getTime() - 1),
  };
  const event = makeEventStore({ availableSeats: 4, claims: [{ bookingId: booking._id, quantity: 1, state: 'reserved' }] });
  await withStubs(Booking, {
    findOneAndUpdate: async (filter, update) => {
      if (booking.status !== filter.status || booking.capacityState !== 'reserved') return null;
      if (filter.reservationExpiresAt && booking.reservationExpiresAt > filter.reservationExpiresAt.$lte) return null;
      Object.assign(booking, update.$set);
      return booking;
    },
    updateOne: async (filter, update) => {
      if (filter.capacityState.$in.includes(booking.capacityState)) Object.assign(booking, update.$set);
      return { acknowledged: true };
    },
  }, async () => withStubs(Ticket, {
    updateMany: async () => ({ acknowledged: true }),
  }, async () => withStubs(Event, {
    findOneAndUpdate: async (filter, update) => {
      if (!event.capacityClaims.some((claim) => claim.bookingId === filter.capacityClaims.$elemMatch.bookingId)) return null;
      event.availableSeats += update.$inc.availableSeats;
      event.capacityClaims = [];
      return event;
    },
  }, async () => {
    const [expired, cancelled] = await Promise.all([
      expireBooking(booking._id, now),
      transitionBookingCancellation({ ...booking }, { isAdmin: false }),
    ]);
    if (cancelled) await releaseBookingCapacity(cancelled);
    assert.equal(Number(expired) + Number(Boolean(cancelled)), 1);
    assert.equal(booking.status, 'cancelled');
    assert.ok(['expired', 'cancelled'].includes(booking.cancellationReason));
    assert.equal(event.availableSeats, 5);
  })));
});

test('reserve saga reconciles a database failure after the event write without reserving twice', async () => {
  const event = makeEventStore();
  const booking = {
    _id: 'b', eventId: event._id, userId: 'u', quantity: 2, status: 'pending',
    capacityState: 'reserving', reservationExpiresAt: new Date(Date.now() + 60000),
  };
  let throwAfterEventWrite = true;
  await withStubs(Event, {
    findOneAndUpdate: async (filter, update) => {
      const claim = update.$push.capacityClaims;
      if (event.capacityClaims.some((item) => item.bookingId === claim.bookingId)) return null;
      event.availableSeats += update.$inc.availableSeats;
      event.capacityClaims.push(claim);
      if (throwAfterEventWrite) {
        throwAfterEventWrite = false;
        throw new Error('simulated lost database response');
      }
      return event;
    },
    findOne: (filter) => ({ select: async () => event.capacityClaims.some((claim) => claim.bookingId === filter.capacityClaims.$elemMatch.bookingId) ? event : null }),
  }, async () => withStubs(Booking, {
    updateOne: async (filter, update) => {
      Object.assign(booking, update.$set);
      return { acknowledged: true };
    },
  }, async () => {
    await assert.rejects(createCapacityClaim({
      eventId: event._id, bookingId: booking._id, userId: booking.userId,
      quantity: 2, state: 'reserved', expiresAt: booking.reservationExpiresAt,
    }));
    await reconcileReservingBooking(booking);
    assert.equal(event.availableSeats, 3);
    assert.equal(event.capacityClaims.length, 1);
    assert.equal(booking.capacityState, 'reserved');
  }));
});

test('release saga recovers after the event write succeeds but the booking update fails', async () => {
  const event = makeEventStore({ availableSeats: 3, claims: [{ bookingId: 'b', quantity: 2, state: 'reserved' }] });
  const booking = { _id: 'b', eventId: event._id, quantity: 2, capacityState: 'releasing' };
  let throwAfterEventWrite = true;
  await withStubs(Event, {
    findOneAndUpdate: async (filter, update) => {
      const claimId = filter.capacityClaims.$elemMatch.bookingId;
      if (!event.capacityClaims.some((claim) => claim.bookingId === claimId)) return null;
      event.availableSeats += update.$inc.availableSeats;
      event.capacityClaims = event.capacityClaims.filter((claim) => claim.bookingId !== claimId);
      if (throwAfterEventWrite) {
        throwAfterEventWrite = false;
        throw new Error('simulated lost database response');
      }
      return event;
    },
  }, async () => withStubs(Booking, {
    updateOne: async (filter, update) => {
      Object.assign(booking, update.$set);
      return { acknowledged: true };
    },
  }, async () => {
    await assert.rejects(releaseBookingCapacity(booking));
    await releaseBookingCapacity(booking);
    assert.equal(event.availableSeats, 5);
    assert.equal(event.capacityClaims.length, 0);
    assert.equal(booking.capacityState, 'released');
  }));
});

test('free booking claims capacity as consumed and never enters the paid approval state', async () => {
  const event = makeEventStore();
  await withStubs(Event, claimModelStubs(event), async () => {
    const result = await createCapacityClaim({
      eventId: event._id, bookingId: 'free-b', userId: 'free-u', quantity: 1, state: 'consumed',
    });
    assert.equal(result.claim.state, 'consumed');
    assert.equal(result.claim.expiresAt, undefined);
    assert.equal(event.availableSeats, 4);
  });
});

test('only an authenticated admin passes the existing approval role guard', () => {
  const invoke = (user) => {
    let nextCalled = false;
    const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    admin({ user }, res, () => { nextCalled = true; });
    return { res, nextCalled };
  };
  assert.equal(invoke({ role: 'admin' }).nextCalled, true);
  assert.equal(invoke({ role: 'user' }).res.code, 403);
  assert.equal(invoke(null).res.code, 403);
});

test('maintenance endpoint requires the configured long bearer secret', () => {
  const originalSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = 'test-secret-with-16-plus-characters';
  const invoke = (authorization) => {
    let nextCalled = false;
    const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    cronAuth({ get: () => authorization }, res, () => { nextCalled = true; });
    return { res, nextCalled };
  };

  try {
    assert.equal(invoke('Bearer test-secret-with-16-plus-characters').nextCalled, true);
    assert.equal(invoke('Bearer wrong-secret').res.code, 401);
    process.env.CRON_SECRET = 'short';
    assert.equal(invoke('Bearer short').res.code, 503);
  } finally {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  }
});
