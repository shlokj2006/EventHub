import { useState, useEffect, useContext, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import { AuthContext } from '../context/AuthContext';
import { FaCalendarAlt, FaMapMarkerAlt, FaChair, FaMoneyBillWave } from 'react-icons/fa';
import { estimateBookingTotal, parseBookingQuantity, reconcileAttendees, resolveQuantityDraft } from '../utils/bookingForm';
import Button from '../components/ui/Button';
import Feedback from '../components/ui/Feedback';
import FormControl from '../components/ui/FormControl';
import { PageHeading, Surface } from '../components/ui/LayoutPrimitives';

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

    if (loading) return <Feedback tone="loading" className="my-8">Loading event details…</Feedback>;
    if (error && !event) return <div className="mx-auto max-w-2xl space-y-5 py-12"><Feedback tone="error">{error || 'Event not found'}</Feedback><Link to="/" className="eh-button eh-button--outline">Back to events</Link></div>;

    const isSoldOut = event.availableSeats <= 0;

    return (
        <Surface as="article" className="mx-auto max-w-6xl overflow-hidden">
            {event.image ? (
                <img src={event.image} alt={event.title} className="aspect-[16/7] max-h-[32rem] w-full object-cover object-center" />
            ) : (
                <div className="flex aspect-[16/7] max-h-[32rem] w-full items-center justify-center bg-brand-navy px-5 text-center font-display text-5xl uppercase tracking-wide text-brand-gold-light sm:text-7xl">
                    {event.category}
                </div>
            )}

            <div className="p-4 sm:p-7 lg:p-10">
                <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,24rem)]">
                    <div className="min-w-0">
                        <div className="mb-3 inline-block bg-brand-gold-light px-3 py-1 font-interface text-xs font-bold uppercase tracking-wide text-brand-navy">
                            {event.category}
                        </div>
                        <PageHeading className="break-words">{event.title}</PageHeading>
                        <p className="eh-body mt-5 max-w-3xl whitespace-pre-line text-text-secondary">{event.description}</p>
                    </div>

                    <aside className="min-w-0 w-full self-start border border-border bg-surface-muted p-4 sm:p-6">
                        <h2 className="eh-section-title mb-6 text-text-primary">Booking details</h2>

                        <div className="mb-8 space-y-4">
                            <div className="flex items-center gap-4 text-text-secondary">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-brand-navy">
                                    <FaMoneyBillWave aria-hidden="true" />
                                </div>
                                <div>
                                    <p className="font-interface text-xs font-bold uppercase tracking-wide text-text-muted">Ticket price</p>
                                    <p className="text-lg font-bold text-text-primary">{event.ticketPrice === 0 ? <span className="text-success">Free</span> : `₹${event.ticketPrice}`}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-text-secondary">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-brand-navy">
                                    <FaChair aria-hidden="true" />
                                </div>
                                <div>
                                    <p className="font-interface text-xs font-bold uppercase tracking-wide text-text-muted">Availability</p>
                                    <p className="font-bold text-text-primary">
                                        <span className={event.availableSeats < 10 ? 'text-warning' : ''}>{event.availableSeats}</span> / {event.totalSeats}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-text-secondary">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-brand-navy">
                                    <FaCalendarAlt aria-hidden="true" />
                                </div>
                                <div>
                                    <p className="font-interface text-xs font-bold uppercase tracking-wide text-text-muted">Date</p>
                                    <p className="font-bold text-text-primary">{new Date(event.date).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-text-secondary">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-brand-navy">
                                    <FaMapMarkerAlt aria-hidden="true" />
                                </div>
                                <div>
                                    <p className="font-interface text-xs font-bold uppercase tracking-wide text-text-muted">Location</p>
                                    <p className="font-bold text-text-primary break-words">{event.location}</p>
                                </div>
                            </div>
                        </div>

                        {user?.role === 'event_staff' ? (
                            <Feedback tone="info" className="border-x-0 border-b-0 px-0">Event Staff accounts can scan tickets for assigned events and cannot make bookings.</Feedback>
                        ) : (
                        <>
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
                                    className="eh-control"
                                />
                                <p id="ticket-quantity-help" className="eh-meta">Current available seats: {event.availableSeats}. Availability is checked again before booking.</p>
                                {quantityError && <Feedback tone="error" className="p-3">{quantityError}</Feedback>}
                                <div className="border border-border bg-surface p-3 text-sm text-text-secondary">
                                    <p>Unit price: <strong>{event.ticketPrice === 0 ? 'Free' : `${event.currency || 'INR'} ${event.ticketPrice}`}</strong></p>
                                    <p>Quantity: <strong>{quantity}</strong></p>
                                    <p>Estimated total: <strong>{event.ticketPrice === 0 ? 'Free' : `${event.currency || 'INR'} ${estimateBookingTotal(event.ticketPrice, quantity).toFixed(2)}`}</strong></p>
                                    <p className="mt-1 text-xs">Final total is calculated by the server. Free bookings confirm and receive tickets immediately; paid bookings require admin confirmation.</p>
                                </div>
                                <div className="space-y-3">
                                    {attendees.map((attendee, index) => (
                                        <fieldset key={index} className="grid gap-3 border border-border bg-surface p-3">
                                            <legend className="px-1 font-interface text-sm font-bold text-text-primary">Attendee {index + 1}</legend>
                                            <FormControl id={`attendee-${index}-name`} label="Full name *" type="text" required maxLength={120} value={attendee.name} disabled={showOTP} onChange={(e) => setAttendees((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: e.target.value } : item))} />
                                            <FormControl id={`attendee-${index}-email`} label="Email (optional)" type="email" maxLength={254} value={attendee.email} disabled={showOTP} onChange={(e) => setAttendees((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, email: e.target.value } : item))} />
                                        </fieldset>
                                    ))}
                                </div>
                            </div>

                        {showOTP && (
                            <div className="mb-4">
                                <FormControl
                                    id="booking-otp"
                                    label="Enter OTP to confirm"
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    required
                                    placeholder="6-digit code"
                                    className="text-center font-bold tracking-widest"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    maxLength="6"
                                />
                            </div>
                        )}

                        <Button
                            type="button"
                            onClick={handleBooking}
                            disabled={isSoldOut || bookingLoading || (showOTP && !otp)}
                            loading={bookingLoading}
                            loadingText="Processing..."
                            className={`w-full ${successMsg && !showOTP ? 'eh-button--muted' : ''}`}
                        >
                            {showOTP ? 'Verify OTP & Confirm' : (successMsg && !showOTP ? 'Request Sent' : (isSoldOut ? 'Sold Out' : 'Confirm Registration'))}
                        </Button>
                        {error && <Feedback tone="error" className="mt-4">{error}</Feedback>}
                        {successMsg && <Feedback tone="success" className="mt-4">{successMsg}</Feedback>}
                        </>
                        )}
                </aside>
                </div>
            </div>
        </Surface>
    );
};

export default EventDetail;
