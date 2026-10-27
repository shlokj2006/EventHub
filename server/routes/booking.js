const express = require('express');
const router = express.Router();
const { bookEvent, confirmBooking, getMyBookings, getAllBookings, cancelBooking, sendBookingOTP, expireReservations } = require('../controllers/bookingController');
const { protect, admin } = require('../middleware/auth');
const cronAuth = require('../middleware/cronAuth');

router.get('/maintenance/expire', cronAuth, expireReservations);
router.get('/admin', protect, admin, getAllBookings);
router.get('/my', protect, getMyBookings);
router.post('/send-otp', protect, sendBookingOTP);
router.post('/', protect, bookEvent);
router.put('/:id/confirm', protect, admin, confirmBooking);
router.delete('/:id', protect, cancelBooking);

module.exports = router;
