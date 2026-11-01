import test from 'node:test';
import assert from 'node:assert/strict';
import { SessionEpoch } from '../src/utils/sessionEpoch.js';

test('account switching aborts pending requests and makes their responses stale', () => {
    const session = new SessionEpoch();
    const oldRequest = session.beginRequest();
    assert.equal(session.isCurrent(oldRequest.version), true);

    session.advance();

    assert.equal(oldRequest.signal.aborted, true);
    assert.equal(session.isCurrent(oldRequest.version), false);
    const newRequest = session.beginRequest();
    assert.equal(session.isCurrent(newRequest.version), true);
    newRequest.finish();
});
