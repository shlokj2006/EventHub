const { randomUUID } = require('node:crypto');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const { issueTicketsForBooking } = require('./ticketIssuance');
const { renderTicketPdf } = require('./ticketPdf');
const { sendBookingConfirmationEmail } = require('../utils/email');

const MAX_DELIVERY_ATTEMPTS = 5;
const DELIVERY_LEASE_MS = 20 * 60 * 1000;
const UNVERIFIED_RETRY_MS = 24 * 60 * 60 * 1000;
const MAX_RETRY_DELAY_MS = 6 * 60 * 60 * 1000;
const RETRY_BATCH_SIZE = 50;

const idOf = (value) => value?._id || value;
const delayForAttempt = (attempt) => Math.min(5 * 60 * 1000 * (2 ** Math.max(0, attempt - 1)), MAX_RETRY_DELAY_MS);
const safeErrorCode = (error) => typeof error?.code === 'string' && /^[A-Z0-9_-]{1,40}$/i.test(error.code)
    ? error.code
    : 'delivery_failed';

const confirmBookingEmail = async (bookingId, { forceRetry = false } = {}) => {
    let attemptId;
    try {
        const booking = await Booking.findById(bookingId).populate('userId').populate('eventId');
        if (!booking || booking.status !== 'confirmed') return { status: 'ineligible' };

        const userId = idOf(booking.userId);
        const account = await User.findById(userId).select('name email isVerified').lean();

        const quantity = Number.isSafeInteger(booking.quantity) && booking.quantity > 0 ? booking.quantity : 1;
        await issueTicketsForBooking(booking, account || booking.userId);
        const tickets = await Ticket.find({ bookingId: booking._id, status: 'active' })
            .sort({ attendeeIndex: 1 }).lean();
        if (tickets.length !== quantity || tickets.some((ticket, index) => ticket.attendeeIndex !== index)) {
            return { status: 'tickets_incomplete' };
        }

        const now = new Date();
        attemptId = randomUUID();
        const readyStates = [
            { 'confirmationEmail.status': { $in: ['pending', 'failed', 'skipped'] } },
            { 'confirmationEmail.status': { $exists: false } },
            { 'confirmationEmail.status': 'sending', 'confirmationEmail.leaseExpiresAt': { $lte: now } },
        ];
        const readyTime = forceRetry
            ? [
                { 'confirmationEmail.status': { $in: ['pending', 'failed', 'skipped'] } },
                { 'confirmationEmail.status': { $exists: false } },
                { 'confirmationEmail.status': 'sending', 'confirmationEmail.leaseExpiresAt': { $lte: now } },
            ]
            : [
                { 'confirmationEmail.nextAttemptAt': { $lte: now } },
                { 'confirmationEmail.nextAttemptAt': null },
                { 'confirmationEmail.nextAttemptAt': { $exists: false } },
            ];
        const filter = {
            _id: booking._id,
            status: 'confirmed',
            $and: [
                { $or: readyStates },
                { $or: readyTime },
                ...(forceRetry ? [] : [{
                    $or: [
                        { 'confirmationEmail.attempts': { $lt: MAX_DELIVERY_ATTEMPTS } },
                        { 'confirmationEmail.attempts': { $exists: false } },
                    ],
                }]),
            ],
        };
        const claimed = await Booking.findOneAndUpdate(
            filter,
            {
                $set: {
                    'confirmationEmail.status': 'sending',
                    'confirmationEmail.attemptId': attemptId,
                    'confirmationEmail.leaseExpiresAt': new Date(now.getTime() + DELIVERY_LEASE_MS),
                    'confirmationEmail.lastAttemptAt': now,
                    'confirmationEmail.lastError': null,
                },
                $unset: { 'confirmationEmail.nextAttemptAt': 1, 'confirmationEmail.sentAt': 1 },
                $inc: { 'confirmationEmail.attempts': 1 },
            },
            { new: true },
        );
        if (!claimed) return { status: 'already_sent_or_in_progress' };

        if (!account?.isVerified || typeof account.email !== 'string' || !account.email.trim()) {
            await Booking.updateOne(
                { _id: booking._id, status: 'confirmed', 'confirmationEmail.status': 'sending', 'confirmationEmail.attemptId': attemptId },
                {
                    $set: {
                        'confirmationEmail.status': 'skipped',
                        'confirmationEmail.nextAttemptAt': new Date(Date.now() + UNVERIFIED_RETRY_MS),
                        'confirmationEmail.lastError': 'verified_recipient_required',
                    },
                    $inc: { 'confirmationEmail.attempts': -1 },
                    $unset: { 'confirmationEmail.attemptId': 1, 'confirmationEmail.leaseExpiresAt': 1 },
                },
            );
            return { status: 'skipped' };
        }

        const eventId = idOf(booking.eventId);
        const eventLocation = booking.eventId?.location
            || (await Event.findById(eventId).select('location').lean())?.location;
        const attachments = await Promise.all(tickets.map(async (ticket, index) => ({
            filename: `eventhub-ticket-${index + 1}.pdf`,
            content: await renderTicketPdf(ticket, eventLocation),
            contentType: 'application/pdf',
        })));
        const attendeeCount = tickets.length;
        const title = booking.eventTitle || booking.eventId?.title || tickets[0]?.eventTitle || 'Event';
        const eventDate = booking.eventDate || booking.eventId?.date || tickets[0]?.eventDate;

        // Recheck after PDF generation, immediately before contacting SMTP.
        const stillConfirmed = await Booking.exists({
            _id: booking._id,
            status: 'confirmed',
            'confirmationEmail.status': 'sending',
            'confirmationEmail.attemptId': attemptId,
        });
        if (!stillConfirmed) return { status: 'ineligible' };

        await sendBookingConfirmationEmail({
            to: account.email,
            userName: account.name,
            eventTitle: title,
            eventDate,
            bookingReference: booking.bookingReference,
            attendeeCount,
            amount: booking.amount,
            currency: booking.currency || 'INR',
            paymentStatus: booking.paymentStatus,
            attachments,
        });

        const sentAt = new Date();
        const saved = await Booking.updateOne(
            { _id: booking._id, status: 'confirmed', 'confirmationEmail.status': 'sending', 'confirmationEmail.attemptId': attemptId },
            {
                $set: { 'confirmationEmail.status': 'sent', 'confirmationEmail.sentAt': sentAt },
                $unset: { 'confirmationEmail.attemptId': 1, 'confirmationEmail.leaseExpiresAt': 1, 'confirmationEmail.nextAttemptAt': 1, 'confirmationEmail.lastError': 1 },
            },
        );
        if (!saved.matchedCount) return { status: 'delivery_result_uncertain' };
        return { status: 'sent', sentAt };
    } catch (error) {
        if (attemptId) {
            try {
                const current = await Booking.findOne({
                    _id: bookingId,
                    'confirmationEmail.status': 'sending',
                    'confirmationEmail.attemptId': attemptId,
                }).select('confirmationEmail.attempts').lean();
                if (current) {
                    const attempts = current.confirmationEmail?.attempts || 1;
                    const nextAttemptAt = attempts < MAX_DELIVERY_ATTEMPTS
                        ? new Date(Date.now() + delayForAttempt(attempts))
                        : null;
                    await Booking.updateOne(
                        { _id: bookingId, status: 'confirmed', 'confirmationEmail.status': 'sending', 'confirmationEmail.attemptId': attemptId },
                        {
                            $set: {
                                'confirmationEmail.status': 'failed',
                                'confirmationEmail.lastError': safeErrorCode(error),
                                ...(nextAttemptAt ? { 'confirmationEmail.nextAttemptAt': nextAttemptAt } : {}),
                            },
                            $unset: {
                                'confirmationEmail.attemptId': 1,
                                'confirmationEmail.leaseExpiresAt': 1,
                                ...(!nextAttemptAt ? { 'confirmationEmail.nextAttemptAt': 1 } : {}),
                            },
                        },
                    );
                }
            } catch {
                // A stale sending lease is retried by maintenance; SMTP acceptance may be ambiguous.
            }
        }
        return { status: 'failed', errorCode: safeErrorCode(error) };
    }
};

const retryBookingConfirmationEmails = async () => {
    const now = new Date();
    const candidates = await Booking.find({
        status: 'confirmed',
        $and: [
            { $or: [
                { 'confirmationEmail.status': { $in: ['pending', 'failed', 'skipped'] } },
                { 'confirmationEmail.status': 'sending', 'confirmationEmail.leaseExpiresAt': { $lte: now } },
            ] },
            { $or: [
                { 'confirmationEmail.status': 'sending' },
                { 'confirmationEmail.nextAttemptAt': { $lte: now } },
                { 'confirmationEmail.nextAttemptAt': null },
                { 'confirmationEmail.nextAttemptAt': { $exists: false } },
            ] },
            { $or: [
                { 'confirmationEmail.attempts': { $lt: MAX_DELIVERY_ATTEMPTS } },
                { 'confirmationEmail.attempts': { $exists: false } },
            ] },
        ],
    }).select('_id').sort({ 'confirmationEmail.nextAttemptAt': 1, updatedAt: 1 }).limit(RETRY_BATCH_SIZE).lean();

    const result = { examined: candidates.length, sent: 0, failed: 0, skipped: 0 };
    for (const candidate of candidates) {
        const delivery = await confirmBookingEmail(candidate._id);
        if (delivery.status === 'sent') result.sent += 1;
        if (delivery.status === 'failed') result.failed += 1;
        if (delivery.status === 'skipped') result.skipped += 1;
    }
    return result;
};

module.exports = { confirmBookingEmail, retryBookingConfirmationEmails };
