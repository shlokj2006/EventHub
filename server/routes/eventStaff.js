const express = require('express');
const router = express.Router();
const { protect, admin, eventStaff } = require('../middleware/auth');
const {
    listStaff, designateStaff, assignEvent, removeAssignment, revokeStaff,
    getMyAssignedEvents, getAssignedEvent,
} = require('../controllers/eventStaffController');

router.get('/events', protect, eventStaff, getMyAssignedEvents);
router.get('/events/:eventId', protect, eventStaff, getAssignedEvent);

router.get('/admin', protect, admin, listStaff);
router.post('/admin', protect, admin, designateStaff);
router.post('/admin/:staffId/events', protect, admin, assignEvent);
router.delete('/admin/:staffId/events/:eventId', protect, admin, removeAssignment);
router.delete('/admin/:staffId', protect, admin, revokeStaff);

module.exports = router;
