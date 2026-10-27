const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const state = { transports: [], messages: [], failSend: null };
const fakeNodemailer = {
  createTransport(options) {
    state.transports.push(options);
    return {
      sendMail: async (message) => {
        if (state.failSend) throw state.failSend;
        state.messages.push(message);
        return { messageId: 'test-message' };
      },
    };
  },
};

const originalLoad = Module._load;
Module._load = function mockNodemailer(request, parent, isMain) {
  if (request === 'nodemailer') return fakeNodemailer;
  return originalLoad.call(this, request, parent, isMain);
};
const {
  sendBookingConfirmationEmail,
  sendOTPEmail,
  sendPasswordResetEmail,
  sendPasswordResetSuccessEmail,
} = require('../utils/email');
Module._load = originalLoad;

const envKeys = ['EMAIL_USER', 'EMAIL_PASS', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE'];
const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
const configure = () => {
  process.env.EMAIL_USER = 'sender@example.test';
  process.env.EMAIL_PASS = 'test-only-secret';
  process.env.SMTP_HOST = 'smtp.example.test';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_SECURE = 'false';
};
const clearState = () => {
  state.transports = [];
  state.messages = [];
  state.failSend = null;
};

test('booking mail validates settings and uses the configured TLS mode', async () => {
  clearState();
  for (const key of envKeys) delete process.env[key];
  await assert.rejects(sendBookingConfirmationEmail({ to: 'owner@example.test', attachments: [] }), {
    code: 'EMAIL_CONFIG_MISSING_CREDENTIALS',
  });
  configure();
  await sendBookingConfirmationEmail({
    to: 'owner@example.test',
    userName: '<Guest>',
    eventTitle: '<Event>',
    eventDate: new Date('2030-01-01T00:00:00Z'),
    bookingReference: 'EH-BOOKING-1',
    attendeeCount: 1,
    amount: 5,
    currency: 'INR',
    paymentStatus: 'paid',
    attachments: [{ filename: 'ticket.pdf', content: Buffer.from('pdf'), contentType: 'application/pdf' }],
  });
  assert.deepEqual(state.transports.at(-1), {
    host: 'smtp.example.test',
    port: 587,
    secure: false,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    auth: { user: 'sender@example.test', pass: 'test-only-secret' },
  });
  const message = state.messages.at(-1);
  assert.equal(message.to, 'owner@example.test');
  assert.match(message.text, /Attendees: 1/);
  assert.match(message.html, /&lt;Event&gt;/);
  assert.equal(message.attachments.length, 1);
});

test('legacy EMAIL_USER and EMAIL_PASS keep the existing Gmail transport working', async () => {
  clearState();
  process.env.EMAIL_USER = 'sender@example.test';
  process.env.EMAIL_PASS = 'test-only-secret';
  process.env.SMTP_HOST = '';
  process.env.SMTP_PORT = '';
  process.env.SMTP_SECURE = '';

  await sendOTPEmail('owner@example.test', '123456', 'account_verification');
  assert.deepEqual(state.transports.at(-1), {
    service: 'gmail',
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    auth: { user: 'sender@example.test', pass: 'test-only-secret' },
  });
  assert.equal(state.messages.at(-1).to, 'owner@example.test');
  assert.match(state.messages.at(-1).subject, /Verify your EventHub Account/);
});

test('verification, reset, and notification mail use the shared configured transport', async () => {
  clearState();
  configure();
  await sendOTPEmail('owner@example.test', '654321', 'event_booking');
  await sendPasswordResetEmail('owner@example.test', 'https://eventhub.example.test/reset-password#token=test-token');
  await sendPasswordResetSuccessEmail('owner@example.test');

  assert.equal(state.messages.length, 3);
  assert.match(state.messages[0].subject, /Booking Verification/);
  assert.equal(state.messages[0].to, 'owner@example.test');
  assert.match(state.messages[1].text, /reset-password/);
  assert.match(state.messages[2].subject, /password was changed/);
  assert.equal(state.transports.length, 3);
});

test('OTP delivery errors propagate so callers cannot claim the code was sent', async () => {
  clearState();
  configure();
  state.failSend = Object.assign(new Error('provider authentication rejected'), { code: 'EAUTH' });
  await assert.rejects(sendOTPEmail('owner@example.test', '123456', 'account_verification'), { code: 'EAUTH' });
  assert.equal(state.messages.length, 0);
});

test('partial custom SMTP settings fail with an actionable sanitized configuration error', async () => {
  clearState();
  process.env.EMAIL_USER = 'sender@example.test';
  process.env.EMAIL_PASS = 'test-only-secret';
  process.env.SMTP_HOST = 'smtp.example.test';
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_SECURE;
  await assert.rejects(sendOTPEmail('owner@example.test', '123456', 'account_verification'), {
    code: 'EMAIL_CONFIG_INVALID_SMTP_ENDPOINT',
    message: /SMTP_HOST and a valid SMTP_PORT/,
  });
});

test.after(() => {
  for (const key of envKeys) {
    if (previousEnv[key] === undefined) delete process.env[key];
    else process.env[key] = previousEnv[key];
  }
});
