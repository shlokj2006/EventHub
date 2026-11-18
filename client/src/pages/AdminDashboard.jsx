import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/axios';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Feedback from '../components/ui/Feedback';
import FormControl from '../components/ui/FormControl';
import { PageHeading, Surface } from '../components/ui/LayoutPrimitives';

const AdminDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [eventsLoading, setEventsLoading] = useState(true);
    const [bookingsLoading, setBookingsLoading] = useState(true);
    const [eventsError, setEventsError] = useState('');
    const [bookingsError, setBookingsError] = useState('');
    const [approvingBookingId, setApprovingBookingId] = useState(null);
    const [editingEventId, setEditingEventId] = useState(null);
    const [eventNotice, setEventNotice] = useState('');
    const [eventNoticeError, setEventNoticeError] = useState(false);
    const [bookingNotice, setBookingNotice] = useState('');
    const [bookingNoticeError, setBookingNoticeError] = useState(false);
    const [cancellingBookingId, setCancellingBookingId] = useState(null);

    const [showEventForm, setShowEventForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '', description: '', date: '', location: '', category: '', totalSeats: '', ticketPrice: '', image: ''
    });

    const fetchData = useCallback(async () => {
        setEventsLoading(true);
        setBookingsLoading(true);
        setEventsError('');
        setBookingsError('');

        await Promise.all([
            api.get('/events')
                .then((response) => setEvents(response.data))
                .catch((error) => setEventsError(error?.response?.data?.message || 'Unable to load events.'))
                .finally(() => setEventsLoading(false)),
            api.get('/bookings/admin')
                .then((response) => setBookings(response.data))
                .catch((error) => setBookingsError(error?.response?.data?.message || 'Unable to load bookings.'))
                .finally(() => setBookingsLoading(false))
        ]);
    }, []);

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/login');
            return;
        }
        void Promise.resolve().then(fetchData);
    }, [user, navigate, fetchData]);

    const resetEventForm = () => {
        setShowEventForm(false);
        setEditingEventId(null);
        setFormData({ title: '', description: '', date: '', location: '', category: '', totalSeats: '', ticketPrice: '', image: '' });
    };

    const handleSaveEvent = async (e) => {
        e.preventDefault();
        try {
            if (editingEventId) {
                const editableFields = { ...formData };
                delete editableFields.totalSeats;
                await api.put(`/events/${editingEventId}`, editableFields);
                setEventNotice('Event updated successfully.');
            } else {
                await api.post('/events', formData);
                setEventNotice('Event created successfully.');
            }
            setEventNoticeError(false);
            resetEventForm();
            await fetchData();
        } catch (error) {
            setEventNotice(error.response?.data?.message || `Error ${editingEventId ? 'updating' : 'creating'} event.`);
            setEventNoticeError(true);
        }
    };

    const handleEditEvent = (event) => {
        setEditingEventId(event._id);
        setFormData({
            title: event.title || '', description: event.description || '',
            date: new Date(event.date).toISOString().slice(0, 10), location: event.location || '',
            category: event.category || '', totalSeats: event.totalSeats ?? '',
            ticketPrice: event.ticketPrice ?? '', image: event.image || '',
        });
        setShowEventForm(true);
        setEventNotice('');
        setEventNoticeError(false);
    };

    const handleArchiveEvent = async (event) => {
        if (!window.confirm(`Archive “${event.title}”? It will disappear from public listings. Existing bookings and tickets will remain preserved.`)) return;
        try {
            await api.patch(`/events/${event._id}/archive`);
            setEventNotice('Event archived. Existing bookings and tickets are preserved.');
            setEventNoticeError(false);
            await fetchData();
        } catch (error) {
            setEventNotice(error.response?.data?.message || 'Unable to archive event.');
            setEventNoticeError(true);
        }
    };

    const handleRestoreEvent = async (event) => {
        try {
            await api.patch(`/events/${event._id}/restore`);
            setEventNotice('Event restored successfully.');
            setEventNoticeError(false);
            await fetchData();
        } catch (error) {
            setEventNotice(error.response?.data?.message || 'Unable to restore event.');
            setEventNoticeError(true);
        }
    };

    const handleDeleteEvent = async (id) => {
        if (window.confirm('Permanently delete this event? Events with any bookings must be archived instead.')) {
            try {
                await api.delete(`/events/${id}`);
                setEventNotice('Event permanently deleted.');
                setEventNoticeError(false);
                await fetchData();
            } catch (error) {
                setEventNotice(error.response?.data?.message || 'Unable to delete event. If it has bookings, archive it instead.');
                setEventNoticeError(true);
            }
        }
    };

    const handleConfirmBooking = async (id, paymentStatus) => {
        setApprovingBookingId(id);
        setBookingNotice('');
        try {
            await api.put(`/bookings/${id}/confirm`, { paymentStatus });
            setBookingNotice(paymentStatus === 'paid' ? 'Booking confirmed and marked paid.' : 'Booking confirmed and marked unpaid.');
            setBookingNoticeError(false);
            fetchData();
        } catch (error) {
            setBookingNotice(error.response?.data?.message || 'Error confirming booking');
            setBookingNoticeError(true);
        } finally {
            setApprovingBookingId(null);
        }
    };

    const handleCancelBooking = async (id) => {
        if (window.confirm('Cancel this user\'s booking request?')) {
            setCancellingBookingId(id);
            setBookingNotice('');
            try {
                await api.delete(`/bookings/${id}`);
                setBookingNotice('Booking cancelled successfully.');
                setBookingNoticeError(false);
                fetchData();
            } catch (error) {
                setBookingNotice(error.response?.data?.message || 'Error cancelling booking');
                setBookingNoticeError(true);
            } finally {
                setCancellingBookingId(null);
            }
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-8">
            <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-2 font-interface text-xs font-bold uppercase tracking-[0.15em] text-brand-navy">EventHub administration</p>
                    <PageHeading>Admin dashboard</PageHeading>
                    <p className="mt-2 text-text-secondary">Manage event listings and booking requests.</p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                    <Button type="button" variant="primary" className="w-full sm:w-auto" onClick={() => { if (showEventForm) resetEventForm(); else { setEditingEventId(null); setShowEventForm(true); } }}>
                        {showEventForm ? 'Cancel event form' : 'Create event'}
                    </Button>
                    <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => navigate('/admin/staff')}>Manage event staff</Button>
                </div>
            </header>

            {eventNotice && <Feedback tone={eventNoticeError ? 'error' : 'success'}>{eventNotice}</Feedback>}

            <section aria-label="Admin overview" className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Surface className="flex min-w-0 items-center justify-between gap-4 p-5">
                    <div className="min-w-0">
                        <p className="font-interface text-xs font-bold uppercase tracking-wide text-text-muted">Admin-recorded paid total</p>
                        <p className="mt-2 text-2xl font-bold text-success">{bookingsLoading || bookingsError ? '—' : `₹${bookings.reduce((sum, b) => b.paymentStatus === 'paid' && b.status === 'confirmed' ? sum + b.amount : sum, 0)}`}</p>
                    </div>
                    <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center bg-success-surface font-bold text-success">₹</span>
                </Surface>
                <Surface className="flex min-w-0 items-center justify-between gap-4 p-5">
                    <div className="min-w-0">
                        <p className="font-interface text-xs font-bold uppercase tracking-wide text-text-muted">Paid clients</p>
                        <p className="mt-2 text-2xl font-bold text-info">{bookingsLoading || bookingsError ? '—' : new Set(bookings.filter(b => b.paymentStatus === 'paid' && b.status === 'confirmed').map(b => b.userId?._id)).size}</p>
                    </div>
                    <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center bg-info-surface font-bold text-info">#</span>
                </Surface>
                <Surface className="flex min-w-0 items-center justify-between gap-4 p-5">
                    <div className="min-w-0">
                        <p className="font-interface text-xs font-bold uppercase tracking-wide text-text-muted">Pending requests</p>
                        <p className="mt-2 text-2xl font-bold text-warning">{bookingsLoading || bookingsError ? '—' : bookings.filter(b => b.status === 'pending').length}</p>
                    </div>
                    <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center bg-warning-surface font-bold text-warning">…</span>
                </Surface>
            </section>

            {showEventForm && (
                <Surface as="section" aria-labelledby="event-form-heading" className="p-5 sm:p-7">
                    <div className="mb-6 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="mb-1 font-interface text-xs font-bold uppercase tracking-wide text-text-muted">Event management</p>
                            <h2 id="event-form-heading" className="eh-section-title">{editingEventId ? 'Edit event' : 'Create event'}</h2>
                        </div>
                        {editingEventId && <p className="text-sm text-text-secondary">Seat capacity is not editable here.</p>}
                    </div>
                    <form onSubmit={handleSaveEvent} className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <FormControl id="event-title" label="Event title" required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        <FormControl id="event-category" label="Category" required type="text" placeholder="e.g., Tech, Music" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                        <FormControl id="event-date" label="Date" required type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                        <FormControl id="event-location" label="Location" required type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                        {!editingEventId && <FormControl id="event-total-seats" label="Total seats" required type="number" value={formData.totalSeats} onChange={e => setFormData({ ...formData, totalSeats: e.target.value })} />}
                        <FormControl id="event-ticket-price" label="Ticket price (0 for free)" required type="number" value={formData.ticketPrice} onChange={e => setFormData({ ...formData, ticketPrice: e.target.value })} />
                        <div className="md:col-span-2">
                            <FormControl id="event-image" label="Image URL (optional)" type="text" helpText="Enter a direct link to an event image." value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} />
                        </div>
                        <div className="md:col-span-2">
                            <FormControl as="textarea" id="event-description" label="Event description" required className="min-h-32" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row md:col-span-2">
                            <Button type="submit">{editingEventId ? 'Save changes' : 'Publish event'}</Button>
                            <Button type="button" variant="outline" onClick={resetEventForm}>Cancel</Button>
                        </div>
                    </form>
                </Surface>
            )}

            {bookingNotice && <Feedback tone={bookingNoticeError ? 'error' : 'success'}>{bookingNotice}</Feedback>}

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
                <section aria-labelledby="events-heading" className="min-w-0 space-y-4">
                    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
                        <div>
                            <p className="mb-1 font-interface text-xs font-bold uppercase tracking-wide text-text-muted">Listings</p>
                            <h2 id="events-heading" className="eh-section-title">Events <span className="text-base font-semibold text-text-muted">({events.length})</span></h2>
                        </div>
                        {eventsLoading && events.length > 0 && <span role="status" className="text-sm text-text-secondary">Refreshing…</span>}
                    </div>
                    {eventsError && <div className="space-y-3"><Feedback tone="error">{eventsError}</Feedback><Button type="button" variant="outline" onClick={fetchData}>Retry events</Button></div>}
                    <Surface className="overflow-hidden p-0">
                        <ul className="max-h-[700px] divide-y divide-border overflow-y-auto">
                            {eventsLoading && events.length === 0 ? <li className="p-6"><Feedback tone="loading">Loading events…</Feedback></li> : events.length === 0 && !eventsError ? <li className="p-6"><Feedback tone="empty">No events created yet.</Feedback></li> :
                                events.map(event => (
                                    <li key={event._id} className="flex min-w-0 flex-col gap-4 p-5 transition-colors hover:bg-surface-muted sm:p-6">
                                        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0">
                                                <h3 className="break-words font-interface text-lg font-bold leading-snug text-text-primary">{event.title}</h3>
                                                <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-secondary">
                                                    <div><dt className="sr-only">Date</dt><dd>{new Date(event.date).toLocaleDateString()}</dd></div>
                                                    {event.category && <div><dt className="sr-only">Category</dt><dd>{event.category}</dd></div>}
                                                    {event.location && <div className="break-words"><dt className="sr-only">Location</dt><dd>{event.location}</dd></div>}
                                                </dl>
                                            </div>
                                            <div className="flex shrink-0 flex-wrap gap-2">
                                                {event.isArchived && <span className="inline-flex min-h-8 items-center bg-surface-muted px-2 text-xs font-bold uppercase text-text-secondary">Archived</span>}
                                                <span className={`inline-flex min-h-8 items-center px-2 text-xs font-bold ${event.availableSeats > 0 ? 'bg-success-surface text-success' : 'bg-error-surface text-error'}`}>{event.availableSeats}/{event.totalSeats} seats</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {event.isArchived ? <>
                                                <Button type="button" variant="secondary" onClick={() => handleRestoreEvent(event)}>Restore</Button>
                                                <Link to={`/events/${event._id}`} className="eh-button eh-button--outline">View details</Link>
                                            </> : <>
                                                <Button type="button" variant="outline" onClick={() => handleEditEvent(event)}>Edit</Button>
                                                <Button type="button" variant="secondary" onClick={() => handleArchiveEvent(event)}>Archive</Button>
                                            </>}
                                            <Button type="button" variant="destructive" onClick={() => handleDeleteEvent(event._id)}>Delete</Button>
                                        </div>
                                    </li>
                                ))
                            }
                        </ul>
                    </Surface>
                </section>

                <section aria-labelledby="bookings-heading" className="min-w-0 space-y-4">
                    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
                        <div>
                            <p className="mb-1 font-interface text-xs font-bold uppercase tracking-wide text-text-muted">Reservations</p>
                            <h2 id="bookings-heading" className="eh-section-title">Booking requests <span className="text-base font-semibold text-text-muted">({bookings.length})</span></h2>
                        </div>
                        {bookingsLoading && bookings.length > 0 && <span role="status" className="text-sm text-text-secondary">Refreshing…</span>}
                    </div>
                    {bookingsError && <div className="space-y-3"><Feedback tone="error">{bookingsError}</Feedback><Button type="button" variant="outline" onClick={fetchData}>Retry bookings</Button></div>}
                    <Surface className="overflow-hidden p-0">
                        <ul className="max-h-[700px] divide-y divide-border overflow-y-auto">
                            {bookingsLoading && bookings.length === 0 ? <li className="p-6"><Feedback tone="loading">Loading bookings…</Feedback></li> : bookings.length === 0 && !bookingsError ? <li className="p-6"><Feedback tone="empty">No bookings yet.</Feedback></li> :
                                bookings.map(booking => (
                                    <li key={booking._id} className="min-w-0 p-5 sm:p-6">
                                        <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <h3 className="min-w-0 break-words font-interface text-lg font-bold leading-snug text-text-primary">{booking.eventTitle || booking.eventId?.title || 'Deleted Event'}</h3>
                                            <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                                                <span className={`inline-flex min-h-7 items-center px-2 text-xs font-bold uppercase tracking-wide ${booking.status === 'confirmed' ? 'bg-success-surface text-success' : booking.status === 'cancelled' ? 'bg-error-surface text-error' : 'bg-warning-surface text-warning'}`}>{booking.status}</span>
                                                {booking.status !== 'cancelled' && <span className={`inline-flex min-h-7 items-center px-2 text-xs font-bold uppercase tracking-wide ${booking.paymentStatus === 'paid' ? 'bg-info-surface text-info' : 'bg-surface-muted text-text-secondary'}`}>{booking.paymentStatus.replace('_', ' ')}</span>}
                                            </div>
                                        </div>

                                        <dl className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 border-y border-border bg-surface-muted p-4 text-sm sm:grid-cols-2">
                                            <div className="min-w-0"><dt className="font-semibold text-text-muted">User</dt><dd className="mt-1 break-words font-semibold text-text-primary">{booking.userId?.name}</dd><dd className="break-all text-text-secondary">{booking.userId?.email}</dd></div>
                                            <div><dt className="font-semibold text-text-muted">Amount</dt><dd className="mt-1 font-semibold text-text-primary">{booking.amount === 0 ? 'Free' : `₹${booking.amount}`}</dd></div>
                                            <div><dt className="font-semibold text-text-muted">Requested</dt><dd className="mt-1 text-text-primary">{new Date(booking.bookedAt).toLocaleString()}</dd></div>
                                            <div><dt className="font-semibold text-text-muted">Tickets</dt><dd className="mt-1 text-text-primary">{booking.quantity || 1}</dd></div>
                                            {booking.eventId && <div><dt className="font-semibold text-text-muted">Available seats</dt><dd className="mt-1 text-text-primary">{booking.eventId.availableSeats} remaining of {booking.eventId.totalSeats}</dd></div>}
                                        </dl>

                                        {(booking.attendees || []).length > 0 && (
                                            <div className="mt-4">
                                                <h4 className="mb-2 font-interface text-sm font-bold text-text-primary">Attendees</h4>
                                                <ul className="space-y-1 text-sm text-text-secondary">
                                                    {booking.attendees.map((attendee, index) => <li key={`${booking._id}-attendee-${index}`} className="break-words">{index + 1}. {attendee.name}{attendee.email ? ` · ${attendee.email}` : ''}</li>)}
                                                </ul>
                                            </div>
                                        )}

                                        {booking.status === 'confirmed' && booking.tickets?.length > 0 && (
                                            <div className="mt-4 border-t border-border pt-4">
                                                <h4 className="mb-2 font-interface text-sm font-bold text-text-primary">Issued ticket references</h4>
                                                <ul className="space-y-2 text-sm">
                                                    {booking.tickets.map(ticket => <li key={ticket._id} className="break-all text-text-secondary">{ticket.attendee?.name}: <span className="font-mono">{ticket.ticketReference}</span></li>)}
                                                </ul>
                                            </div>
                                        )}

                                        {booking.status === 'pending' && booking.amount > 0 && (
                                            <div className="mt-4 space-y-3 border-t border-border pt-4">
                                                <Feedback tone="info" className="text-sm">Choose an admin-recorded status. Paid does not mean gateway verification.</Feedback>
                                                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                                    <Button type="button" variant="secondary" title="Confirm and record as paid" disabled={approvingBookingId === booking._id} onClick={() => handleConfirmBooking(booking._id, 'paid')}>Confirm + mark paid</Button>
                                                    <Button type="button" variant="outline" disabled={approvingBookingId === booking._id} onClick={() => handleConfirmBooking(booking._id, 'not_paid')}>Confirm + mark unpaid</Button>
                                                    <Button type="button" variant="destructive" disabled={cancellingBookingId === booking._id} loading={cancellingBookingId === booking._id} loadingText="Rejecting…" onClick={() => handleCancelBooking(booking._id)}>Reject</Button>
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                ))
                            }
                        </ul>
                    </Surface>
                </section>
            </div>
        </div>
    );
};

export default AdminDashboard;
