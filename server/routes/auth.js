const express = require('express');
const router = express.Router();
const { register, login, verifyOTP } = require('../controllers/authController');
const { forgotPassword, resetPassword } = require('../controllers/authController');
const { getCurrentUser } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const passwordResetRateLimit = require('../middleware/passwordResetRateLimit');

router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/forgot-password', passwordResetRateLimit, forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getCurrentUser);

module.exports = router;
