import { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import { AuthContext } from '../context/AuthContext';
import { FaCalendarAlt, FaMapMarkerAlt, FaChair, FaMoneyBillWave } from 'react-icons/fa';
import { estimateBookingTotal, parseBookingQuantity, reconcileAttendees, resolveQuantityDraft } from '../utils/bookingForm';

const EventDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [otp, setOtp] = useState('');
    const [showOTP, setShowOTP] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [quantityDraft, setQuantityDraft] = useState('1');
    const [quantityError, setQuantityError] = useState('');
    const [attendees, setAttendees] = useState(() => [{ name: user?.name || '', email: user?.email || '' }]);
    const bookingInFlight = useRef(false);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const { data } = await api.get(`/events/${id}`);
                setEvent(data);
            } catch {
                setError('Failed to load event details.');
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [id]);

    const handleBooking = async () => {
        if (bookingInFlight.current) return;
        if (!user) {
            navigate('/login');
            return;
        }
        bookingInFlight.current = true;
        setBookingLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            const { data: latestEvent } = await api.get(`/events/${id}`);
            setEvent(latestEvent);
            const validQuantity = resolveQuantityDraft(quantityDraft, latestEvent.availableSeats);
            if (validQuantity === null) {
                const parsedDraft = parseBookingQuantity(quantityDraft);
                setQuantityError(parsedDraft === null
                    ? 'Enter a whole ticket quantity of at least 1.'
                    : `The current maximum is ${latestEvent.availableSeats} tickets.`);
                setError(`Choose a whole ticket quantity from 1 to ${latestEvent.availableSeats} based on current availability.`);
                return;
            }
            const bookingAttendees = reconcileAttendees(attendees, validQuantity);
            setQuantity(validQuantity);
            setQuantityDraft(String(validQuantity));
            setAttendees(bookingAttendees);
            setQuantityError('');
            if (bookingAttendees.some((attendee) => (
                !attendee.name.trim() || attendee.name.trim().length > 120 ||
                (attendee.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendee.email.trim()))
            ))) {
                setError('Enter a valid name for every attendee and a valid email when supplied.');
                return;
            }

            if (!showOTP) {
                await api.post('/bookings/send-otp');
                setShowOTP(true);
                setSuccessMsg('OTP sent to your email. Please verify to confirm booking.');
            } else {
                const { data } = await api.post('/bookings', { eventId: latestEvent._id, otp, quantity: validQuantity, attendees: bookingAttendees });
                setSuccessMsg(data.message || 'Booking request submitted.');
                setShowOTP(false);
                setOtp('');
                setEvent({ ...latestEvent, availableSeats: Math.max(0, latestEvent.availableSeats - validQuantity) });
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Booking failed');
        } finally {
            bookingInFlight.current = false;
            setBookingLoading(false);
        }
    };

    if (loading) return <div className="text-center py-20 text-xl font-semibold">Loading...</div>;
    if (error && !event) return <div className="text-center py-20 text-xl text-red-500">{error || 'Event not found'}</div>;

    const isSoldOut = event.availableSeats <= 0;

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden mt-8">
            {event.image ? (
                <img src={event.image} alt={event.title} className="w-full h-80 object-cover" />
            ) : (
                <div className="w-full h-64 bg-gray-900 flex items-center justify-center text-white/50 text-6xl font-black uppercase tracking-widest">
                    {event.category}
                </div>
            )}

            <div className="p-8 md:p-12">
                <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
                    <div>
                        <div className="inline-block bg-gray-200 text-gray-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-3">
                            {event.category}
                        </div>
                        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">{event.title}</h1>
                        <p className="text-gray-600 text-lg leading-relaxed mb-6">{event.description}</p>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 min-w-0 w-full md:w-auto md:min-w-[300px] md:max-w-[440px] shrink-0 shadow-sm max-h-[calc(100dvh-9rem)] overflow-y-auto overscroll-contain">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">Booking Details</h3>

                        <div className="space-y-4 mb-8">
                            <div className="flex items-center gap-4 text-gray-600">
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-900 shrink-0">
                                    <FaMoneyBillWave />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-400 uppercase">Ticket Price</p>
                                    <p className="font-bold text-gray-800 text-lg">{event.ticketPrice === 0 ? <span className="text-green-500">Free</span> : `₹${event.ticketPrice}`}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-gray-600">
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-900 shrink-0">
                                    <FaChair />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-400 uppercase">Availability</p>
                                    <p className="font-bold text-gray-800">
                                        <span className={event.availableSeats < 10 ? 'text-orange-500' : ''}>{event.availableSeats}</span> / {event.totalSeats}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-gray-600">
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-900 shrink-0">
                                    <FaCalendarAlt />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-400 uppercase">Date</p>
                                    <p className="font-bold text-gray-800">{new Date(event.date).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-gray-600">
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-900 shrink-0">
                                    <FaMapMarkerAlt />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-400 uppercase">Location</p>
                                    <p className="font-bold text-gray-800">{event.location}</p>
                                </div>
                            </div>
                        </div>

                            <div className="space-y-3 border-t border-gray-200 pt-4">
                                <label htmlFor="ticket-quantity" className="block text-sm font-semibold text-gray-700">Ticket quantity</label>
                                <input
                                    id="ticket-quantity"
                                    type="number"
                                    min="1"
                                    step="1"
                                    required
                                    disabled={showOTP || event.availableSeats < 1}
                                    value={quantityDraft}
                                    onChange={(e) => {
                                        const nextDraft = e.target.value;
                                        setQuantityDraft(nextDraft);
                                        const next = resolveQuantityDraft(nextDraft, event.availableSeats);
                                        if (next !== null) {
                                            setQuantity(next);
                                            setAttendees((current) => reconcileAttendees(current, next));
                                            setQuantityError('');
                                            setError('');
                                        } else if (parseBookingQuantity(nextDraft) !== null) {
                                            setQuantityError(`The current maximum is ${event.availableSeats} tickets.`);
                                        } else {
                                            setQuantityError('');
                                        }
                                    }}
                                    onBlur={() => {
                                        const next = parseBookingQuantity(quantityDraft);
                                        if (next === null) setQuantityError('Enter a whole ticket quantity of at least 1.');
                                        else if (next > event.availableSeats) setQuantityError(`The current maximum is ${event.availableSeats} tickets.`);
                                        else setQuantityDraft(String(next));
                                    }}
                                    aria-describedby="ticket-quantity-help"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-700"
                                />
                                <p id="ticket-quantity-help" className="text-xs text-gray-500">Current available seats: {event.availableSeats}. Availability is checked again before booking.</p>
                                {quantityError && <p role="alert" className="text-sm text-red-700">{quantityError}</p>}
                                <div className="rounded-lg bg-white p-3 text-sm text-gray-600">
                                    <p>Unit price: <strong>{event.ticketPrice === 0 ? 'Free' : `${event.currency || 'INR'} ${event.ticketPrice}`}</strong></p>
                                    <p>Quantity: <strong>{quantity}</strong></p>
                                    <p>Estimated total: <strong>{event.ticketPrice === 0 ? 'Free' : `${event.currency || 'INR'} ${estimateBookingTotal(event.ticketPrice, quantity).toFixed(2)}`}</strong></p>
                                    <p className="mt-1 text-xs">Final total is calculated by the server. Free bookings confirm and receive tickets immediately; paid bookings require admin confirmation.</p>
                                </div>
                                <div className="space-y-3">
                                    {attendees.map((attendee, index) => (
                                        <fieldset key={index} className="rounded-xl border border-gray-200 p-3">
                                            <legend className="px-1 text-sm font-bold text-gray-800">Attendee {index + 1}</legend>
                                            <label htmlFor={`attendee-${index}-name`} className="block text-xs font-semibold text-gray-600 mb-1">Full name *</label>
                                            <input id={`attendee-${index}-name`} type="text" required maxLength={120} value={attendee.name} disabled={showOTP} onChange={(e) => setAttendees((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: e.target.value } : item))} className="w-full px-3 py-2 rounded-lg border border-gray-200 mb-2" />
                                            <label htmlFor={`attendee-${index}-email`} className="block text-xs font-semibold text-gray-600 mb-1">Email (optional)</label>
                                            <input id={`attendee-${index}-email`} type="email" maxLength={254} value={attendee.email} disabled={showOTP} onChange={(e) => setAttendees((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, email: e.target.value } : item))} className="w-full px-3 py-2 rounded-lg border border-gray-200" />
                                        </fieldset>
                                    ))}
                                </div>
                            </div>

                        {showOTP && (
                            <div className="mb-4">
                                <label htmlFor="booking-otp" className="block text-sm font-semibold text-gray-700 mb-2">Enter OTP to Confirm</label>
                                <input
                                    id="booking-otp"
                                    type="text"
                                    required
                                    placeholder="6-digit code"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-700 transition shadow-sm font-bold tracking-widest text-center text-lg"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    maxLength="6"
                                />
                            </div>
                        )}

                        <button
                            onClick={handleBooking}
                            disabled={isSoldOut || bookingLoading || (showOTP && !otp)}
                            className={`sticky bottom-0 w-full py-4 px-6 font-bold text-lg transition shadow-lg bg-gray-50 ${isSoldOut || (successMsg && !showOTP)
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gray-900 hover:bg-black text-white hover:shadow-xl hover:-translate-y-1'
                                }`}
                        >
                            {bookingLoading ? 'Processing...' : (showOTP ? 'Verify OTP & Confirm' : (successMsg && !showOTP ? 'Request Sent' : (isSoldOut ? 'Sold Out' : 'Confirm Registration')))}
                        </button>
                        {error && <p className="text-red-500 mt-4 text-center font-medium bg-red-50 p-2 rounded">{error}</p>}
                        {successMsg && <p className="text-green-600 mt-4 text-center font-medium bg-green-50 p-2 rounded">{successMsg}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventDetail;
