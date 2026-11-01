const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

const state = {
  bookings: [],
  event: null,
  issued: [],
  otp: null,
  failBookingCreate: false,
};
const fakeBooking = {
  find: () => ({ select: async () => [] }),
  create: async (values) => {
    if (state.failBookingCreate) {
      if (state.failBookingCreate instanceof Error)
        throw state.failBookingCreate;
      throw Object.assign(new Error("invalid booking"), {
        name: "ValidationError",
      });
    }
    const record = { _id: `booking-${state.bookings.length + 1}`, ...values };
    state.bookings.push(record);
    return record;
  },
  findOneAndUpdate: async (filter, update) => {
    const booking = state.bookings.find((item) => item._id === filter._id);
    if (
      !booking ||
      booking.status !== filter.status ||
      booking.capacityState !== filter.capacityState
    )
      return null;
    Object.assign(booking, update.$set);
    return booking;
  },
  updateOne: async () => ({ acknowledged: true }),
};
const fakeEvent = { findById: async () => state.event };
const fakeOtp = {
  exists: async (filter) => {
    if (!state.otp) return null;

    if (
      state.otp.email !== filter.email ||
      state.otp.action !== filter.action ||
      state.otp.createdAt <= filter.createdAt.$gt
    ) {
      return null;
    }

    return { _id: state.otp._id };
  },
  findOne: async (filter) => {
    if (
      !state.otp ||
      state.otp.email !== filter.email ||
      state.otp.otp !== filter.otp ||
      state.otp.action !== filter.action ||
      state.otp.createdAt <= filter.createdAt.$gt
    )
      return null;
    return state.otp;
  },
  findOneAndDelete: async (filter) => {
    if (
      !state.otp ||
      (filter._id && state.otp._id !== filter._id) ||
      state.otp.email !== filter.email ||
      state.otp.otp !== filter.otp ||
      state.otp.action !== filter.action ||
      state.otp.createdAt <= filter.createdAt.$gt
    )
      return null;
    const consumed = state.otp;
    state.otp = null;
    return consumed;
  },
  create: async (entry) => {
    state.otp = { _id: "otp-restored", ...entry };
    return state.otp;
  },
};
const fakeReservations = {
  createCapacityClaim: async ({ bookingId, userId, quantity }) => {
    if (state.event.availableSeats < quantity) return null;
    state.event.availableSeats -= quantity;
    return { created: true, claim: { bookingId, userId, quantity } };
  },
  expireBooking: async () => {},
  expireAndReconcileReservations: async () => ({}),
};
const fakeTicketIssuance = {
  issueTicketsForBooking: async (booking) => {
    const tickets = booking.attendees.map((attendee, attendeeIndex) => ({
      _id: `${booking._id}-ticket-${attendeeIndex}`,
      bookingId: booking._id,
      attendee,
    }));
    state.issued.push(...tickets);
    return tickets;
  },
  invalidateTicketsForBooking: async () => {},
};
const originalLoad = Module._load;
Module._load = function loadRepeatBookingMocks(request, parent, isMain) {
  if (request === "../models/Booking") return fakeBooking;
  if (request === "../models/Event") return fakeEvent;
  if (request === "../models/Ticket") return {};
  if (request === "../models/OTP") return fakeOtp;
  if (request === "../utils/email")
    return {
      sendOTPEmail: async () => {},
      safeEmailErrorCode: () => "EMAIL_DELIVERY_FAILED",
    };
  if (request === "../services/bookingReservations") return fakeReservations;
  if (request === "../services/ticketIssuance") return fakeTicketIssuance;
  if (request === "../services/bookingConfirmationEmail")
    return {
      confirmBookingEmail: async () => ({ status: "sent" }),
      retryBookingConfirmationEmails: async () => ({
        examined: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
      }),
    };
  return originalLoad.call(this, request, parent, isMain);
};
const { bookEvent } = require("../controllers/bookingController");
Module._load = originalLoad;

const invoke = async (req) => {
  let statusCode = 200;
  let body;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(value) {
      body = value;
      return this;
    },
  };
  await bookEvent(req, res);
  return { statusCode, body };
};

test("the same user can create separate event bookings with different attendees and one ticket per attendee", async () => {
  state.bookings = [];
  state.issued = [];
  state.failBookingCreate = false;
  state.event = {
    _id: "507f1f77bcf86cd799439011",
    title: "Community Event",
    date: new Date(),
    ticketPrice: 0,
    currency: "INR",
    availableSeats: 2,
  };
  const user = {
    _id: "user-1",
    id: "user-1",
    name: "Booking Owner",
    email: "owner@example.com",
  };
  for (const name of ["Friend One", "Family Member Two"]) {
    state.otp = {
      _id: `otp-${name}`,
      email: "owner@example.com",
      otp: "123456",
      action: "event_booking",
      createdAt: new Date(),
    };
    const result = await invoke({
      user,
      body: {
        eventId: state.event._id,
        otp: "123456",
        quantity: 1,
        attendees: [{ name }],
      },
    });
    assert.equal(result.statusCode, 201);
    assert.equal(result.body.booking.status, "confirmed");
  }

  assert.equal(state.bookings.length, 2);
  assert.notEqual(state.bookings[0]._id, state.bookings[1]._id);
  assert.deepEqual(
    state.bookings.map((booking) => booking.attendees[0].name),
    ["Friend One", "Family Member Two"],
  );
  assert.deepEqual(
    state.issued.map((ticket) => [ticket.bookingId, ticket.attendee.name]),
    [
      ["booking-1", "Friend One"],
      ["booking-2", "Family Member Two"],
    ],
  );
  assert.equal(state.event.availableSeats, 0);
});

test("booking OTP remains available when input or capacity validation fails before booking creation", async () => {
  state.bookings = [];
  state.issued = [];
  state.event = {
    _id: "507f1f77bcf86cd799439011",
    title: "Community Event",
    date: new Date(),
    ticketPrice: 0,
    currency: "INR",
    availableSeats: 0,
  };
  state.otp = {
    _id: "otp-valid",
    email: "owner@example.com",
    otp: "123456",
    action: "event_booking",
    createdAt: new Date(),
  };
  const response = await invoke({
    user: {
      _id: "user-1",
      id: "user-1",
      name: "Owner",
      email: "owner@example.com",
    },
    body: {
      eventId: state.event._id,
      otp: "123456",
      quantity: 1,
      attendees: [{ name: "Friend" }],
    },
  });
  assert.equal(response.statusCode, 400);
  assert.equal(state.bookings.length, 0);
  assert.equal(state.otp?._id, "otp-valid");
});

test("expired booking OTPs cannot create bookings even if the TTL monitor has not removed them yet", async () => {
  state.bookings = [];
  state.issued = [];
  state.event = {
    _id: "507f1f77bcf86cd799439011",
    title: "Community Event",
    date: new Date(),
    ticketPrice: 0,
    currency: "INR",
    availableSeats: 1,
  };
  state.otp = {
    _id: "otp-expired",
    email: "owner@example.com",
    otp: "123456",
    action: "event_booking",
    createdAt: new Date(Date.now() - 5 * 60 * 1000 - 1),
  };
  const response = await invoke({
    user: {
      _id: "user-1",
      id: "user-1",
      name: "Owner",
      email: "owner@example.com",
    },
    body: {
      eventId: state.event._id,
      otp: "123456",
      quantity: 1,
      attendees: [{ name: "Friend" }],
    },
  });
  assert.equal(response.statusCode, 400);
  assert.equal(state.bookings.length, 0);
  assert.equal(state.event.availableSeats, 1);
});

test("known booking validation failure restores the still-live OTP for a retry", async () => {
  state.bookings = [];
  state.issued = [];
  state.event = {
    _id: "507f1f77bcf86cd799439011",
    title: "Community Event",
    date: new Date(),
    ticketPrice: 0,
    currency: "INR",
    availableSeats: 1,
  };
  state.otp = {
    _id: "otp-valid",
    email: "owner@example.com",
    otp: "123456",
    action: "event_booking",
    createdAt: new Date(),
  };
  state.failBookingCreate = true;
  const req = {
    user: {
      _id: "user-1",
      id: "user-1",
      name: "Owner",
      email: "owner@example.com",
    },
    body: {
      eventId: state.event._id,
      otp: "123456",
      quantity: 1,
      attendees: [{ name: "Friend" }],
    },
  };
  const failed = await invoke(req);
  assert.equal(failed.statusCode, 400);
  assert.equal(state.otp?.otp, "123456");
  state.failBookingCreate = false;
  const retried = await invoke(req);
  assert.equal(retried.statusCode, 201);
  assert.equal(state.otp, null);
});

test("ambiguous booking creation failure gives a safe history and new-code recovery path", async () => {
  state.bookings = [];
  state.issued = [];
  state.event = {
    _id: "507f1f77bcf86cd799439011",
    title: "Community Event",
    date: new Date(),
    ticketPrice: 0,
    currency: "INR",
    availableSeats: 1,
  };
  state.otp = {
    _id: "otp-valid",
    email: "owner@example.com",
    otp: "123456",
    action: "event_booking",
    createdAt: new Date(),
  };
  state.failBookingCreate = Object.assign(new Error("ambiguous write result"), {
    name: "MongoNetworkError",
  });
  const response = await invoke({
    user: {
      _id: "user-1",
      id: "user-1",
      name: "Owner",
      email: "owner@example.com",
    },
    body: {
      eventId: state.event._id,
      otp: "123456",
      quantity: 1,
      attendees: [{ name: "Friend" }],
    },
  });
  assert.equal(response.statusCode, 503);
  assert.match(response.body.message, /Check booking history/);
  assert.equal(state.otp, null);
  state.failBookingCreate = false;
});

test("concurrent booking requests cannot both consume one OTP", async () => {
  state.bookings = [];
  state.issued = [];
  state.event = {
    _id: "507f1f77bcf86cd799439011",
    title: "Community Event",
    date: new Date(),
    ticketPrice: 0,
    currency: "INR",
    availableSeats: 2,
  };
  state.otp = {
    _id: "otp-once",
    email: "owner@example.com",
    otp: "123456",
    action: "event_booking",
    createdAt: new Date(),
  };
  const req = {
    user: {
      _id: "user-1",
      id: "user-1",
      name: "Owner",
      email: "owner@example.com",
    },
    body: {
      eventId: state.event._id,
      otp: "123456",
      quantity: 1,
      attendees: [{ name: "Friend" }],
    },
  };
  const results = await Promise.all([invoke(req), invoke(req)]);
  assert.equal(results.filter((result) => result.statusCode === 201).length, 1);
  assert.equal(results.filter((result) => result.statusCode === 400).length, 1);
  assert.equal(state.bookings.length, 1);
  assert.equal(state.issued.length, 1);
  assert.equal(state.otp, null);
});
test("does not restore an older OTP when a newer booking OTP has been issued", async () => {
  state.bookings = [];
  state.issued = [];
  state.event = {
    _id: "507f1f77bcf86cd799439011",
    title: "Community Event",
    date: new Date(),
    ticketPrice: 0,
    currency: "INR",
    availableSeats: 1,
  };

  const oldCreatedAt = new Date(Date.now() - 1000);

  state.otp = {
    _id: "otp-old",
    email: "owner@example.com",
    otp: "123456",
    action: "event_booking",
    createdAt: oldCreatedAt,
  };

  state.failBookingCreate = true;

  const req = {
    user: {
      _id: "user-1",
      id: "user-1",
      name: "Owner",
      email: "owner@example.com",
    },
    body: {
      eventId: state.event._id,
      otp: "123456",
      quantity: 1,
      attendees: [{ name: "Friend" }],
    },
  };

  // Simulate a newer OTP being issued after the old OTP is consumed.
  const failedBookingPromise = invoke(req);

  // Allow the booking request to reach the asynchronous booking creation.
  await new Promise((resolve) => setImmediate(resolve));

  state.otp = {
    _id: "otp-new",
    email: "owner@example.com",
    otp: "654321",
    action: "event_booking",
    createdAt: new Date(),
  };

  const failed = await failedBookingPromise;

  assert.equal(failed.statusCode, 400);
  assert.equal(state.otp?.otp, "654321");
  assert.equal(state.otp?._id, "otp-new");

  state.failBookingCreate = false;
});