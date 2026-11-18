import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/axios';
import { Link, useNavigate } from 'react-router-dom';
import { FaCalendarAlt, FaMapMarkerAlt, FaTicketAlt, FaTimesCircle } from 'react-icons/fa';
import Button from '../components/ui/Button';
import Feedback from '../components/ui/Feedback';
import { PageHeading, Surface } from '../components/ui/LayoutPrimitives';

const UserDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [downloadingTicketId, setDownloadingTicketId] = useState('');
    const [cancellingBookingId, setCancellingBookingId] = useState('');
    const [actionFeedback, setActionFeedback] = useState(null);

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const { data } = await api.get('/bookings/my');
            if (!Array.isArray(data)) throw new Error('Unexpected bookings response');
            setBookings(data);
        } catch (error) {
            if (error.code === 'ERR_CANCELED') return;
            setLoadError(error.response?.data?.message || 'Unable to load your bookings.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        void Promise.resolve().then(fetchBookings);
    }, [user, navigate, fetchBookings]);

    const cancelBooking = async (id) => {
        if (!window.confirm('Are you sure you want to cancel this booking request?')) return;
        setCancellingBookingId(id);
        setActionFeedback(null);
        try {
            await api.delete(`/bookings/${id}`);
            setActionFeedback({ tone: 'success', message: 'Booking cancelled successfully.' });
            void fetchBookings();
        } catch (error) {
            setActionFeedback({ tone: 'error', message: error.response?.data?.message || 'Error cancelling booking' });
        } finally {
            setCancellingBookingId('');
        }
    };

    const downloadTicket = async (ticket) => {
        setDownloadingTicketId(ticket._id);
        try {
            const { data } = await api.get(`/tickets/${ticket._id}.pdf`, { responseType: 'blob' });
            const url = URL.createObjectURL(data);
            const link = document.createElement('a');
            link.href = url;
            link.download = `eventhub-ticket-${ticket._id}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch {
            setActionFeedback({ tone: 'error', message: 'Unable to download this ticket. Please try again.' });
        } finally {
            setDownloadingTicketId('');
        }
    };

    const upcomingBookings = bookings
        .filter((booking) => booking.status === 'confirmed' && booking.eventId && new Date(booking.eventDate || booking.eventId.date) > new Date())
        .sort((left, right) => new Date(left.eventDate || left.eventId.date) - new Date(right.eventDate || right.eventId.date))
        .slice(0, 3);

    if (loading && bookings.length === 0) return <Feedback tone="loading" className="my-8">Loading your bookings…</Feedback>;

    return (
        <div className="mx-auto max-w-6xl space-y-8">
            <section aria-labelledby="dashboard-heading" className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-2 font-interface text-xs font-bold uppercase tracking-[0.15em] text-brand-navy">Your account</p>
                    <PageHeading id="dashboard-heading">Welcome, {user?.name}.</PageHeading>
                    {user?.email && <p className="mt-2 text-text-secondary">{user.email}</p>}
                </div>
                <Link to="/" className="eh-button eh-button--outline self-start sm:self-auto">Explore events</Link>
            </section>

            {actionFeedback && <Feedback tone={actionFeedback.tone}>{actionFeedback.message}</Feedback>}

            {upcomingBookings.length > 0 && (
                <section aria-labelledby="upcoming-events-heading" className="space-y-4">
                    <div>
                        <p className="mb-1 font-interface text-xs font-bold uppercase tracking-[0.12em] text-text-muted">On your calendar</p>
                        <h2 id="upcoming-events-heading" className="eh-section-title">Upcoming events</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {upcomingBookings.map((booking) => (
                            <Link key={booking._id} to={`/events/${booking.eventId._id}`} className="group min-w-0 border-l-4 border-brand-gold-muted bg-surface p-4 shadow-card transition-shadow hover:shadow-panel focus-visible:outline-brand-navy">
                                <span className="font-interface text-xs font-bold uppercase tracking-wide text-text-muted">{new Date(booking.eventDate || booking.eventId.date).toLocaleDateString()}</span>
                                <h3 className="mt-2 break-words font-interface text-lg font-bold text-text-primary group-hover:text-brand-navy">{booking.eventTitle || booking.eventId.title}</h3>
                                {booking.eventId.location && <p className="mt-2 flex min-w-0 items-start gap-2 text-sm text-text-secondary"><FaMapMarkerAlt aria-hidden="true" className="mt-1 shrink-0 text-brand-navy" /><span className="break-words">{booking.eventId.location}</span></p>}
                                <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-navy"><FaCalendarAlt aria-hidden="true" />View event</span>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            <section aria-labelledby="bookings-heading" className="space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
                    <div>
                        <p className="mb-1 font-interface text-xs font-bold uppercase tracking-[0.12em] text-text-muted">Your activity</p>
                        <h2 id="bookings-heading" className="eh-section-title">Bookings <span className="text-base font-semibold text-text-muted">({bookings.length})</span></h2>
                    </div>
                    {loading && bookings.length > 0 && <span role="status" className="text-sm text-text-secondary">Refreshing bookings…</span>}
                </div>

                {loadError && (
                    <div className="space-y-3">
                        <Feedback tone="error">{loadError}</Feedback>
                        <Button type="button" variant="outline" onClick={fetchBookings}>Retry loading bookings</Button>
                    </div>
                )}

                {bookings.length === 0 && !loadError ? (
                    <Surface className="flex flex-col items-start gap-4 p-6 sm:p-8">
                        <div className="flex h-12 w-12 items-center justify-center bg-brand-gold-light text-brand-navy" aria-hidden="true"><FaTicketAlt className="text-xl" /></div>
                        <div>
                            <h3 className="font-interface text-xl font-bold text-text-primary">No bookings yet</h3>
                            <p className="mt-2 max-w-prose text-text-secondary">Your event bookings and tickets will appear here.</p>
                        </div>
                        <Link to="/" className="eh-button eh-button--primary">Browse events</Link>
                    </Surface>
                ) : bookings.length > 0 && (
                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                        {bookings.map((booking) => {
                            const activeTickets = (booking.tickets || []).filter((ticket) => ticket.status === 'active');
                            const statusClass = booking.status === 'confirmed'
                                ? 'bg-success-surface text-success'
                                : booking.status === 'cancelled'
                                    ? 'bg-error-surface text-error'
                                    : 'bg-warning-surface text-warning';

                            return (
                                <Surface as="article" key={booking._id} className="flex min-w-0 flex-col overflow-hidden">
                                    <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                                        <div className="min-w-0">
                                            <p className="mb-2 font-interface text-xs font-bold uppercase tracking-wide text-text-muted">Event</p>
                                            {booking.eventId ? (
                                                <h3 className="break-words font-interface text-xl font-bold leading-snug text-text-primary">{booking.eventTitle || booking.eventId.title}</h3>
                                            ) : (
                                                <p className="text-text-secondary">Event details unavailable (might have been deleted)</p>
                                            )}
                                        </div>
                                        <div className="flex shrink-0 flex-wrap gap-2 sm:max-w-48 sm:justify-end">
                                            <span className={`inline-flex min-h-7 items-center px-2 py-1 font-interface text-xs font-bold uppercase tracking-wide ${statusClass}`}>{booking.status}</span>
                                            <span className={`inline-flex min-h-7 items-center px-2 py-1 font-interface text-xs font-bold uppercase tracking-wide ${booking.paymentStatus === 'paid' ? 'bg-info-surface text-info' : 'bg-surface-muted text-text-secondary'}`}>
                                                Payment: {String(booking.paymentStatus || 'not_paid').replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
                                        {booking.eventId && (
                                            <dl className="grid min-w-0 grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                                                <div><dt className="font-semibold text-text-muted">Event date</dt><dd className="mt-1 text-text-primary">{new Date(booking.eventDate || booking.eventId.date).toLocaleDateString()}</dd></div>
                                                <div><dt className="font-semibold text-text-muted">Amount</dt><dd className="mt-1 font-semibold text-text-primary">{booking.amount === 0 ? 'Free' : `₹${booking.amount}`}</dd></div>
                                                <div><dt className="font-semibold text-text-muted">Requested</dt><dd className="mt-1 text-text-primary">{new Date(booking.bookedAt).toLocaleDateString()}</dd></div>
                                                <div><dt className="font-semibold text-text-muted">Quantity</dt><dd className="mt-1 text-text-primary">{booking.quantity || 1}</dd></div>
                                                <div className="min-w-0"><dt className="font-semibold text-text-muted">Booking reference</dt><dd className="mt-1 break-all font-mono text-text-primary">{booking.bookingReference || 'Legacy booking'}</dd></div>
                                                <div><dt className="font-semibold text-text-muted">Active tickets</dt><dd className="mt-1 text-text-primary">{booking.status === 'confirmed' ? activeTickets.length : 0}</dd></div>
                                            </dl>
                                        )}

                                        {(booking.attendees || []).length > 0 && (
                                            <section aria-label="Attendees" className="border-t border-border pt-4">
                                                <h4 className="mb-2 font-interface text-sm font-bold text-text-primary">Attendees</h4>
                                                <ul className="space-y-1 text-sm text-text-secondary">
                                                    {booking.attendees.map((attendee, index) => <li key={`${booking._id}-attendee-${index}`} className="break-words">{attendee.name}{attendee.email ? ` · ${attendee.email}` : ''}</li>)}
                                                </ul>
                                            </section>
                                        )}

                                        {activeTickets.length > 0 && (
                                            <section aria-label="Active tickets" className="border-t border-border pt-4">
                                                <h4 className="mb-3 font-interface text-sm font-bold text-text-primary">Tickets</h4>
                                                <ul className="space-y-3">
                                                    {activeTickets.map((ticket) => (
                                                        <li key={ticket._id} className="flex min-w-0 flex-col gap-3 bg-surface-muted p-3 sm:flex-row sm:items-center sm:justify-between">
                                                            <div className="min-w-0 text-sm">
                                                                <p className="font-semibold text-text-primary">{ticket.attendee?.name}</p>
                                                                <p className="mt-1 break-all font-mono text-xs text-text-secondary">{ticket.ticketReference}</p>
                                                            </div>
                                                            <Button type="button" variant="outline" className="w-full shrink-0 sm:w-auto" onClick={() => downloadTicket(ticket)} disabled={downloadingTicketId === ticket._id} loading={downloadingTicketId === ticket._id} loadingText="Preparing PDF…">
                                                                Download PDF
                                                            </Button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </section>
                                        )}

                                        {booking.amount > 0 && <Feedback tone="info" className="text-sm">Payment status is admin-recorded and is not gateway-verified.</Feedback>}
                                    </div>

                                    <div className="flex flex-col gap-3 border-t border-border bg-surface-muted p-4 sm:flex-row sm:items-center sm:justify-between">
                                        {booking.eventId && ['pending', 'confirmed'].includes(booking.status) ? (
                                            <>
                                                <Link to={`/events/${booking.eventId._id}`} className="inline-flex min-h-11 items-center font-semibold text-brand-navy underline underline-offset-4">View event</Link>
                                                {user?.role !== 'event_staff' && (
                                                    <Button type="button" variant="destructive" className="w-full sm:w-auto" onClick={() => cancelBooking(booking._id)} disabled={cancellingBookingId === booking._id} loading={cancellingBookingId === booking._id} loadingText="Cancelling…">
                                                        <FaTimesCircle aria-hidden="true" /> Cancel booking
                                                    </Button>
                                                )}
                                            </>
                                        ) : (
                                            <p className="text-sm italic text-text-secondary">Booking cancelled</p>
                                        )}
                                    </div>
                                </Surface>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
};

export default UserDashboard;
