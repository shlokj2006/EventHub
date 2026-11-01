const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Event = require('../models/Event');
const EventStaffAssignment = require('../models/EventStaffAssignment');
const { protect, admin, eventStaff } = require('../middleware/auth');
const { getMyAssignedEvents, getAssignedEvent } = require('../controllers/eventStaffController');
const { getEvents } = require('../controllers/eventController');
const staffRouter = require('../routes/eventStaff');

test('all staff designation and assignment management routes require admin authorization', () => {
    const adminPaths = [
        ['get', '/admin'],
        ['post', '/admin'],
        ['post', '/admin/:staffId/events'],
        ['delete', '/admin/:staffId/events/:eventId'],
        ['delete', '/admin/:staffId'],
    ];
    for (const [method, path] of adminPaths) {
        const route = staffRouter.stack.find((layer) => layer.route?.path === path && layer.route.methods[method]);
        assert.ok(route, `${method.toUpperCase()} ${path} route exists`);
        assert.deepEqual(route.route.stack.slice(0, 2).map((layer) => layer.handle.name), ['protect', 'admin']);
    }
});

const response = () => {
    let statusCode = 200;
    let body;
    return {
        statusCode: () => statusCode,
        body: () => body,
        status(code) { statusCode = code; return this; },
        json(value) { body = value; return this; },
    };
};

test('current database role governs staff and admin authorization regardless of JWT role', async () => {
    const previousSecret = process.env.JWT_SECRET;
    const previousFindById = User.findById;
    process.env.JWT_SECRET = 'event-staff-test-secret';
    User.findById = () => ({ select: async () => ({ _id: 'staff-1', id: 'staff-1', role: 'event_staff', tokenVersion: 2 }) });
    try {
        const token = jwt.sign({ id: 'staff-1', role: 'admin', tokenVersion: 2 }, process.env.JWT_SECRET);
        const req = { headers: { authorization: `Bearer ${token}` } };
        const res = response();
        let continued = false;
        await protect(req, res, () => { continued = true; });
        assert.equal(continued, true);
        eventStaff(req, res, () => { continued = true; });
        assert.equal(res.statusCode(), 200);
        admin(req, res, () => { throw new Error('staff must not pass admin guard'); });
        assert.equal(res.statusCode(), 403);
    } finally {
        User.findById = previousFindById;
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
    }
});

test('changing a staff role invalidates the existing session and removes staff access', async () => {
    const previousSecret = process.env.JWT_SECRET;
    const previousFindById = User.findById;
    process.env.JWT_SECRET = 'event-staff-test-secret';
    User.findById = () => ({ select: async () => ({ _id: 'staff-1', id: 'staff-1', role: 'user', tokenVersion: 3 }) });
    try {
        const token = jwt.sign({ id: 'staff-1', role: 'event_staff', tokenVersion: 2 }, process.env.JWT_SECRET);
        const req = { headers: { authorization: `Bearer ${token}` } };
        const res = response();
        let continued = false;
        await protect(req, res, () => { continued = true; });
        assert.equal(res.statusCode(), 401);
        assert.equal(continued, false);
        eventStaff({ user: { role: 'user' } }, res, () => { throw new Error('revoked user must not pass staff guard'); });
        assert.equal(res.statusCode(), 403);
    } finally {
        User.findById = previousFindById;
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
    }
});

test('staff event list queries only assignment event IDs and returns event documents only', async () => {
    const previousAssignments = EventStaffAssignment.find;
    const previousEvents = Event.find;
    let eventQuery;
    let selected;
    EventStaffAssignment.find = () => ({ select() { return this; }, lean: async () => [{ eventId: 'assigned-1' }, { eventId: 'assigned-2' }] });
    Event.find = (query) => {
        eventQuery = query;
        return { select(projection) { selected = projection; return this; }, lean: async () => [{ _id: 'assigned-1', title: 'Only assigned event' }] };
    };
    try {
        const res = response();
        await getMyAssignedEvents({ user: { _id: 'staff-1' } }, res);
        assert.deepEqual(eventQuery, { _id: { $in: ['assigned-1', 'assigned-2'] } });
        assert.match(selected, /availableSeats/);
        assert.doesNotMatch(selected, /\b(bookings|attendees|tickets)\b/i);
        assert.deepEqual(res.body(), [{ _id: 'assigned-1', title: 'Only assigned event' }]);
    } finally {
        EventStaffAssignment.find = previousAssignments;
        Event.find = previousEvents;
    }
});

test('staff cannot read an event outside their assignment, even by requesting its ID', async () => {
    const previousExists = EventStaffAssignment.exists;
    const previousFindById = Event.findById;
    EventStaffAssignment.exists = async () => false;
    Event.findById = () => { throw new Error('unassigned event must not be queried'); };
    try {
        const res = response();
        await getAssignedEvent({ user: { _id: 'staff-1' }, params: { eventId: '507f1f77bcf86cd799439011' } }, res);
        assert.equal(res.statusCode(), 404);
    } finally {
        EventStaffAssignment.exists = previousExists;
        Event.findById = previousFindById;
    }
});

test('the public event list is scoped to assigned events for an authenticated staff principal', async () => {
    const previousAssignments = EventStaffAssignment.find;
    const previousEvents = Event.find;
    let query;
    let projection;
    EventStaffAssignment.find = () => ({ select() { return this; }, lean: async () => [{ eventId: 'assigned-1' }] });
    Event.find = (filters) => {
        query = filters;
        return { select(fields) { projection = fields; return this; }, lean: async () => [{ _id: 'assigned-1' }] };
    };
    try {
        const res = response();
        await getEvents({ user: { _id: 'staff-1', role: 'event_staff' }, query: { category: 'music' } }, res);
        assert.deepEqual(query, { _id: { $in: ['assigned-1'] }, category: 'music' });
        assert.doesNotMatch(projection, /\b(createdBy|bookings|attendees|tickets)\b/i);
        assert.deepEqual(res.body(), [{ _id: 'assigned-1' }]);
    } finally {
        EventStaffAssignment.find = previousAssignments;
        Event.find = previousEvents;
    }
});
