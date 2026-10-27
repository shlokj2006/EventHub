const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const {
    isSafeDevelopmentTarget,
    getAssignmentIndexStatus,
    demoUsers,
    eventDefinitions,
    bookingFixtures,
    assignmentsByStaff,
    seedDatabase,
} = require('../seed');

test('seed accepts only explicit loopback development databases with a development-like name', () => {
    assert.equal(isSafeDevelopmentTarget('mongodb://localhost:27017/eventhub-dev', 'development'), true);
    assert.equal(isSafeDevelopmentTarget('mongodb://127.0.0.1:27017/eventhub_local', 'development'), true);
    assert.equal(isSafeDevelopmentTarget('mongodb://db.example.com/eventhub-dev', 'development'), false);
    assert.equal(isSafeDevelopmentTarget('mongodb+srv://localhost/eventhub-dev', 'development'), false);
    assert.equal(isSafeDevelopmentTarget('mongodb://localhost:27017/eventhub', 'development'), false);
    assert.equal(isSafeDevelopmentTarget('mongodb://localhost:27017/eventhub-production', 'development'), false);
    assert.equal(isSafeDevelopmentTarget('mongodb://localhost:27017/eventhub-test', 'production'), false);
    assert.equal(isSafeDevelopmentTarget(undefined, 'development'), false);
});

test('seed rejects an unsafe target before opening a MongoDB connection', async () => {
    const previousUri = process.env.MONGODB_URI;
    const previousEnv = process.env.NODE_ENV;
    const previousConnect = mongoose.connect;
    process.env.MONGODB_URI = 'mongodb://db.example.com/eventhub-dev';
    process.env.NODE_ENV = 'development';
    let connected = false;
    mongoose.connect = async () => { connected = true; };
    try {
        await assert.rejects(seedDatabase(), /Refusing to seed/);
        assert.equal(connected, false);
    } finally {
        mongoose.connect = previousConnect;
        if (previousUri === undefined) delete process.env.MONGODB_URI;
        else process.env.MONGODB_URI = previousUri;
        if (previousEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousEnv;
    }
});

test('development fixtures include requested identities, roles, and varied future event definitions', () => {
    assert.ok(demoUsers.some((user) => user.email === 'admin@eventora.com' && user.role === 'admin'));
    assert.ok(demoUsers.filter((user) => user.role === 'user').length >= 13);
    assert.ok(demoUsers.filter((user) => user.role === 'event_staff').length >= 3);
    assert.equal(eventDefinitions.length, 12);
    assert.ok(new Set(eventDefinitions.map((event) => event.category)).size >= 6);
    assert.ok(eventDefinitions.every((event) => event.days > 0 && event.totalSeats > 0 && event.ticketPrice >= 0));
    assert.ok(eventDefinitions.every((event) => /^https:\/\//.test(event.image)));
    assert.equal(new Set(bookingFixtures.map((fixture) => fixture.key)).size, bookingFixtures.length);
    assert.ok(bookingFixtures.every((fixture) => fixture.quantity === fixture.attendees.length));
    assert.ok(bookingFixtures.every((fixture) => ['pending', 'confirmed'].includes(fixture.status)
        && ['paid', 'not_paid'].includes(fixture.paymentStatus)));
    assert.ok(Object.values(assignmentsByStaff).every((titles) => titles.length >= 2));
});

test('assignment index check distinguishes the required unique compound index from a missing index', async () => {
    const existing = await getAssignmentIndexStatus({
        aggregate: () => ({ toArray: async () => [] }),
        indexes: async () => [
            { name: '_id_', key: { _id: 1 } },
            { name: 'userId_1_eventId_1', key: { userId: 1, eventId: 1 }, unique: true },
        ],
    });
    assert.deepEqual(existing, { exists: true, conflict: null });

    const missing = await getAssignmentIndexStatus({
        aggregate: () => ({ toArray: async () => [] }),
        indexes: async () => [{ name: '_id_', key: { _id: 1 } }],
    });
    assert.deepEqual(missing, { exists: false, conflict: null });

    const duplicates = await getAssignmentIndexStatus({
        aggregate: () => ({ toArray: async () => [{ _id: { userId: 'u', eventId: 'e' }, count: 2 }] }),
        indexes: async () => [],
    });
    assert.equal(duplicates.exists, false);
    assert.match(duplicates.conflict, /Duplicate staff\/event assignments/);
});
