const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const state = {
  booking: null,
  account: null,
  tickets: [],
  sent: [],
  failSend: false,
  issueCalls: 0,
  cancelAfterClaim: false,
  retryCandidates: [],
  retryQuery: null,
};

const matchesAttempt = (filter) => !filter?.['confirmationEmail.attemptId']
  || state.booking?.confirmationEmail?.attemptId === filter['confirmationEmail.attemptId'];

const setPath = (target, path, value) => {
  const keys = path.split('.');
  let current = target;
  for (const key of keys.slice(0, -1)) current = current[key] ||= {};
  current[keys.at(-1)] = value;
};
const unsetPath = (target, path) => {
  const keys = path.split('.');
  const current = keys.slice(0, -1).reduce((value, key) => value?.[key], target);
  if (current) delete current[keys.at(-1)];
};
const applyUpdate = (target, update) => {
  for (const [path, value] of Object.entries(update.$set || {})) setPath(target, path, value);
  for (const [path, value] of Object.entries(update.$unset || {})) { void value; unsetPath(target, path); }
  for (const [path, value] of Object.entries(update.$inc || {})) {
    const keys = path.split('.');
    let current = target;
    for (const key of keys.slice(0, -1)) current = current[key] ||= {};
    current[keys.at(-1)] = (current[keys.at(-1)] || 0) + value;
  }
};

const fakeBooking = {
  findById: () => ({
    populate() { return this; },
    then(resolve, reject) { return Promise.resolve(state.booking).then(resolve, reject); },
  }),
  findOneAndUpdate: async (filter, update) => {
    const email = state.booking?.confirmationEmail || {};
    const now = Date.now();
    if (!state.booking || state.booking.status !== filter.status || !matchesAttempt(filter)) return null;
    if (email.status === 'sent') return null;
    if (email.status === 'sending' && email.leaseExpiresAt > new Date(now)) return null;
    if (email.status === 'failed' || email.status === 'skipped') {
      if (email.nextAttemptAt && email.nextAttemptAt > new Date(now)) return null;
    }
    if ((email.attempts || 0) >= 5 && filter.$and?.some((part) => part.$or?.some((condition) => condition['confirmationEmail.attempts']))) return null;
    applyUpdate(state.booking, update);
    if (state.cancelAfterClaim && state.booking.confirmationEmail?.status === 'sending') state.booking.status = 'cancelled';
    return structuredClone(state.booking);
  },
  exists: async (filter) => state.booking?.status === filter.status && matchesAttempt(filter),
  updateOne: async (filter, update) => {
    if (!state.booking || state.booking.status !== 'confirmed' || !matchesAttempt(filter)) return { matchedCount: 0 };
    applyUpdate(state.booking, update);
    return { matchedCount: 1 };
  },
  findOne: () => ({
    select() { return this; },
    lean: async () => ({ confirmationEmail: { attempts: state.booking?.confirmationEmail?.attempts || 1 } }),
  }),
  find: (query) => ({
    select() { return this; },
    sort() { return this; },
    limit() { return this; },
    lean: async () => { state.retryQuery = query; return state.retryCandidates; },
  }),
};
const fakeUser = { findById: () => ({ select() { return this; }, lean: async () => state.account }) };
const fakeTicket = { find: () => ({ sort() { return this; }, lean: async () => state.tickets }) };
const fakeEvent = { findById: () => ({ select() { return this; }, lean: async () => ({ location: 'Main Hall' }) }) };
const fakeEmail = {
  sendBookingConfirmationEmail: async (message) => {
    if (state.failSend) throw Object.assign(new Error('SMTP response lost'), { code: 'ETIMEDOUT' });
    state.sent.push(message);
  },
};
const fakeIssue = async () => { state.issueCalls += 1; return state.tickets; };
const fakePdf = async (ticket) => Buffer.from(`PDF:${ticket.ticketReference}`);

const originalLoad = Module._load;
Module._load = function mockBookingConfirmationDependencies(request, parent, isMain) {
  if (request === '../models/Booking') return fakeBooking;
  if (request === '../models/User') return fakeUser;
  if (request === '../models/Ticket') return fakeTicket;
  if (request === '../models/Event') return fakeEvent;
  if (request === './ticketIssuance') return { issueTicketsForBooking: fakeIssue };
  if (request === './ticketPdf') return { renderTicketPdf: fakePdf };
  if (request === '../utils/email') return fakeEmail;
  return originalLoad.call(this, request, parent, isMain);
};
const { confirmBookingEmail, retryBookingConfirmationEmails } = require('../services/bookingConfirmationEmail');
Module._load = originalLoad;

const makeTicket = (attendeeIndex) => ({
  attendeeIndex,
  ticketReference: `EH-TKT-${String(attendeeIndex + 1).padStart(32, '0')}`,
  attendee: { name: `Guest ${attendeeIndex + 1}` },
  eventTitle: 'Snapshot Event',
  status: 'active',
});

const setup = ({ bookingStatus = 'confirmed', cancellationReason, verified = true, email = 'stored@example.com', quantity = 2 } = {}) => {
  state.booking = {
    _id: 'booking-1',
    bookingReference: 'EH-BOOKING-1',
    userId: { _id: 'user-1', name: 'Account Owner' },
    eventId: { _id: 'event-1', title: 'Current Event', location: 'Main Hall', date: new Date('2030-05-01T12:00:00Z') },
    eventTitle: 'Snapshot Event',
    eventDate: new Date('2030-05-01T12:00:00Z'),
    quantity,
    amount: 42,
    currency: 'INR',
    paymentStatus: 'not_paid',
    status: bookingStatus,
    cancellationReason,
    confirmationEmail: { status: 'pending', attempts: 0 },
  };
  state.account = { name: 'Account Owner', email, isVerified: verified };
  state.tickets = Array.from({ length: quantity }, (_, index) => makeTicket(index));
  state.sent = [];
  state.failSend = false;
  state.issueCalls = 0;
  state.cancelAfterClaim = false;
  state.retryCandidates = [];
  state.retryQuery = null;
};

test('confirmed multi-attendee booking emails the stored verified owner with one ticket PDF per attendee', async () => {
  setup();
  const result = await confirmBookingEmail('booking-1');
  assert.equal(result.status, 'sent');
  assert.equal(state.sent.length, 1);
  const [message] = state.sent;
  assert.equal(message.to, 'stored@example.com');
  assert.equal(message.attendeeCount, 2);
  assert.equal(message.eventTitle, 'Snapshot Event');
  assert.equal(message.bookingReference, 'EH-BOOKING-1');
  assert.equal(message.attachments.length, 2);
  assert.deepEqual(message.attachments.map((attachment) => attachment.content.toString()), [
    `PDF:${state.tickets[0].ticketReference}`,
    `PDF:${state.tickets[1].ticketReference}`,
  ]);
  assert.equal(message.attachments.every((attachment) => attachment.contentType === 'application/pdf'), true);
  assert.equal(state.booking.confirmationEmail.status, 'sent');
});

test('missing and unverified stored recipients are skipped without attempting SMTP', async () => {
  for (const account of [
    { name: 'Account Owner', email: 'stored@example.com', isVerified: false },
    { name: 'Account Owner', email: '', isVerified: true },
    null,
  ]) {
    setup();
    state.account = account;
    assert.equal((await confirmBookingEmail('booking-1')).status, 'skipped');
    assert.equal(state.sent.length, 0);
    assert.equal(state.booking.confirmationEmail.status, 'skipped');
    assert.equal(state.booking.confirmationEmail.attempts, 0);
  }
});

test('mail failures leave confirmation intact and a due retry succeeds', async () => {
  setup();
  state.failSend = true;
  const failed = await confirmBookingEmail('booking-1');
  assert.equal(failed.status, 'failed');
  assert.equal(state.booking.status, 'confirmed');
  assert.equal(state.booking.confirmationEmail.status, 'failed');
  assert.equal(state.booking.confirmationEmail.lastError, 'ETIMEDOUT');
  assert.equal(state.sent.length, 0);

  state.failSend = false;
  state.booking.confirmationEmail.nextAttemptAt = new Date(Date.now() - 1);
  const retried = await confirmBookingEmail('booking-1');
  assert.equal(retried.status, 'sent');
  assert.equal(state.booking.confirmationEmail.attempts, 2);
});

test('maintenance retries due confirmed bookings in a bounded selection', async () => {
  setup();
  state.booking.confirmationEmail.status = 'failed';
  state.booking.confirmationEmail.nextAttemptAt = new Date(Date.now() - 1);
  state.retryCandidates = [{ _id: 'booking-1' }];
  const result = await retryBookingConfirmationEmails();
  assert.deepEqual(result, { examined: 1, sent: 1, failed: 0, skipped: 0 });
  assert.equal(state.sent.length, 1);
  assert.equal(state.retryQuery.status, 'confirmed');
  assert.equal(state.retryQuery.$and[0].$or.some((condition) => condition['confirmationEmail.status']?.$exists === false), false);
  assert.equal(state.booking.confirmationEmail.status, 'sent');
});

test('pending or cancelled bookings never trigger ticket issuance emails', async () => {
  for (const [bookingStatus, cancellationReason] of [
    ['pending', undefined],
    ['cancelled', 'cancelled'],
    ['cancelled', 'expired'],
    ['failed', undefined],
  ]) {
    setup({ bookingStatus, cancellationReason });
    assert.equal((await confirmBookingEmail('booking-1')).status, 'ineligible');
    assert.equal(state.issueCalls, 0);
    assert.equal(state.sent.length, 0);
  }
});

test('booking cancelled after an email claim is rechecked before sending', async () => {
  setup();
  state.cancelAfterClaim = true;
  assert.equal((await confirmBookingEmail('booking-1')).status, 'ineligible');
  assert.equal(state.sent.length, 0);
});

test('duplicate and concurrent triggers send at most one email for a successful delivery', async () => {
  setup();
  const results = await Promise.all([
    confirmBookingEmail('booking-1'),
    confirmBookingEmail('booking-1'),
  ]);
  assert.equal(results.filter((result) => result.status === 'sent').length, 1);
  assert.equal(state.sent.length, 1);
  assert.equal((await confirmBookingEmail('booking-1')).status, 'already_sent_or_in_progress');
  assert.equal(state.sent.length, 1);
});

test('confirmation email remains queued until every expected active ticket exists', async () => {
  setup();
  state.tickets.pop();
  assert.equal((await confirmBookingEmail('booking-1')).status, 'tickets_incomplete');
  assert.equal(state.booking.confirmationEmail.status, 'pending');
  assert.equal(state.sent.length, 0);
});