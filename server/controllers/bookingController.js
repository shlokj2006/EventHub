const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const OTP = require('../models/OTP');
const { sendOTPEmail, safeEmailErrorCode } = require('../utils/email');
const {
    isValidEventId,
    parseQuantity,
    hasCapacity,
    isValidPrice,
    calculateTotal,
    normalizeAttendees,
    canAccessBooking,
} = require('../utils/bookingValidation');
const {
    createCapacityClaim,
    setClaimState,
    approvePaidBooking,
    transitionBookingCancellation,
    releaseBookingCapacity,
    expireBooking,
    reconcileReservingBooking,
    expireAndReconcileReservations,
} = require('../services/bookingReservations');
const { issueTicketsForBooking, invalidateTicketsForBooking } = require('../services/ticketIssuance');
const {
    confirmBookingEmail,
    retryBookingConfirmationEmails,
} = require('../services/bookingConfirmationEmail');

const RESERVATION_HOURS = 24;

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.sendBookingOTP = async (req, res) => {
    try {
        const otp = generateOTP();
        await OTP.findOneAndDelete({ email: req.user.email, action: 'event_booking' });
        await OTP.create({ email: req.user.email, otp, action: 'event_booking' });
        try {
            await sendOTPEmail(req.user.email, otp, 'event_booking');
        } catch (error) {
            console.error(`Booking verification email failed (${safeEmailErrorCode(error)}).`);
            return res.status(503).json({ message: 'The booking verification code could not be sent. Please request a new code.' });
        }
        res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Unable to send booking OTP' });
    }
};

exports.bookEvent = async (req, res) => {
    try {
        const body = req.body || {};
        const { eventId, otp } = body;
        const quantity = parseQuantity(body.quantity);

        if (!isValidEventId(eventId)) {
            return res.status(400).json({ message: 'A valid event ID is required' });
        }
        if (quantity === null) {
            return res.status(400).json({ message: 'Quantity must be a positive whole number' });
        }
        if (typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
            return res.status(400).json({ message: 'A valid booking OTP is required' });
        }

        const attendees = normalizeAttendees(body.attendees, quantity, req.user);
        if (!attendees) {
            return res.status(400).json({ message: 'Provide a name and valid email, when supplied, for every attendee' });
        }

        // Verify OTP explicitly before proceeding
        const validOTP = await OTP.findOne({ email: req.user.email, otp, action: 'event_booking' });
        if (!validOTP) {
            return res.status(400).json({ message: 'Invalid or expired OTP for booking' });
        }

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (!hasCapacity(event.availableSeats, quantity)) {
            return res.status(400).json({ message: 'Not enough seats available' });
        }
        if (!isValidPrice(event.ticketPrice)) {
            return res.status(400).json({ message: 'Event price is not configured correctly' });
        }

        let existingBooking = await Booking.findOne({ userId: req.user.id, eventId, status: { $ne: 'cancelled' } });
        const requestTime = new Date();
        if (
            existingBooking?.status === 'pending' &&
            existingBooking.reservationExpiresAt &&
            existingBooking.reservationExpiresAt <= requestTime
        ) {
            await expireBooking(existingBooking._id, requestTime);
            existingBooking = await Booking.findOne({ userId: req.user.id, eventId, status: { $ne: 'cancelled' } });
        }
        if (existingBooking) {
            return res.status(400).json({ message: 'Already booked or pending' });
        }

        const amount = calculateTotal(event.ticketPrice, quantity);
        if (amount === null) {
            return res.status(400).json({ message: 'Booking amount is outside the supported range' });
        }

        const isPaid = event.ticketPrice > 0;
        const now = new Date();
        const reservationExpiresAt = isPaid
            ? new Date(now.getTime() + RESERVATION_HOURS * 60 * 60 * 1000)
            : undefined;
        const booking = await Booking.create({
            userId: req.user.id,
            eventId,
            eventTitle: event.title,
            eventDate: event.date,
            quantity,
            attendees,
            unitPrice: event.ticketPrice,
            currency: event.currency || 'INR',
            status: 'pending',
            capacityState: 'reserving',
            reservationExpiresAt,
            paymentStatus: 'not_paid',
            amount,
        });

        let claim;
        try {
            claim = await createCapacityClaim({
                eventId,
                bookingId: booking._id,
                userId: req.user.id,
                quantity,
                state: isPaid ? 'reserved' : 'consumed',
                expiresAt: reservationExpiresAt,
            });
        } catch (error) {
            // Leave the durable `reserving` record for the scheduled reconciler;
            // the Event claim operation is idempotent if its result was ambiguous.
            return res.status(503).json({ message: 'Booking is being recovered; check your bookings shortly' });
        }

        if (!claim) {
            await Booking.updateOne(
                { _id: booking._id, status: 'pending', capacityState: 'reserving' },
                { $set: { status: 'cancelled', capacityState: 'released', cancellationReason: 'rejected' } },
            );
            return res.status(409).json({ message: 'Capacity is unavailable or an active booking already exists' });
        }

        const finalBooking = await Booking.findOneAndUpdate(
            { _id: booking._id, status: 'pending', capacityState: 'reserving' },
            {
                $set: isPaid
                    ? { capacityState: 'reserved' }
                    : { status: 'confirmed', capacityState: 'consumed' },
            },
            { new: true },
        );
        if (!finalBooking) {
            return res.status(503).json({ message: 'Booking is being recovered; check your bookings shortly' });
        }

        await OTP.deleteOne({ _id: validOTP._id }); // cleanup

        if (!isPaid) {
            await issueTicketsForBooking(finalBooking, req.user);
            await confirmBookingEmail(finalBooking._id);
        }

        res.status(201).json({
            message: isPaid ? 'Booking request submitted for admin approval' : 'Free booking confirmed',
            booking: finalBooking,
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Booking details are invalid' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.confirmBooking = async (req, res) => {
    try {
        const paymentStatus = req.body?.paymentStatus;
        if (!['paid', 'not_paid'].includes(paymentStatus)) {
            return res.status(400).json({ message: 'Choose either paid or not_paid as the admin-recorded payment status' });
        }
        if (!isValidEventId(req.params.id)) {
            return res.status(400).json({ message: 'Invalid booking ID' });
        }

        let booking = await Booking.findById(req.params.id).populate('userId').populate('eventId');
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        if (booking.status === 'confirmed') {
            if (booking.paymentStatus !== paymentStatus) {
                return res.status(409).json({ message: 'Booking is confirmed with a different payment status' });
            }
            const tickets = await issueTicketsForBooking(booking);
            await confirmBookingEmail(booking._id, { forceRetry: true });
            return res.json({ message: 'Booking is already confirmed', booking, tickets });
        }
        const now = new Date();
        if (booking.status !== 'pending') {
            return res.status(409).json({ message: 'Booking is no longer pending' });
        }
        if (!booking.eventId || Number(booking.eventId.ticketPrice) <= 0) {
            return res.status(409).json({ message: 'Only paid-event bookings can be approved here' });
        }

        if (booking.capacityState === 'reserving') {
            await reconcileReservingBooking(booking);
            booking = await Booking.findById(req.params.id).populate('userId').populate('eventId');
        }

        if (booking.reservationExpiresAt && booking.reservationExpiresAt <= now) {
            await expireBooking(booking._id, now);
            return res.status(410).json({ message: 'Booking reservation has expired' });
        }

        let confirmedBooking;
        if (booking.capacityState === 'reserved') {
            confirmedBooking = await approvePaidBooking(booking._id, now, paymentStatus);
        } else if (booking.capacityState === 'none') {
            // Legacy pending records had no reservation. Preserve their old
            // approval path by claiming capacity atomically at approval time.
            const quantity = Number.isSafeInteger(booking.quantity) && booking.quantity > 0 ? booking.quantity : 1;
            const claim = await createCapacityClaim({
                eventId: booking.eventId._id,
                bookingId: booking._id,
                userId: booking.userId._id,
                quantity,
                state: 'consumed',
            });
            if (!claim) {
                return res.status(409).json({ message: 'Not enough seats are available to approve this booking' });
            }
            confirmedBooking = await Booking.findOneAndUpdate(
                { _id: booking._id, status: 'pending', capacityState: { $in: ['none', null] } },
                { $set: { status: 'confirmed', capacityState: 'consumed', paymentStatus } },
                { new: true },
            );
            if (!confirmedBooking) {
                const releasing = await Booking.findById(booking._id);
                if (releasing?.status === 'cancelled') {
                    await Event.updateOne(
                        { _id: booking.eventId._id, capacityClaims: { $elemMatch: { bookingId: booking._id } } },
                        {
                            $inc: { availableSeats: quantity },
                            $pull: { capacityClaims: { bookingId: booking._id } },
                        },
                    );
                }
                return res.status(409).json({ message: 'Booking is no longer pending' });
            }
        } else {
            return res.status(409).json({ message: 'Booking is not in an approvable state' });
        }

        if (!confirmedBooking) return res.status(409).json({ message: 'Booking is no longer pending or has expired' });
        try {
            await setClaimState({ eventId: booking.eventId._id, bookingId: booking._id, state: 'consumed' });
        } catch {
            // Capacity remains held by the claim; the scheduled reconciler will
            // align its state with this confirmed booking.
        }

        // Use populated event data for legacy bookings that predate event snapshots.
        const ticketBooking = confirmedBooking.toObject ? confirmedBooking.toObject() : { ...confirmedBooking };
        ticketBooking.userId = booking.userId;
        ticketBooking.eventId = booking.eventId;
        ticketBooking.eventTitle = ticketBooking.eventTitle || booking.eventTitle || booking.eventId.title;
        ticketBooking.eventDate = ticketBooking.eventDate || booking.eventDate || booking.eventId.date;
        const tickets = await issueTicketsForBooking(ticketBooking, booking.userId);

        await confirmBookingEmail(confirmedBooking._id);

        res.json({ message: 'Booking confirmed successfully', booking: confirmedBooking, tickets });
    } catch (error) {
        res.status(500).json({ message: 'Unable to confirm booking' });
    }
};

const attachActiveTickets = async (bookings) => {
        const withTickets = await Promise.all(bookings.map(async (booking) => {
            let tickets = [];
            if (booking.status === 'confirmed') {
                await issueTicketsForBooking(booking, booking.userId);
                tickets = await Ticket.find({ bookingId: booking._id, status: 'active' }).sort({ attendeeIndex: 1 });
            } else if (booking.status === 'cancelled') {
                await invalidateTicketsForBooking(booking._id);
            }
            const result = booking.toObject();
            result.tickets = tickets;
            return result;
        }));
        return withTickets;
};

exports.getMyBookings = async (req, res) => {
    try {
        const ownerId = req.user._id;
        const now = new Date();
        const overdue = await Booking.find({
            userId: ownerId,
            status: 'pending',
            capacityState: { $in: ['reserving', 'reserved'] },
            reservationExpiresAt: { $lte: now },
        }).select('_id').limit(100);
        for (const booking of overdue) await expireBooking(booking._id, now);

        const bookings = await Booking.find({ userId: ownerId })
            .populate('eventId')
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });
        res.json(await attachActiveTickets(bookings));
    } catch (error) {
        res.status(500).json({ message: 'Unable to load bookings' });
    }
};

exports.getAllBookings = async (req, res) => {
    try {
        await expireAndReconcileReservations(new Date());
        const bookings = await Booking.find()
            .populate('eventId')
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });
        res.json(await attachActiveTickets(bookings));
    } catch (error) {
        res.status(500).json({ message: 'Unable to load all bookings' });
    }
};

exports.cancelBooking = async (req, res) => {
    try {
        if (!isValidEventId(req.params.id)) {
            return res.status(400).json({ message: 'Invalid booking ID' });
        }
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (!canAccessBooking(req.user, booking)) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        if (booking.status === 'cancelled') return res.status(400).json({ message: 'Already cancelled' });
        if (!['pending', 'confirmed'].includes(booking.status)) {
            return res.status(409).json({ message: 'Booking cannot be cancelled in its current state' });
        }

        const cancelledBooking = await transitionBookingCancellation(booking, { isAdmin: req.user.role === 'admin' });
        if (!cancelledBooking) return res.status(409).json({ message: 'Booking status changed; refresh and try again' });

        await releaseBookingCapacity(cancelledBooking);
        await invalidateTicketsForBooking(cancelledBooking._id);

        res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Unable to cancel booking' });
    }
};

exports.expireReservations = async (req, res) => {
    try {
        const result = await expireAndReconcileReservations(new Date());
        const confirmationEmails = await retryBookingConfirmationEmails();
        res.json({ message: 'Reservation maintenance completed', ...result, confirmationEmails });
    } catch {
        res.status(500).json({ message: 'Reservation maintenance failed' });
    }
};
