const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');
const EventStaffAssignment = require('../models/EventStaffAssignment');
const { normalizeEmail, isValidEmail } = require('../utils/passwordReset');
const { isValidEventId } = require('../utils/bookingValidation');
const { canStaffAccessEvent } = require('../services/eventStaffPermissions');

const publicStaff = (user) => ({ _id: user._id, name: user.name, email: user.email, role: user.role, isVerified: user.isVerified });

exports.listStaff = async (req, res) => {
    try {
        const staff = await User.find({ role: 'event_staff' }).select('_id name email role isVerified').lean();
        const ids = staff.map((user) => user._id);
        const assignments = await EventStaffAssignment.find({ userId: { $in: ids } })
            .populate('eventId', 'title date location category').lean();
        const byUser = new Map(ids.map((id) => [String(id), []]));
        assignments.forEach((assignment) => {
            if (assignment.eventId) byUser.get(String(assignment.userId))?.push(assignment.eventId);
        });
        return res.json(staff.map((user) => ({ ...publicStaff(user), events: byUser.get(String(user._id)) || [] })));
    } catch {
        return res.status(500).json({ message: 'Unable to load event staff.' });
    }
};

// Admin designation reuses a verified account. The user chooses their own password
// through the existing password-reset flow; no password or invite secret is issued here.
exports.designateStaff = async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    if (!isValidEmail(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    try {
        const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matches = await User.find({ email: { $regex: `^${escaped}$`, $options: 'i' } }).limit(2);
        if (matches.length !== 1) return res.status(matches.length ? 409 : 404).json({ message: matches.length ? 'This email matches multiple accounts.' : 'Verified account not found.' });
        const target = matches[0];
        if (String(target._id) === String(req.user._id)) return res.status(403).json({ message: 'Admins cannot designate their own account as event staff.' });
        if (!target.isVerified) return res.status(409).json({ message: 'The account must verify its email before staff designation.' });
        if (target.role === 'admin') return res.status(409).json({ message: 'An admin account cannot be designated as event staff.' });
        if (target.role === 'event_staff') return res.status(200).json({ staff: publicStaff(target), message: 'Account is already event staff.' });
        const updated = await User.findOneAndUpdate(
            { _id: target._id, role: 'user', isVerified: true },
            { $set: { role: 'event_staff' }, $inc: { tokenVersion: 1 } },
            { new: true, runValidators: true },
        ).select('_id name email role isVerified');
        if (!updated) return res.status(409).json({ message: 'Account role changed; refresh and try again.' });
        return res.status(201).json({ staff: publicStaff(updated) });
    } catch {
        return res.status(500).json({ message: 'Unable to designate event staff.' });
    }
};

exports.assignEvent = async (req, res) => {
    const { staffId } = req.params;
    const { eventId } = req.body || {};
    if (!mongoose.isValidObjectId(staffId) || !isValidEventId(eventId)) return res.status(400).json({ message: 'Valid staff and event IDs are required.' });
    if (String(staffId) === String(req.user._id)) return res.status(403).json({ message: 'Admins cannot assign themselves as event staff.' });
    try {
        const [staff, event] = await Promise.all([
            User.findOne({ _id: staffId, role: 'event_staff' }).select('_id name email role isVerified'),
            Event.findById(eventId).select('_id title date location category'),
        ]);
        if (!staff) return res.status(404).json({ message: 'Event staff account not found.' });
        if (!event) return res.status(404).json({ message: 'Event not found.' });
        await EventStaffAssignment.updateOne(
            { userId: staff._id, eventId: event._id },
            { $setOnInsert: { userId: staff._id, eventId: event._id, assignedBy: req.user._id } },
            { upsert: true, runValidators: true },
        );
        return res.json({ staff: publicStaff(staff), event, assigned: true });
    } catch (error) {
        if (error.code === 11000) return res.json({ assigned: true, alreadyAssigned: true });
        return res.status(500).json({ message: 'Unable to assign this event.' });
    }
};

exports.removeAssignment = async (req, res) => {
    const { staffId, eventId } = req.params;
    if (!mongoose.isValidObjectId(staffId) || !isValidEventId(eventId)) return res.status(400).json({ message: 'Valid staff and event IDs are required.' });
    try {
        await EventStaffAssignment.deleteOne({ userId: staffId, eventId });
        return res.json({ assigned: false });
    } catch {
        return res.status(500).json({ message: 'Unable to remove this assignment.' });
    }
};

exports.revokeStaff = async (req, res) => {
    const { staffId } = req.params;
    if (!mongoose.isValidObjectId(staffId)) return res.status(400).json({ message: 'Valid staff ID is required.' });
    if (String(staffId) === String(req.user._id)) return res.status(403).json({ message: 'Admins cannot revoke their own staff role.' });
    try {
        const staff = await User.findOneAndUpdate(
            { _id: staffId, role: 'event_staff' },
            { $set: { role: 'user' }, $inc: { tokenVersion: 1 } },
            { new: true, runValidators: true },
        ).select('_id name email role isVerified');
        if (!staff) return res.status(404).json({ message: 'Event staff account not found.' });
        await EventStaffAssignment.deleteMany({ userId: staff._id });
        return res.json({ staff: publicStaff(staff), revoked: true });
    } catch {
        return res.status(500).json({ message: 'Unable to revoke event staff access.' });
    }
};

const eventProjection = '_id title description date location category totalSeats availableSeats ticketPrice currency image';
exports.getMyAssignedEvents = async (req, res) => {
    try {
        const assignments = await EventStaffAssignment.find({ userId: req.user._id }).select('eventId').lean();
        const events = await Event.find({ _id: { $in: assignments.map((item) => item.eventId) } }).select(eventProjection).lean();
        return res.json(events);
    } catch {
        return res.status(500).json({ message: 'Unable to load assigned events.' });
    }
};

exports.getAssignedEvent = async (req, res) => {
    const { eventId } = req.params;
    if (!isValidEventId(eventId)) return res.status(400).json({ message: 'Invalid event ID.' });
    try {
        if (!await canStaffAccessEvent(req.user._id, eventId)) return res.status(404).json({ message: 'Assigned event not found.' });
        const event = await Event.findById(eventId).select(eventProjection).lean();
        if (!event) return res.status(404).json({ message: 'Assigned event not found.' });
        return res.json(event);
    } catch {
        return res.status(500).json({ message: 'Unable to load assigned event.' });
    }
};