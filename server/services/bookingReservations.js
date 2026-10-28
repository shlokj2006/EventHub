const Booking = require('../models/Booking');
const Event = require('../models/Event');
const { invalidateTicketsForBooking } = require('./ticketIssuance');

const createCapacityClaim = async ({ eventId, bookingId, userId, quantity, state, expiresAt }) => {
  const claim = { bookingId, userId, quantity, state };
  if (expiresAt) claim.expiresAt = expiresAt;

  const event = await Event.findOneAndUpdate(
    {
      _id: eventId,
      availableSeats: { $gte: quantity },
      'capacityClaims.bookingId': { $ne: bookingId },
    },
    {
      $inc: { availableSeats: -quantity },
      $push: { capacityClaims: claim },
    },
    { new: true },
  );
  if (event) return { created: true, claim };

  // A retry after an ambiguous database/network result is idempotent.
  const existing = await Event.findOne({
    _id: eventId,
    capacityClaims: { $elemMatch: { bookingId } },
  }).select('_id');
  return existing ? { created: false, claim } : null;
};

const releaseCapacityClaim = async ({ eventId, bookingId, quantity }) => {
  const event = await Event.findOneAndUpdate(
    { _id: eventId, capacityClaims: { $elemMatch: { bookingId } } },
    {
      $inc: { availableSeats: quantity },
      $pull: { capacityClaims: { bookingId } },
    },
    { new: true },
  );
  return Boolean(event);
};

const releaseLegacyCapacity = async ({ eventId, bookingId, quantity }) => {
  const event = await Event.findOneAndUpdate(
    { _id: eventId, legacyCapacityReleaseIds: { $ne: bookingId } },
    {
      $inc: { availableSeats: quantity },
      $addToSet: { legacyCapacityReleaseIds: bookingId },
    },
    { new: true },
  );
  if (event) return true;

  return Boolean(await Event.exists({ _id: eventId, legacyCapacityReleaseIds: bookingId }));
};

const setClaimState = async ({ eventId, bookingId, state }) => {
  await Event.updateOne(
    { _id: eventId, capacityClaims: { $elemMatch: { bookingId } } },
    { $set: { 'capacityClaims.$[claim].state': state } },
    { arrayFilters: [{ 'claim.bookingId': bookingId }] },
  );
};

const approvePaidBooking = (bookingId, now = new Date(), paymentStatus = 'not_paid') => Booking.findOneAndUpdate(
  {
    _id: bookingId,
    status: 'pending',
    capacityState: 'reserved',
    reservationExpiresAt: { $gt: now },
  },
  { $set: { status: 'confirmed', capacityState: 'consumed', paymentStatus } },
  { new: true },
);

const transitionBookingCancellation = (booking, { isAdmin = false } = {}) => {
  if (!booking || !['pending', 'confirmed'].includes(booking.status)) return Promise.resolve(null);

  let capacityState = 'released';
  if (['reserving', 'reserved', 'consumed'].includes(booking.capacityState)) {
    capacityState = 'releasing';
  } else if (booking.status === 'confirmed' && booking.capacityState === 'none') {
    capacityState = 'legacy_releasing';
  }
  const cancellationReason = isAdmin && booking.status === 'pending' ? 'rejected' : 'cancelled';

  return Booking.findOneAndUpdate(
    {
      _id: booking._id,
      status: booking.status,
      capacityState: booking.capacityState === 'none' ? { $in: ['none', null] } : booking.capacityState,
    },
    { $set: { status: 'cancelled', capacityState, cancellationReason } },
    { new: true },
  );
};

const markBookingCapacityReleased = async (bookingId, fromStates) => {
  await Booking.updateOne(
    { _id: bookingId, capacityState: { $in: fromStates } },
    { $set: { capacityState: 'released' } },
  );
};

const releaseBookingCapacity = async (booking) => {
  if (!booking || !['releasing', 'legacy_releasing'].includes(booking.capacityState)) return false;

  const quantity = Number.isSafeInteger(booking.quantity) && booking.quantity > 0 ? booking.quantity : 1;
  if (booking.capacityState === 'legacy_releasing') {
    await releaseLegacyCapacity({ eventId: booking.eventId, bookingId: booking._id, quantity });
    await markBookingCapacityReleased(booking._id, ['legacy_releasing']);
    await Event.updateOne(
      { _id: booking.eventId },
      { $pull: { legacyCapacityReleaseIds: booking._id } },
    );
    return true;
  }

  // The embedded claim is the source of truth for new reservations. Removing
  // it and returning seats occur in the same atomic Event document update.
  await releaseCapacityClaim({ eventId: booking.eventId, bookingId: booking._id, quantity });
  await markBookingCapacityReleased(booking._id, ['releasing']);
  return true;
};

const expireBooking = async (bookingId, now = new Date()) => {
  const expired = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      status: 'pending',
      capacityState: { $in: ['reserving', 'reserved'] },
      reservationExpiresAt: { $lte: now },
    },
    {
      $set: {
        status: 'cancelled',
        capacityState: 'releasing',
        cancellationReason: 'expired',
      },
    },
    { new: true },
  );
  if (expired) await releaseBookingCapacity(expired);
  if (expired) await invalidateTicketsForBooking(expired._id);
  return Boolean(expired);
};

const reconcileReservingBooking = async (booking) => {
  const paid = Boolean(booking.reservationExpiresAt);
  const claimState = paid ? 'reserved' : 'consumed';
  const claim = await createCapacityClaim({
    eventId: booking.eventId,
    bookingId: booking._id,
    userId: booking.userId,
    quantity: Number.isSafeInteger(booking.quantity) && booking.quantity > 0 ? booking.quantity : 1,
    state: claimState,
    expiresAt: booking.reservationExpiresAt,
  });

  if (!claim) {
    const cancelled = await Booking.findOneAndUpdate(
      { _id: booking._id, status: 'pending', capacityState: 'reserving' },
      { $set: { status: 'cancelled', capacityState: 'released', cancellationReason: 'rejected' } },
      { new: true },
    );
    return Boolean(cancelled);
  }

  const changes = paid
    ? { capacityState: 'reserved' }
    : { status: 'confirmed', capacityState: 'consumed' };
  await Booking.updateOne(
    { _id: booking._id, status: 'pending', capacityState: 'reserving' },
    { $set: changes },
  );
  return true;
};

const reconcileCapacityClaims = async (now = new Date()) => {
  const events = await Event.find({ 'capacityClaims.0': { $exists: true } }).limit(100);
  let reconciled = 0;

  for (const event of events) {
    for (const claim of event.capacityClaims) {
      const booking = await Booking.findById(claim.bookingId);
      if (!booking || booking.status === 'cancelled') {
        await releaseCapacityClaim({ eventId: event._id, bookingId: claim.bookingId, quantity: claim.quantity });
        await invalidateTicketsForBooking(claim.bookingId);
        if (booking) await markBookingCapacityReleased(booking._id, ['releasing', 'reserving', 'reserved', 'consumed']);
        reconciled += 1;
        continue;
      }

      if (booking.status === 'confirmed') {
        if (claim.state !== 'consumed') {
          await setClaimState({ eventId: event._id, bookingId: booking._id, state: 'consumed' });
        }
        await Booking.updateOne(
          { _id: booking._id, status: 'confirmed', capacityState: { $ne: 'released' } },
          { $set: { capacityState: 'consumed' } },
        );
        reconciled += 1;
        continue;
      }

      if (booking.status === 'pending' && booking.reservationExpiresAt && booking.reservationExpiresAt <= now) {
        await expireBooking(booking._id, now);
        reconciled += 1;
        continue;
      }

      if (booking.status === 'pending' && claim.state === 'reserved') {
        await Booking.updateOne(
          { _id: booking._id, status: 'pending', capacityState: 'reserving' },
          { $set: { capacityState: 'reserved' } },
        );
      } else if (booking.status === 'pending' && claim.state === 'consumed') {
        await Booking.updateOne(
          { _id: booking._id, status: 'pending' },
          { $set: { status: 'confirmed', capacityState: 'consumed' } },
        );
      }
      reconciled += 1;
    }
  }

  return reconciled;
};

const expireAndReconcileReservations = async (now = new Date()) => {
  const expiredCandidates = await Booking.find({
    status: 'pending',
    capacityState: { $in: ['reserving', 'reserved'] },
    reservationExpiresAt: { $lte: now },
  }).select('_id').limit(100);

  let expired = 0;
  for (const candidate of expiredCandidates) {
    if (await expireBooking(candidate._id, now)) expired += 1;
  }

  const interruptedReleases = await Booking.find({
    capacityState: { $in: ['releasing', 'legacy_releasing'] },
  }).limit(100);
  for (const booking of interruptedReleases) await releaseBookingCapacity(booking);

  const interruptedReservations = await Booking.find({
    status: 'pending',
    capacityState: 'reserving',
    $or: [{ reservationExpiresAt: { $gt: now } }, { reservationExpiresAt: null }],
  }).limit(100);
  for (const booking of interruptedReservations) await reconcileReservingBooking(booking);

  const claimsReconciled = await reconcileCapacityClaims(now);
  return { expired, releasesReconciled: interruptedReleases.length, claimsReconciled };
};

module.exports = {
  createCapacityClaim,
  releaseCapacityClaim,
  releaseLegacyCapacity,
  setClaimState,
  approvePaidBooking,
  transitionBookingCancellation,
  releaseBookingCapacity,
  expireBooking,
  reconcileReservingBooking,
  reconcileCapacityClaims,
  expireAndReconcileReservations,
};
