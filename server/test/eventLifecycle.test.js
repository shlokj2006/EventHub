const test = require('node:test');
const assert = require('node:assert/strict');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const eventRouter = require('../routes/events');
const { deleteEvent, archiveEvent, restoreEvent, getEvents, getEventById } = require('../controllers/eventController');

const response = () => {
  let code = 200;
  let value;
  return {
    statusCode: () => code,
    body: () => value,
    status(next) { code = next; return this; },
    json(next) { value = next; return this; },
  };
};

const withStubs = async (model, stubs, run) => {
  const original = new Map(Object.entries(stubs).map(([key]) => [key, model[key]]));
  Object.assign(model, stubs);
  try { await run(); } finally { for (const [key, value] of original) model[key] = value; }
};

const id = '507f1f77bcf86cd799439011';

const deletionStubs = ({ capacityClaims = [], exists = true, deleteError = false, leaseExpiresAt = null, fenceBeforeDelete = false } = {}) => {
  const event = { _id: id, capacityClaims, deletionLeaseToken: leaseExpiresAt ? 'stale-token' : null, deletionLeaseExpiresAt: leaseExpiresAt };
  let wasDeleted = false;
  return {
    event,
    wasDeleted: () => wasDeleted,
    stubs: {
      findOneAndUpdate: (filter, update) => ({
        select: async () => {
          assert.equal(filter._id, id);
          if (!exists || (event.deletionLeaseExpiresAt && event.deletionLeaseExpiresAt > new Date())) return null;
          event.deletionLeaseToken = update.$set.deletionLeaseToken;
          event.deletionLeaseExpiresAt = update.$set.deletionLeaseExpiresAt;
          return event;
        },
      }),
      exists: async () => exists,
      findOneAndDelete: async (filter) => {
        if (deleteError) throw new Error('synthetic delete failure');
        if (fenceBeforeDelete) {
          event.deletionLeaseToken = null;
          event.deletionLeaseExpiresAt = null;
        }
        assert.deepEqual(filter.$or, [
          { capacityClaims: { $size: 0 } },
          { capacityClaims: { $exists: false } },
        ]);
        assert.ok(filter.deletionLeaseExpiresAt.$gt instanceof Date);
        if (filter.deletionLeaseToken !== event.deletionLeaseToken || event.capacityClaims.length) return null;
        wasDeleted = true;
        return event;
      },
      updateOne: async (filter, update) => {
        if (filter.deletionLeaseToken === event.deletionLeaseToken) {
          if (update.$unset.deletionLeaseToken) event.deletionLeaseToken = null;
          if (update.$unset.deletionLeaseExpiresAt) event.deletionLeaseExpiresAt = null;
        }
      },
    },
  };
};

test('deletion checks every booking status and releases its admission gate', async () => {
  for (const status of ['pending', 'confirmed', 'cancelled', 'other']) {
    const deletion = deletionStubs();
    await withStubs(Event, deletion.stubs, async () => withStubs(Booking, { exists: async (filter) => {
      assert.deepEqual(filter, { eventId: id });
      return { status };
    } }, async () => {
      const res = response();
      await deleteEvent({ params: { id } }, res);
      assert.equal(res.statusCode(), 409);
      assert.match(res.body().message, /archive/i);
      assert.equal(deletion.wasDeleted(), false);
      assert.equal(deletion.event.deletionLeaseToken, null);
      assert.equal(deletion.event.deletionLeaseExpiresAt, null);
    }));
  }
});

test('an event without bookings can be permanently deleted', async () => {
  const deletion = deletionStubs();
  await withStubs(Event, deletion.stubs, async () => withStubs(Booking, { exists: async () => null }, async () => {
    const res = response();
    await deleteEvent({ params: { id } }, res);
    assert.equal(res.statusCode(), 200);
    assert.equal(deletion.wasDeleted(), true);
  }));
});

test('an expired deletion lease can be reclaimed', async () => {
  const deletion = deletionStubs({ leaseExpiresAt: new Date(Date.now() - 1000) });
  await withStubs(Event, deletion.stubs, async () => withStubs(Booking, { exists: async () => null }, async () => {
    const res = response();
    await deleteEvent({ params: { id } }, res);
    assert.equal(res.statusCode(), 200);
    assert.equal(deletion.wasDeleted(), true);
  }));
});

test('a booking admitted after lease expiry fences the earlier deletion attempt', async () => {
  const deletion = deletionStubs({ fenceBeforeDelete: true });
  await withStubs(Event, deletion.stubs, async () => withStubs(Booking, { exists: async () => null }, async () => {
    const res = response();
    await deleteEvent({ params: { id } }, res);
    assert.equal(res.statusCode(), 409);
    assert.equal(deletion.wasDeleted(), false);
  }));
});

test('nonexistent events return 404 without acquiring a deletion gate', async () => {
  const deletion = deletionStubs({ exists: false });
  await withStubs(Event, deletion.stubs, async () => {
    const res = response();
    await deleteEvent({ params: { id } }, res);
    assert.equal(res.statusCode(), 404);
    assert.equal(deletion.event.deletionLeaseToken, null);
  });
});

test('a claim in the booking admission window blocks deletion and releases the gate', async () => {
  const deletion = deletionStubs({ capacityClaims: [{ bookingId: 'admitting-booking' }] });
  await withStubs(Event, deletion.stubs, async () => withStubs(Booking, { exists: async () => null }, async () => {
    const res = response();
    await deleteEvent({ params: { id } }, res);
    assert.equal(res.statusCode(), 409);
    assert.equal(deletion.wasDeleted(), false);
    assert.equal(deletion.event.deletionLeaseToken, null);
  }));
});

test('unexpected booking lookup errors return 500 and release the deletion gate', async () => {
  const deletion = deletionStubs();
  const originalError = console.error;
  console.error = () => {};
  try {
    await withStubs(Event, deletion.stubs, async () => withStubs(Booking, { exists: async () => { throw new Error('synthetic lookup failure'); } }, async () => {
      const res = response();
      await deleteEvent({ params: { id } }, res);
      assert.equal(res.statusCode(), 500);
      assert.equal(deletion.event.deletionLeaseToken, null);
    }));
  } finally {
    console.error = originalError;
  }
});

test('failed permanent deletion releases its lease', async () => {
  const deletion = deletionStubs({ deleteError: true });
  const originalError = console.error;
  console.error = () => {};
  try {
    await withStubs(Event, deletion.stubs, async () => withStubs(Booking, { exists: async () => null }, async () => {
      const res = response();
      await deleteEvent({ params: { id } }, res);
      assert.equal(res.statusCode(), 500);
      assert.equal(deletion.wasDeleted(), false);
      assert.equal(deletion.event.deletionLeaseToken, null);
      assert.equal(deletion.event.deletionLeaseExpiresAt, null);
    }));
  } finally {
    console.error = originalError;
  }
});

test('archive and restore update only the lifecycle flag and are idempotent', async () => {
  const event = { _id: id, isArchived: false, bookings: ['preserved'], tickets: ['preserved'] };
  await withStubs(Event, {
    findByIdAndUpdate: async (_id, update) => {
      event.isArchived = update.$set.isArchived;
      return event;
    },
  }, async () => {
    for (const handler of [archiveEvent, archiveEvent]) {
      const res = response();
      await handler({ params: { id } }, res);
      assert.equal(res.body().isArchived, true);
    }
    for (const handler of [restoreEvent, restoreEvent]) {
      const res = response();
      await handler({ params: { id } }, res);
      assert.equal(res.body().isArchived, false);
    }
    assert.deepEqual(event.bookings, ['preserved']);
    assert.deepEqual(event.tickets, ['preserved']);
  });
});

test('public event lists and details hide archived events while admins retain access', async () => {
  let filters;
  await withStubs(Event, {
    find: (query) => { filters = query; return { populate: async () => [] }; },
    findById: () => ({ populate: async () => ({ isArchived: true }) }),
  }, async () => {
    const publicRes = response();
    await getEvents({ query: {} }, publicRes);
    assert.deepEqual(filters, { isArchived: { $ne: true } });
    const hidden = response();
    await getEventById({ params: { id }, user: { role: 'user' } }, hidden);
    assert.equal(hidden.statusCode(), 404);
    const visible = response();
    await getEventById({ params: { id }, user: { role: 'admin' } }, visible);
    assert.equal(visible.statusCode(), 200);
  });
});

test('event lifecycle routes retain admin authorization middleware', () => {
  for (const [path, method] of [['/:id/archive', 'patch'], ['/:id/restore', 'patch'], ['/:id', 'delete']]) {
    const route = eventRouter.stack.find((layer) => layer.route?.path === path && layer.route.methods[method]);
    assert.ok(route);
    assert.deepEqual(route.route.stack.slice(0, 2).map((layer) => layer.handle.name), ['protect', 'admin']);
  }
});

test('unauthorized archive, restore, and delete requests fail through route admin middleware', () => {
  for (const [path, method] of [['/:id/archive', 'patch'], ['/:id/restore', 'patch'], ['/:id', 'delete']]) {
    const route = eventRouter.stack.find((layer) => layer.route?.path === path && layer.route.methods[method]);
    const protect = route.route.stack[0].handle;
    const adminGuard = route.route.stack[1].handle;
    const unauthenticated = response();
    let unauthenticatedContinued = false;
    protect({ headers: {} }, unauthenticated, () => { unauthenticatedContinued = true; });
    assert.equal(unauthenticated.statusCode(), 401);
    assert.equal(unauthenticatedContinued, false);

    const res = response();
    let continued = false;
    adminGuard({ user: { role: 'user' } }, res, () => { continued = true; });
    assert.equal(res.statusCode(), 403);
    assert.equal(continued, false);
  }
});
