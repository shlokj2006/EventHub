const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const { canStaffAccessEvent } = require('../services/eventStaffPermissions');
const { renderTicketPdf } = require('../services/ticketPdf');

const TICKET_REFERENCE_PATTERN = /^EH-TKT-[A-F0-9]{32}$/;

const getTicketById = (ticketId) => Ticket.findById(ticketId).lean();
const isExpiredBooking = (booking) => booking?.cancellationReason === 'expired'
    || (booking?.status === 'pending' && booking.reservationExpiresAt && new Date(booking.reservationExpiresAt) <= new Date());

exports.downloadTicketPdf = async (req, res) => {
    try {
        const { ticketId } = req.params;
        if (!mongoose.isValidObjectId(ticketId)) return res.status(400).json({ code: 'invalid_ticket_id', message: 'Invalid ticket ID.' });

        const ticket = await getTicketById(ticketId);
        if (!ticket) return res.status(404).json({ code: 'ticket_not_found', message: 'Ticket not found.' });
        const isOwner = String(ticket.userId) === String(req.user._id);
        const isAdmin = req.user.role === 'admin';
        if (!isOwner && !isAdmin) return res.status(403).json({ code: 'ticket_forbidden', message: 'You cannot download this ticket.' });

        const [booking, event] = await Promise.all([
            Booking.findById(ticket.bookingId).select('status cancellationReason').lean(),
            Event.findById(ticket.eventId).select('location').lean(),
        ]);
        if (!booking || booking.status !== 'confirmed' || ticket.status !== 'active') {
            return res.status(409).json({ code: 'ticket_ineligible', message: 'This ticket is no longer eligible for entry.' });
        }

        const pdf = await renderTicketPdf(ticket, event?.location);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="eventhub-ticket-${ticket._id}.pdf"`,
            'Content-Length': String(pdf.length),
            'Cache-Control': 'private, no-store',
        });
        return res.send(pdf);
    } catch {
        return res.status(500).json({ code: 'ticket_pdf_failed', message: 'Unable to generate the ticket PDF.' });
    }
};

exports.checkInTicket = async (req, res) => {
    let pendingCheckIn;
    try {
        if (!['admin', 'event_staff'].includes(req.user?.role)) {
            return res.status(403).json({ code: 'check_in_forbidden', message: 'Only event staff and admins may check in tickets.' });
        }
        const ticketReference = req.body?.ticketReference;
        if (typeof ticketReference !== 'string' || !TICKET_REFERENCE_PATTERN.test(ticketReference)) {
            return res.status(400).json({ code: 'invalid_ticket_reference', message: 'The scanned ticket reference is invalid.' });
        }

        const ticket = await Ticket.findOne({ ticketReference }).lean();
        if (!ticket) return res.status(404).json({ code: 'ticket_not_found', message: 'Ticket not found.' });

        if (req.user.role === 'event_staff' && !await canStaffAccessEvent(req.user._id, ticket.eventId)) {
            return res.status(403).json({ code: 'event_not_assigned', message: 'You are not assigned to this event.' });
        }

        if (ticket.status !== 'active') {
            return res.status(409).json({ code: 'ticket_void', message: 'This ticket has been cancelled or voided.' });
        }
        if (ticket.checkedInAt) {
            return res.status(409).json({ code: 'already_checked_in', message: 'This ticket has already been checked in.' });
        }

        const booking = await Booking.findById(ticket.bookingId).select('status cancellationReason reservationExpiresAt').lean();
        if (!booking) return res.status(409).json({ code: 'booking_ineligible', message: 'The booking for this ticket is unavailable.' });
        if (booking.status !== 'confirmed') {
            if (isExpiredBooking(booking)) {
                return res.status(409).json({ code: 'booking_expired', message: 'The booking reservation expired.' });
            }
            if (booking.status === 'cancelled') {
                return res.status(409).json({ code: 'booking_cancelled', message: 'The booking has been cancelled.' });
            }
            return res.status(409).json({ code: 'booking_ineligible', message: 'The booking is not confirmed.' });
        }

        const checkedInAt = new Date();
        const checkedIn = await Ticket.findOneAndUpdate(
            { _id: ticket._id, status: 'active', checkedInAt: null },
            { $set: { checkedInAt, checkedInBy: req.user._id } },
            { new: true, runValidators: true },
        ).select('_id attendee.name eventTitle attendeeIndex checkedInAt');

        if (!checkedIn) {
            const latestTicket = await Ticket.findById(ticket._id).select('status checkedInAt').lean();
            if (latestTicket?.checkedInAt) {
                return res.status(409).json({ code: 'already_checked_in', message: 'This ticket has already been checked in.' });
            }
            if (latestTicket?.status !== 'active') {
                return res.status(409).json({ code: 'ticket_void', message: 'This ticket has been cancelled or voided.' });
            }
            return res.status(409).json({ code: 'ticket_unavailable', message: 'This ticket could not be checked in. Verify its status and try again.' });
        }
        pendingCheckIn = { ticketId: ticket._id, checkedInAt, actorId: req.user._id };

        // Booking cancellation can race this ticket update. If it won, undo only
        // this request's check-in metadata; the cancellation flow voids the ticket.
        const latestBooking = await Booking.findById(ticket.bookingId).select('status cancellationReason reservationExpiresAt').lean();
        if (!latestBooking || latestBooking.status !== 'confirmed') {
            await Ticket.updateOne(
                { _id: ticket._id, checkedInAt, checkedInBy: req.user._id },
                { $set: { checkedInAt: null, checkedInBy: null } },
            );
            pendingCheckIn = null;
            if (isExpiredBooking(latestBooking)) {
                return res.status(409).json({ code: 'booking_expired', message: 'The booking reservation expired.' });
            }
            if (latestBooking?.status === 'cancelled') {
                return res.status(409).json({ code: 'booking_cancelled', message: 'The booking has been cancelled.' });
            }
            return res.status(409).json({ code: 'booking_ineligible', message: 'The booking is no longer confirmed.' });
        }

        pendingCheckIn = null;
        return res.json({
            code: 'checked_in',
            message: 'Ticket checked in successfully.',
            ticket: {
                attendeeName: checkedIn.attendee?.name || 'Attendee',
                eventTitle: checkedIn.eventTitle,
                attendeeNumber: checkedIn.attendeeIndex + 1,
                checkedInAt: checkedIn.checkedInAt,
            },
        });
    } catch {
        if (pendingCheckIn) {
            try {
                await Ticket.updateOne(
                    { _id: pendingCheckIn.ticketId, checkedInAt: pendingCheckIn.checkedInAt, checkedInBy: pendingCheckIn.actorId },
                    { $set: { checkedInAt: null, checkedInBy: null } },
                );
            } catch {
                // Keep the original request failure; a retry reports the recorded check-in.
            }
        }
        return res.status(500).json({ code: 'check_in_failed', message: 'Unable to verify this ticket right now.' });
    }
};