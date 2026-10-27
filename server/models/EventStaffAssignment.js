const mongoose = require('mongoose');

const eventStaffAssignmentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

eventStaffAssignmentSchema.index({ userId: 1, eventId: 1 }, { unique: true });
eventStaffAssignmentSchema.index({ eventId: 1, userId: 1 });

module.exports = mongoose.model('EventStaffAssignment', eventStaffAssignmentSchema);
