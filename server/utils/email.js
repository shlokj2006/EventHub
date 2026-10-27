const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('node:path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const getTransporter = () => {
    const { EMAIL_USER, EMAIL_PASS, SMTP_HOST, SMTP_PORT, SMTP_SECURE } = process.env;
    const emailUser = EMAIL_USER?.trim();
    const smtpSettingsProvided = [SMTP_HOST, SMTP_PORT, SMTP_SECURE].some((value) => value !== undefined && value !== '');
    const configurationError = (code, message) => Object.assign(new Error(message), { code });

    if (!emailUser || !EMAIL_PASS) {
        throw configurationError('EMAIL_CONFIG_MISSING_CREDENTIALS', 'Email configuration requires EMAIL_USER and EMAIL_PASS.');
    }

    // Earlier EventHub versions used Nodemailer's Gmail service with these two
    // variables. Keep that working for existing local/deployment environments.
    if (!smtpSettingsProvided) {
        return nodemailer.createTransport({
            service: 'gmail',
            connectionTimeout: 10_000,
            greetingTimeout: 10_000,
            socketTimeout: 15_000,
            auth: { user: emailUser, pass: EMAIL_PASS },
        });
    }

    const port = Number(SMTP_PORT);
    if (!SMTP_HOST?.trim() || !Number.isInteger(port) || port < 1 || port > 65535) {
        throw configurationError('EMAIL_CONFIG_INVALID_SMTP_ENDPOINT', 'SMTP_HOST and a valid SMTP_PORT are required when custom SMTP settings are used.');
    }
    if (!['true', 'false'].includes(String(SMTP_SECURE).toLowerCase())) {
        throw configurationError('EMAIL_CONFIG_INVALID_SMTP_SECURE', 'SMTP_SECURE must be true or false when custom SMTP settings are used.');
    }
    return nodemailer.createTransport({
        host: SMTP_HOST.trim(),
        port,
        secure: String(SMTP_SECURE).toLowerCase() === 'true',
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
        auth: { user: emailUser, pass: EMAIL_PASS },
    });
};

const safeEmailErrorCode = (error) => typeof error?.code === 'string' && /^[A-Z0-9_-]{1,40}$/i.test(error.code)
    ? error.code
    : 'EMAIL_DELIVERY_FAILED';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

const sendBookingConfirmationEmail = async ({
    to, userName, eventTitle, eventDate, bookingReference, attendeeCount, amount, currency, paymentStatus, attachments,
}) => {
    const safeName = escapeHtml(userName || 'EventHub guest');
    const safeTitle = escapeHtml(eventTitle || 'Event');
    const dateText = eventDate ? new Date(eventDate).toLocaleString() : 'See your booking details';
    const safeDate = escapeHtml(dateText);
    const safeReference = escapeHtml(bookingReference || 'Available in your account');
    const totalText = Number.isFinite(Number(amount))
        ? `${escapeHtml(currency || 'INR')} ${Number(amount).toFixed(2)}`
        : 'See your booking details';
    const paymentText = paymentStatus === 'paid' ? 'Paid (recorded by EventHub admin)' : 'Unpaid';
    const safeSubjectTitle = String(eventTitle || 'EventHub event').replace(/[\r\n]+/g, ' ').slice(0, 160);
    await getTransporter().sendMail({
        from: process.env.EMAIL_USER?.trim(),
        to,
        subject: `Booking confirmed: ${safeSubjectTitle}`,
        text: [
            `Hello ${userName || 'EventHub guest'},`,
            `Your booking for ${eventTitle || 'the event'} is confirmed.`,
            `Event date: ${dateText}`,
            `Booking reference: ${bookingReference || 'Available in your EventHub account'}`,
            `Attendees: ${attendeeCount}`,
            `Booking total: ${totalText}`,
            `Payment status: ${paymentText}`,
            'Your ticket PDFs are attached. Keep the QR code ready for check-in.',
        ].join('\n'),
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#111827"><h2>Booking confirmed</h2><p>Hello ${safeName}, your booking is confirmed.</p><p><strong>${safeTitle}</strong></p><p>Event date: ${safeDate}</p><p>Booking reference: ${safeReference}</p><p>Attendees: ${attendeeCount}</p><p>Booking total: ${totalText}</p><p>Payment status: ${escapeHtml(paymentText)}</p><p>Your ticket PDFs are attached. Keep the QR code ready for check-in.</p></div>`,
        attachments,
    });
};

const sendOTPEmail = async (userEmail, otp, type) => {
    const title = type === 'account_verification' ? 'Verify your EventHub Account' : 'EventHub Booking Verification';
    const msg = type === 'account_verification'
        ? 'Please use the following OTP to verify your new EventHub account.'
        : 'Please use the following OTP to verify and confirm your event booking.';
    return getTransporter().sendMail({
        from: process.env.EMAIL_USER?.trim(),
        to: userEmail,
        subject: title,
        html: `<div style="font-family:Arial,sans-serif;text-align:center;padding:20px"><h2>${title}</h2><p>${msg}</p><div style="margin:20px auto;padding:15px;font-size:24px;font-weight:bold;background:#f4f4f4;width:max-content;letter-spacing:5px">${escapeHtml(otp)}</div><p>This code expires in 5 minutes. If you didn't request this, please ignore it.</p></div>`,
    });
};

const sendPasswordResetEmail = async (userEmail, resetUrl) => {
    await getTransporter().sendMail({
        from: process.env.EMAIL_USER?.trim(),
        to: userEmail,
        subject: 'Reset your EventHub password',
        text: `Use this link within 30 minutes to reset your EventHub password: ${resetUrl}\nIf you did not request this, you can ignore this email.`,
        html: `<div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px;"><h2>Reset your EventHub password</h2><p>Use the button below within 30 minutes to choose a new password.</p><p><a href="${escapeHtml(resetUrl)}" style="display: inline-block; padding: 12px 18px; background: #111827; color: #fff; text-decoration: none; border-radius: 6px;">Reset password</a></p><p>If you did not request this, you can ignore this email.</p></div>`,
    });
};

const sendPasswordResetSuccessEmail = async (userEmail) => {
    await getTransporter().sendMail({
        from: process.env.EMAIL_USER?.trim(),
        to: userEmail,
        subject: 'Your EventHub password was changed',
        text: 'Your EventHub password was changed. If you did not make this change, contact EventHub support.',
        html: '<p>Your EventHub password was changed.</p><p>If you did not make this change, contact EventHub support.</p>',
    });
};

module.exports = {
    sendBookingConfirmationEmail,
    sendOTPEmail,
    sendPasswordResetEmail,
    sendPasswordResetSuccessEmail,
    safeEmailErrorCode,
};
