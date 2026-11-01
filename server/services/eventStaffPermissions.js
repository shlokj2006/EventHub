const EventStaffAssignment = require('../models/EventStaffAssignment');

const canStaffAccessEvent = async (userId, eventId) => Boolean(await EventStaffAssignment.exists({ userId, eventId }));

module.exports = { canStaffAccessEvent };
