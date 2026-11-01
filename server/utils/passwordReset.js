const crypto = require('node:crypto');

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;

const normalizeEmail = (value) => typeof value === 'string' ? value.trim().toLowerCase() : '';
const isValidEmail = (value) => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const createResetToken = () => crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const isValidResetToken = (token) => typeof token === 'string' && /^[a-f0-9]{64}$/i.test(token);
const isValidPassword = (password) => typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH && password.length <= 128;

module.exports = { RESET_TOKEN_TTL_MS, MIN_PASSWORD_LENGTH, normalizeEmail, isValidEmail, createResetToken, hashResetToken, isValidResetToken, isValidPassword };
