const User = require('../models/User');
const OTP = require('../models/OTP');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendOTPEmail, sendPasswordResetEmail, sendPasswordResetSuccessEmail, safeEmailErrorCode } = require('../utils/email');
const PasswordReset = require('../models/PasswordReset');
const { randomUUID } = require('node:crypto');
const {
    RESET_TOKEN_TTL_MS, createResetToken, hashResetToken, isValidResetToken,
    isValidPassword, normalizeEmail, isValidEmail,
} = require('../utils/passwordReset');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const generateToken = (id, role, tokenVersion = 0) => {
    return jwt.sign({ id, role, tokenVersion }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.getCurrentUser = (req, res) => {
    res.json({
        _id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
    });
};

exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: 'user', // Hardcoded to prevent frontend passing role
            isVerified: false
        });

        const otp = generateOTP();
        await OTP.create({ email, otp, action: 'account_verification' });
        try {
            await sendOTPEmail(email, otp, 'account_verification');
        } catch (error) {
            // Keep the account and OTP. Signing in again safely creates a fresh OTP.
            console.error(`Signup verification email failed (${safeEmailErrorCode(error)}).`);
            return res.status(503).json({ message: 'Your account was created, but the verification email could not be sent. Sign in again to request a new code.' });
        }

        res.status(201).json({
            message: 'OTP sent to email. Please verify.',
            email: user.email
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

//This login controller finds the user → checks the password → checks verification 
// → sends an OTP if necessary → otherwise generates a JWT and returns the logged-in user's information.

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        if (!user.isVerified && user.role !== 'admin') {
            const otp = generateOTP();
            await OTP.findOneAndDelete({ email: user.email, action: 'account_verification' });
            await OTP.create({ email: user.email, otp, action: 'account_verification' });
            try {
                await sendOTPEmail(user.email, otp, 'account_verification');
            } catch (error) {
                console.error(`Login verification email failed (${safeEmailErrorCode(error)}).`);
                return res.status(503).json({ message: 'The verification code could not be sent. Sign in again to retry.' });
            }
            return res.status(403).json({ message: 'Account not verified', needsVerification: true, email: user.email });
        }

        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id, user.role, user.tokenVersion || 0)
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// Take the email and OTP sent by the user. Search MongoDB for that exact OTP.
//  If it doesn't exist, reject the request. If it exists, mark that user's account as verified, 
//  delete the OTP so it can't be reused, generate a login JWT token, and send the user's information and 
//  token back to the frontend.

exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const validOTP = await OTP.findOne({ email, otp, action: 'account_verification' });

        if (!validOTP) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const user = await User.findOneAndUpdate({ email }, { isVerified: true }, { new: true });
        await OTP.deleteOne({ _id: validOTP._id }); // Delete OTP after usage

        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id, user.role, user.tokenVersion || 0)
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const GENERIC_RESET_MESSAGE = 'If an account exists for that email, password-reset instructions will be sent.';

exports.forgotPassword = async (req, res) => {
    const startedAt = Date.now();
    const email = normalizeEmail(req.body?.email);
    if (!isValidEmail(email)) return res.status(400).json({ message: 'Enter a valid email address.' });

    try {
        // Ensure the dedicated collection's unique indexes exist before concurrent upserts.
        await PasswordReset.createIndexes();
        // Case-insensitive exact lookup retains access to legacy mixed-case addresses.
        const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matches = await User.find({ email: { $regex: `^${escaped}$`, $options: 'i' } }).limit(2);
        // Ambiguous legacy duplicates cannot safely identify a single account.
        if (matches.length === 1) {
            const user = matches[0];
            const token = createResetToken();
            const tokenHash = hashResetToken(token);
            const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
            try {
                await PasswordReset.findOneAndUpdate(
                    { userId: user._id },
                    { $set: { tokenHash, expiresAt, state: 'active' }, $unset: { processingOperationId: 1, processingStartedAt: 1 } },
                    { upsert: true, new: true, runValidators: true },
                );
            } catch (error) {
                // Concurrent first-time upserts can race on the unique userId index.
                if (error.code !== 11000) throw error;
                await PasswordReset.findOneAndUpdate(
                    { userId: user._id },
                    { $set: { tokenHash, expiresAt, state: 'active' }, $unset: { processingOperationId: 1, processingStartedAt: 1 } },
                    { new: true, runValidators: true },
                );
            }

            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const resetUrl = new URL('/reset-password', baseUrl);
            // A fragment is not sent in HTTP requests or Referer headers, reducing edge-log exposure.
            resetUrl.hash = new URLSearchParams({ token }).toString();
            await sendPasswordResetEmail(user.email, resetUrl.toString());
        }

        // Reduce obvious timing differences between unknown and existing addresses.
        const remaining = 1500 - (Date.now() - startedAt);
        if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
        return res.status(200).json({ message: GENERIC_RESET_MESSAGE });
    } catch (error) {
        // Same status and body for all requests that encounter mail/configuration failure.
        // The generic error does not confirm whether the address belongs to an account.
        console.error(`Password reset request could not be completed (${safeEmailErrorCode(error)}).`);
        return res.status(503).json({ message: 'Password reset is temporarily unavailable. Please try again later.' });
    }
};

exports.resetPassword = async (req, res) => {
    const { token, password, confirmPassword } = req.body || {};
    if (!isValidResetToken(token)) return res.status(400).json({ message: 'This reset link is invalid or expired. Request a new one.' });
    if (!isValidPassword(password)) return res.status(400).json({ message: 'Password must be between 8 and 128 characters.' });
    if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match.' });

    const tokenHash = hashResetToken(token);
    const now = new Date();
    const operationId = randomUUID();
    try {
        const reset = await PasswordReset.findOneAndUpdate(
            { tokenHash, state: 'active', expiresAt: { $gt: now } },
            { $set: { state: 'processing', processingOperationId: operationId, processingStartedAt: now } },
            { new: true },
        ).select('+processingOperationId');

        if (!reset) {
            // Recover the narrow crash window after the user update but before token finalization.
            const pending = await PasswordReset.findOne({ tokenHash, state: 'processing', expiresAt: { $gt: now } }).select('+processingOperationId');
            if (pending) {
                const changedUser = await User.findOne({ _id: pending.userId, passwordResetOperationId: pending.processingOperationId });
                if (changedUser) {
                    pending.state = 'consumed';
                    pending.processingOperationId = undefined;
                    pending.processingStartedAt = undefined;
                    await pending.save();
                    sendPasswordResetSuccessEmail(changedUser.email).catch((error) => console.error(`Password reset notification failed (${safeEmailErrorCode(error)}).`));
                    return res.json({ message: 'Password reset successful. Sign in with your new password.' });
                }
            }
            return res.status(400).json({ message: 'This reset link is invalid or expired. Request a new one.' });
        }

        const user = await User.findById(reset.userId);
        if (!user) {
            reset.state = 'consumed';
            await reset.save();
            return res.status(400).json({ message: 'This reset link is invalid or expired. Request a new one.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const changedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
        try {
            const updated = await User.findOneAndUpdate(
                { _id: user._id },
                { $set: { password: hashedPassword, passwordChangedAt: changedAt, passwordResetOperationId: operationId }, $inc: { tokenVersion: 1 } },
                { new: true },
            );
            if (!updated) throw new Error('Password update did not match a user.');
            reset.state = 'consumed';
            reset.processingOperationId = undefined;
            reset.processingStartedAt = undefined;
            await reset.save();
            await PasswordReset.updateMany({ userId: user._id, _id: { $ne: reset._id }, state: 'active' }, { $set: { state: 'consumed' } });
            sendPasswordResetSuccessEmail(user.email).catch((error) => console.error(`Password reset notification failed (${safeEmailErrorCode(error)}).`));
            return res.json({ message: 'Password reset successful. Sign in with your new password.' });
        } catch (error) {
            const alreadyChanged = await User.exists({ _id: user._id, passwordResetOperationId: operationId });
            if (!alreadyChanged) {
                await PasswordReset.updateOne(
                    { _id: reset._id, state: 'processing', processingOperationId: operationId, expiresAt: { $gt: new Date() } },
                    { $set: { state: 'active' }, $unset: { processingOperationId: 1, processingStartedAt: 1 } },
                );
            }
            throw error;
        }
    } catch (error) {
        console.error('Password reset could not be completed.');
        return res.status(503).json({ message: 'Password reset is temporarily unavailable. Please try again.' });
    }
};
