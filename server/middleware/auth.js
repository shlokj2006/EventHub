const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token = req.headers.authorization;
    if (token && token.startsWith('Bearer')) {
        try {
            token = token.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }
            const currentVersion = req.user.tokenVersion || 0;
            if ((decoded.tokenVersion !== undefined && decoded.tokenVersion !== currentVersion) || (currentVersion > 0 && decoded.tokenVersion === undefined)) {
                return res.status(401).json({ message: 'Not authorized, token has been revoked' });
            }
            return next();
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }
    return res.status(401).json({ message: 'Not authorized, no token' });
};

const optionalProtect = (req, res, next) => {
    if (!req.headers.authorization) return next();
    return protect(req, res, next);
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') return next();
    return res.status(403).json({ message: 'Not authorized as an admin' });
};

const eventStaff = (req, res, next) => {
    if (req.user && req.user.role === 'event_staff') return next();
    return res.status(403).json({ message: 'Not authorized as event staff' });
};

const bookingParticipant = (req, res, next) => {
    if (req.user && req.user.role !== 'event_staff') return next();
    return res.status(403).json({ message: 'Event staff accounts cannot create or cancel bookings' });
};

module.exports = { protect, optionalProtect, admin, eventStaff, bookingParticipant };
