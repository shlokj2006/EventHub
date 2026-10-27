import test from 'node:test';
import assert from 'node:assert/strict';
import { getLoginDestination } from '../src/utils/authNavigation.js';

test('login defaults accounts to their role dashboard', () => {
    assert.equal(getLoginDestination('user'), '/');
    assert.equal(getLoginDestination('admin'), '/admin');
    assert.equal(getLoginDestination('event_staff'), '/staff');
});

test('login preserves safe requested routes without role escalation or open redirects', () => {
    assert.equal(getLoginDestination('user', '/dashboard'), '/dashboard');
    assert.equal(getLoginDestination('admin', '/dashboard'), '/admin');
    assert.equal(getLoginDestination('user', '/admin'), '/');
    assert.equal(getLoginDestination('user', 'https://example.com'), '/');
    assert.equal(getLoginDestination('admin', '//example.com'), '/admin');
    assert.equal(getLoginDestination('event_staff', '/admin'), '/staff');
    assert.equal(getLoginDestination('user', '/staff/events'), '/');
});
