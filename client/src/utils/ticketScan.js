const TICKET_REFERENCE_PATTERN = /^EH-TKT-[A-F0-9]{32}$/;

export const parseTicketReference = (value) => (
    typeof value === 'string' && TICKET_REFERENCE_PATTERN.test(value) ? value : null
);

const CHECK_IN_MESSAGES = {
    checked_in: 'Ticket checked in successfully.',
    already_checked_in: 'This ticket has already been checked in.',
    ticket_void: 'This ticket has been cancelled or voided.',
    booking_cancelled: 'The booking has been cancelled.',
    booking_expired: 'The booking reservation expired.',
    booking_ineligible: 'The booking is not eligible for entry.',
    ticket_not_found: 'Ticket not found.',
    event_not_assigned: 'You are not assigned to this event.',
    invalid_ticket_reference: 'The scanned ticket reference is invalid.',
};

export const getTicketScanMessage = (code, fallback = 'Unable to verify this ticket right now.') => (
    CHECK_IN_MESSAGES[code] || fallback
);
