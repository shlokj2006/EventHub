const express = require('express');
const { downloadTicketPdf, checkInTicket } = require('../controllers/ticketController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/:ticketId.pdf', protect, downloadTicketPdf);
router.post('/check-in', protect, checkInTicket);

module.exports = router;
