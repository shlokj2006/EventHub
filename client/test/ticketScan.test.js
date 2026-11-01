import test from 'node:test';
import assert from 'node:assert/strict';
import { getTicketScanMessage, parseTicketReference } from '../src/utils/ticketScan.js';

test('ticket scanner accepts only the opaque issued ticket reference format', () => {
    const valid = `EH-TKT-${'A'.repeat(32)}`;
    assert.equal(parseTicketReference(valid), valid);
    assert.equal(parseTicketReference('https://eventhub.example/ticket/123'), null);
    assert.equal(parseTicketReference(`EH-TKT-${'g'.repeat(32)}`), null);
    assert.equal(parseTicketReference({ ticketReference: valid }), null);
});

test('scanner shows clear messages for server check-in outcomes', () => {
    assert.equal(getTicketScanMessage('checked_in'), 'Ticket checked in successfully.');
    assert.equal(getTicketScanMessage('already_checked_in'), 'This ticket has already been checked in.');
    assert.equal(getTicketScanMessage('ticket_void'), 'This ticket has been cancelled or voided.');
    assert.equal(getTicketScanMessage('booking_expired'), 'The booking reservation expired.');
    assert.equal(getTicketScanMessage('unknown_code', 'Server detail'), 'Server detail');
});
