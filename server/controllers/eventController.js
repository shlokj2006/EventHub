const Event = require('../models/Event');
const EventStaffAssignment = require('../models/EventStaffAssignment');
const { canStaffAccessEvent } = require('../services/eventStaffPermissions');
const { isValidEventId } = require('../utils/bookingValidation');

exports.getEvents = async (req, res) => {
    try {
        const filters = {};
        if (req.user?.role === 'event_staff') {
            const assignments = await EventStaffAssignment.find({ userId: req.user._id }).select('eventId').lean();
            filters._id = { $in: assignments.map(({ eventId }) => eventId) };
        }
        if (req.query.category) filters.category = req.query.category;
        if (req.query.search) filters.title = { $regex: req.query.search, $options: 'i' };

        const query = Event.find(filters);
        const events = req.user?.role === 'event_staff'
            ? await query.select('_id title description date location category totalSeats availableSeats ticketPrice currency image').lean()
            : await query.populate('createdBy', 'name email');
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getEventById = async (req, res) => {
    try {
        if (req.user?.role === 'event_staff' && !await canStaffAccessEvent(req.user._id, req.params.id)) {
            return res.status(404).json({ message: 'Event not found' });
        }
        const event = await Event.findById(req.params.id).populate('createdBy', 'name email');
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json(event);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.createEvent = async (req, res) => {
    try {
        const { title, description, date, location, category, totalSeats, ticketPrice, image } = req.body;
        const event = await Event.create({
            title,
            description,
            date,
            location,
            category,
            totalSeats,
            availableSeats: totalSeats,
            ticketPrice: ticketPrice || 0,
            image: image || '',
            createdBy: req.user.id
        });
        res.status(201).json(event);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.updateEvent = async (req, res) => {
    try {
        if (!isValidEventId(req.params.id)) {
            return res.status(400).json({ message: 'Invalid event ID' });
        }
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        const editableFields = ['title', 'description', 'date', 'location', 'category', 'image', 'ticketPrice'];
        for (const field of editableFields) {
            if (Object.prototype.hasOwnProperty.call(req.body || {}, field)) {
                event[field] = req.body[field];
            }
        }
        await event.save();
        res.json(event);
    } catch (error) {
        if (error.name === 'ValidationError' || error.name === 'CastError') {
            return res.status(400).json({ message: 'Event details are invalid' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
