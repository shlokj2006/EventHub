const Event = require("../models/Event");
const Booking = require("../models/Booking");
const { randomUUID } = require("node:crypto");
const EventStaffAssignment = require("../models/EventStaffAssignment");
const { canStaffAccessEvent } = require("../services/eventStaffPermissions");
const { isValidEventId } = require("../utils/bookingValidation");

exports.getEvents = async (req, res) => {
  try {
    const filters = req.user?.role === "admin" ? {} : { isArchived: { $ne: true } };
    if (req.user?.role === "event_staff") {
      const assignments = await EventStaffAssignment.find({
        userId: req.user._id,
      })
        .select("eventId")
        .lean();
      filters._id = { $in: assignments.map(({ eventId }) => eventId) };
    }
    if (req.query.category) filters.category = req.query.category;
    if (req.query.search)
      filters.title = { $regex: req.query.search, $options: "i" };

    const query = Event.find(filters);
    const events =
      req.user?.role === "event_staff"
        ? await query
            .select(
              "_id title description date location category totalSeats availableSeats ticketPrice currency image",
            )
            .lean()
        : await query.populate("createdBy", "name");
    res.json(events);
  } catch (error) {
    console.error("Event operation failed:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getEventById = async (req, res) => {
  try {
    if (
      req.user?.role === "event_staff" &&
      !(await canStaffAccessEvent(req.user._id, req.params.id))
    ) {
      return res.status(404).json({ message: "Event not found" });
    }
    const event = await Event.findById(req.params.id).populate(
      "createdBy",
      "name",
    );
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.isArchived && req.user?.role !== "admin") {
      return res.status(404).json({ message: "Event not found" });
    }
    res.json(event);
  } catch (error) {
    console.error("Event operation failed:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      location,
      category,
      totalSeats,
      ticketPrice,
      image,
    } = req.body;
    const event = await Event.create({
      title,
      description,
      date,
      location,
      category,
      totalSeats,
      availableSeats: totalSeats,
      ticketPrice: ticketPrice || 0,
      image: image || "",
      createdBy: req.user.id,
    });
    res.status(201).json(event);
  } catch (error) {
    console.error("Event operation failed:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    if (!isValidEventId(req.params.id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const editableFields = [
      "title",
      "description",
      "date",
      "location",
      "category",
      "image",
      "ticketPrice",
    ];
    for (const field of editableFields) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, field)) {
        event[field] = req.body[field];
      }
    }
    await event.save();
    res.json(event);
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: "Event details are invalid" });
    }
    res.status(500).json({ message: "Server Error" });
  }
};

exports.deleteEvent = async (req, res) => {
  let deletionToken;
  let deletionCompleted = false;
  try {
    if (!isValidEventId(req.params.id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }
    deletionToken = randomUUID();
    const now = new Date();
    const event = await Event.findOneAndUpdate(
      {
        _id: req.params.id,
        $or: [
          { deletionLeaseExpiresAt: { $exists: false } },
          { deletionLeaseExpiresAt: null },
          { deletionLeaseExpiresAt: { $lte: now } },
        ],
      },
      {
        $set: {
          deletionLeaseToken: deletionToken,
          deletionLeaseExpiresAt: new Date(now.getTime() + 30_000),
        },
      },
      { new: true },
    ).select("_id capacityClaims");
    if (!event) {
      if (!(await Event.exists({ _id: req.params.id }))) {
        return res.status(404).json({ message: "Event not found" });
      }
      return res.status(409).json({ message: "Event deletion is already in progress. Retry shortly." });
    }
    if (await Booking.exists({ eventId: event._id })) {
      return res.status(409).json({
        message: "This event has bookings and cannot be permanently deleted. Archive it instead.",
      });
    }
    if (event.capacityClaims?.length) {
      return res.status(409).json({
        message: "A booking is being finalized for this event. Retry deletion shortly.",
      });
    }
    const deleted = await Event.findOneAndDelete({
      _id: event._id,
      deletionLeaseToken: deletionToken,
      deletionLeaseExpiresAt: { $gt: new Date() },
      $or: [{ capacityClaims: { $size: 0 } }, { capacityClaims: { $exists: false } }],
    });
    if (!deleted) {
      return res.status(409).json({
        message: "A booking is being finalized for this event. Retry deletion shortly.",
      });
    }
    deletionCompleted = true;
    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Event operation failed:", error);
    res.status(500).json({ message: "Server Error" });
  } finally {
    if (deletionToken && !deletionCompleted) {
      try {
        await Event.updateOne(
          { _id: req.params.id, deletionLeaseToken: deletionToken },
          { $unset: { deletionLeaseToken: 1, deletionLeaseExpiresAt: 1 } },
        );
      } catch (error) {
        console.error("Event deletion lease release failed:", error);
      }
    }
  }
};

const setEventArchived = (isArchived) => async (req, res) => {
  try {
    if (!isValidEventId(req.params.id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: { isArchived } },
      { new: true, runValidators: true },
    );
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  } catch (error) {
    console.error("Event operation failed:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.archiveEvent = setEventArchived(true);
exports.restoreEvent = setEventArchived(false);
