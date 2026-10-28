const express = require('express');
const router = express.Router();
const { bookEvent, confirmBooking, getMyBookings, getAllBookings, cancelBooking, sendBookingOTP, expireReservations } = require('../controllers/bookingController');
const { protect, admin, bookingParticipant } = require('../middleware/auth');
const cronAuth = require('../middleware/cronAuth');

router.get('/maintenance/expire', cronAuth, expireReservations);
router.get('/admin', protect, admin, getAllBookings);
router.get('/my', protect, getMyBookings);
router.post('/send-otp', protect, bookingParticipant, sendBookingOTP);
router.post('/', protect, bookingParticipant, bookEvent);
router.put('/:id/confirm', protect, admin, confirmBooking);
router.delete('/:id', protect, bookingParticipant, cancelBooking);

module.exports = router;
