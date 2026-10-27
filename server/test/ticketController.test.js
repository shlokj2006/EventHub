const test = require('node:test');
const assert = require('node:assert/strict');
const Ticket = require('../models/Ticket');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const eventStaffPermissions = require('../services/eventStaffPermissions');

const state = {
    ticket: null,
    booking: null,
    assigned: true,
    bookingReads: 0,
    updates: 0,
    updateFilters: [],
    accessChecks: 0,
};

const fakeQuery = (getValue) => ({
    select() { return this; },
    lean: async () => getValue(),
});

const originals = {
    ticketFindById: Ticket.findById,
    ticketFindOne: Ticket.findOne,
    ticketFindOneAndUpdate: Ticket.findOneAndUpdate,
    ticketUpdateOne: Ticket.updateOne,
    bookingFindById: Booking.findById,
    eventFindById: Event.findById,
};

Ticket.findById = () => fakeQuery(() => state.ticket && { ...state.ticket });
Ticket.findOne = () => fakeQuery(() => state.ticket && { ...state.ticket });
Ticket.findOneAndUpdate = (filter, update) => ({
    select() {
        state.updates += 1;
        state.updateFilters.push(filter);
        const hasMongoNullSemantics = filter.checkedInAt === null;
        const isExactTicket = String(filter._id) === String(state.ticket?._id);
        if (!state.ticket
            || !isExactTicket
            || filter.status !== 'active'
            || !hasMongoNullSemantics
            || state.ticket.status !== filter.status
            || (state.ticket.checkedInAt !== null && state.ticket.checkedInAt !== undefined)) {
            return Promise.resolve(null);
        }
        Object.assign(state.ticket, update.$set);
        return Promise.resolve({ ...state.ticket, attendee: { name: state.ticket.attendee.name } });
    },
});
Ticket.updateOne = async (_filter, update) => {
    state.ticket.checkedInAt = update.$set.checkedInAt;
    state.ticket.checkedInBy = update.$set.checkedInBy;
};
Booking.findById = () => ({
    select() {
        state.bookingReads += 1;
        return fakeQuery(() => state.booking && { ...state.booking });
    },
});
Event.findById = () => ({
    select() { return fakeQuery(() => ({ location: 'Main Hall' })); },
});

const originalCanStaffAccessEvent = eventStaffPermissions.canStaffAccessEvent;
eventStaffPermissions.canStaffAccessEvent = async () => { state.accessChecks += 1; return state.assigned; };
const controller = require('../controllers/ticketController');
eventStaffPermissions.canStaffAccessEvent = originalCanStaffAccessEvent;
const router = require('../routes/tickets');

const createResponse = () => {
    const response = {
        statusCode: 200,
        body: null,
        headers: {},
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
        set(headers) { Object.assign(this.headers, headers); return this; },
        send(body) { this.body = body; return this; },
    };
    return response;
};

const reference = `EH-TKT-${'A'.repeat(32)}`;
const ticket = (overrides = {}) => ({
    _id: '64b000000000000000000001',
    ticketReference: reference,
    bookingId: '64b000000000000000000002',
    eventId: '64b000000000000000000003',
    userId: '64b000000000000000000004',
    attendeeIndex: 0,
    attendee: { name: 'Sample Guest', email: 'private@example.com' },
    eventTitle: 'Sample Event',
    eventDate: new Date('2030-01-01T10:00:00Z'),
    status: 'active',
    checkedInAt: null,
    checkedInBy: null,
    ...overrides,
});

const booking = (overrides = {}) => ({ status: 'confirmed', cancellationReason: undefined, ...overrides });

const setup = (ticketOverrides = {}, bookingOverrides = {}) => {
    state.ticket = ticket(ticketOverrides);
    state.booking = booking(bookingOverrides);
    state.assigned = true;
    state.bookingReads = 0;
    state.updates = 0;
    state.updateFilters = [];
    state.accessChecks = 0;
};

const invokeCheckIn = (user, ticketReference = reference) => {
    const res = createResponse();
    return controller.checkInTicket({ user, body: { ticketReference } }, res).then(() => res);
};

test('ticket PDF requires ownership or explicit admin role and is streamed as a private PDF', async () => {
    setup();
    const denied = createResponse();
    await controller.downloadTicketPdf({
        params: { ticketId: state.ticket._id },
        user: { _id: '64b000000000000000000099', role: 'user' },
    }, denied);
    assert.equal(denied.statusCode, 403, JSON.stringify(denied.body));

    const owner = createResponse();
    await controller.downloadTicketPdf({
        params: { ticketId: state.ticket._id },
        user: { _id: state.ticket.userId, role: 'user' },
    }, owner);
    assert.equal(owner.headers['Content-Type'], 'application/pdf');
    assert.equal(owner.headers['Cache-Control'], 'private, no-store');
    assert.ok(Buffer.isBuffer(owner.body));
    assert.equal(owner.body.subarray(0, 4).toString(), '%PDF');

    const admin = createResponse();
    await controller.downloadTicketPdf({
        params: { ticketId: state.ticket._id },
        user: { _id: '64b000000000000000000099', role: 'admin' },
    }, admin);
    assert.equal(admin.statusCode, 200);
});

test('check-in rejects malformed and unknown references without updating tickets', async () => {
    setup();
    const unauthorized = await invokeCheckIn({ _id: '64b000000000000000000010', role: 'user' });
    assert.equal(unauthorized.statusCode, 403);

    const malformed = await invokeCheckIn({ _id: 'staff-1', role: 'admin' }, 'not-a-ticket');
    assert.equal(malformed.statusCode, 400);
    assert.equal(state.updates, 0);

    Ticket.findOne = () => fakeQuery(() => null);
    const unknown = await invokeCheckIn({ _id: 'staff-1', role: 'admin' });
    assert.equal(unknown.statusCode, 404);
    Ticket.findOne = () => fakeQuery(() => state.ticket && { ...state.ticket });
});

test('only assigned staff may check in; admins may check in without an assignment', async () => {
    setup();
    state.assigned = false;
    const denied = await invokeCheckIn({ _id: 'staff-1', role: 'event_staff' });
    assert.equal(denied.statusCode, 403);
    assert.equal(state.updates, 0);
    assert.equal(state.accessChecks, 1);

    const adminResult = await invokeCheckIn({ _id: 'admin-1', role: 'admin' });
    assert.equal(adminResult.statusCode, 200);
    assert.equal(state.accessChecks, 1);
});

test('void, checked-in, pending, cancelled, and expired tickets are rejected', async () => {
    setup({ status: 'void' });
    assert.equal((await invokeCheckIn({ _id: 'admin-1', role: 'admin' })).body.code, 'ticket_void');
    assert.equal(state.updates, 0);

    setup({ checkedInAt: new Date() });
    assert.equal((await invokeCheckIn({ _id: 'admin-1', role: 'admin' })).body.code, 'already_checked_in');
    assert.equal(state.updates, 0);

    setup({}, { status: 'pending' });
    assert.equal((await invokeCheckIn({ _id: 'admin-1', role: 'admin' })).body.code, 'booking_ineligible');
    assert.equal(state.updates, 0);

    setup({}, { status: 'pending', reservationExpiresAt: new Date(Date.now() - 1000) });
    assert.equal((await invokeCheckIn({ _id: 'admin-1', role: 'admin' })).body.code, 'booking_expired');
    assert.equal(state.updates, 0);

    setup({}, { status: 'cancelled', cancellationReason: 'cancelled' });
    assert.equal((await invokeCheckIn({ _id: 'admin-1', role: 'admin' })).body.code, 'booking_cancelled');

    setup({}, { status: 'cancelled', cancellationReason: 'expired' });
    assert.equal((await invokeCheckIn({ _id: 'admin-1', role: 'admin' })).body.code, 'booking_expired');
});

test('successful check-in records the authenticated actor and server timestamp only once', async () => {
    setup();
    const response = await invokeCheckIn({ _id: 'staff-1', role: 'event_staff' });
    assert.equal(response.statusCode, 200, JSON.stringify(response.body));
    assert.equal(response.body.code, 'checked_in');
    assert.equal(response.body.ticket.attendeeName, 'Sample Guest');
    assert.equal(response.body.ticket.eventTitle, 'Sample Event');
    assert.ok(state.ticket.checkedInAt instanceof Date);
    assert.equal(state.ticket.checkedInBy, 'staff-1');
    assert.equal(Object.hasOwn(response.body.ticket, 'attendeeEmail'), false);
    assert.deepEqual(state.updateFilters[0], {
        _id: state.ticket._id,
        status: 'active',
        checkedInAt: null,
    });

    const repeated = await invokeCheckIn({ _id: 'admin-1', role: 'admin' });
    assert.equal(repeated.statusCode, 409);
    assert.equal(repeated.body.code, 'already_checked_in');
    assert.equal(state.updates, 1);
});

test('concurrent check-in requests allow exactly one ticket update to win', async () => {
    setup();
    const results = await Promise.all([
        invokeCheckIn({ _id: 'admin-1', role: 'admin' }),
        invokeCheckIn({ _id: 'admin-2', role: 'admin' }),
    ]);
    assert.equal(results.filter((result) => result.statusCode === 200).length, 1);
    assert.equal(results.filter((result) => result.body.code === 'already_checked_in').length, 1);
    assert.ok(state.ticket.checkedInAt instanceof Date);
    assert.ok(['admin-1', 'admin-2'].includes(state.ticket.checkedInBy));
    assert.equal(state.updateFilters.length, 2);
    for (const filter of state.updateFilters) {
        assert.deepEqual(filter, {
            _id: state.ticket._id,
            status: 'active',
            checkedInAt: null,
        });
    }
});

test('a booking cancellation racing check-in rolls back that request check-in metadata', async () => {
    setup();
    const originalBookingFindById = Booking.findById;
    let reads = 0;
    Booking.findById = () => ({
        select() {
            return fakeQuery(() => {
                reads += 1;
                if (reads === 2) state.booking = { status: 'cancelled', cancellationReason: 'cancelled' };
                return { ...state.booking };
            });
        },
    });
    try {
        const result = await invokeCheckIn({ _id: '64b000000000000000000011', role: 'admin' });
        assert.equal(result.statusCode, 409);
        assert.equal(result.body.code, 'booking_cancelled');
        assert.equal(state.ticket.checkedInAt, null);
        assert.equal(state.ticket.checkedInBy, null);
    } finally {
        Booking.findById = originalBookingFindById;
    }
});

test('ticket routes authenticate both PDF downloads and check-in requests', () => {
    for (const path of ['/:ticketId.pdf', '/check-in']) {
        const route = router.stack.find((layer) => layer.route?.path === path);
        assert.ok(route);
        assert.equal(route.route.stack[0].handle.name, 'protect');
    }
});

test.after(() => {
    Ticket.findById = originals.ticketFindById;
    Ticket.findOne = originals.ticketFindOne;
    Ticket.findOneAndUpdate = originals.ticketFindOneAndUpdate;
    Ticket.updateOne = originals.ticketUpdateOne;
    Booking.findById = originals.bookingFindById;
    Event.findById = originals.eventFindById;
});
