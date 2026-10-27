const express = require('express');
const router = express.Router();
const { getEvents, getEventById, createEvent, updateEvent, deleteEvent } = require('../controllers/eventController');
const { protect, optionalProtect, admin } = require('../middleware/auth');

router.get('/', optionalProtect, getEvents);
router.get('/:id', optionalProtect, getEventById);
router.post('/', protect, admin, createEvent);
router.put('/:id', protect, admin, updateEvent);
router.delete('/:id', protect, admin, deleteEvent);

module.exports = router;
