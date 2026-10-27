import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateBookingTotal, isQuantityAvailable, parseBookingQuantity, reconcileAttendees, resolveQuantityDraft } from '../src/utils/bookingForm.js';

test('quantity parsing and availability accept only whole tickets within current seats', () => {
    assert.equal(parseBookingQuantity('3'), 3);
    assert.equal(parseBookingQuantity(''), null);
    assert.equal(parseBookingQuantity('1.5'), null);
    assert.equal(parseBookingQuantity('-1'), null);
    assert.equal(parseBookingQuantity('2.0'), null);
    assert.equal(isQuantityAvailable(3, 3), true);
    assert.equal(isQuantityAvailable(4, 3), false);
});

test('replacing the initial value and selecting all accepts single and multi-digit quantities', () => {
    assert.equal(resolveQuantityDraft('2', 8), 2);
    assert.equal(resolveQuantityDraft('3', 8), 3);
    assert.equal(resolveQuantityDraft('12', 18), 12);
});

test('number input increment and decrement values stay within the minimum and availability maximum', () => {
    assert.equal(resolveQuantityDraft('2', 5), 2);
    assert.equal(resolveQuantityDraft('1', 5), 1);
    assert.equal(resolveQuantityDraft('0', 5), null);
    assert.equal(resolveQuantityDraft('6', 5), null);
    assert.equal(resolveQuantityDraft('', 5), null);
});

test('attendee forms follow quantity while retaining entries within the new count', () => {
    const existing = [{ name: 'A', email: '' }, { name: 'B', email: 'b@example.com' }];
    assert.deepEqual(reconcileAttendees(existing, 3), [...existing, { name: '', email: '' }]);
    assert.deepEqual(reconcileAttendees(existing, 1), [existing[0]]);
    assert.equal(estimateBookingTotal(12.5, 3), 37.5);
    assert.equal(estimateBookingTotal(12.5, 0), null);
});
