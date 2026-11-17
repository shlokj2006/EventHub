import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/axios';
import TicketScanner from '../components/TicketScanner';
import Button from '../components/ui/Button';
import Feedback from '../components/ui/Feedback';
import { PageHeading, Surface } from '../components/ui/LayoutPrimitives';

const EventStaffDashboard = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadEvents = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await api.get('/staff/events');
            if (!Array.isArray(data)) throw new Error('Unexpected events response');
            setEvents(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to load your assigned events.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void Promise.resolve().then(loadEvents); }, [loadEvents]);

    return (
        <section className="mx-auto max-w-6xl space-y-7">
            <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-2 font-interface text-xs font-bold uppercase tracking-[0.15em] text-brand-navy">Event operations</p>
                    <PageHeading>Event Staff Dashboard</PageHeading>
                    <p className="mt-3 max-w-2xl text-text-secondary">Review events assigned to your account and check guests in by scanning their ticket QR codes.</p>
                </div>
                <a href="#ticket-scanner-heading" className="eh-button eh-button--secondary self-start sm:self-auto">Open ticket scanner</a>
            </header>

            <TicketScanner />

            <section aria-labelledby="assigned-events-heading" className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
                    <div>
                        <p className="mb-1 font-interface text-xs font-bold uppercase tracking-wide text-text-muted">Your schedule</p>
                        <h2 id="assigned-events-heading" className="eh-section-title">Assigned events <span className="text-base font-semibold text-text-muted">({events.length})</span></h2>
                    </div>
                    {loading && events.length > 0 && <span role="status" className="text-sm text-text-secondary">Refreshing…</span>}
                </div>

                {error && <div className="space-y-3"><Feedback tone="error">{error}</Feedback><Button type="button" variant="outline" onClick={loadEvents}>Retry loading events</Button></div>}
                {loading ? <Feedback tone="loading">Loading assigned events…</Feedback> : events.length === 0 && !error ? (
                    <Surface className="p-6 sm:p-8"><Feedback tone="empty">No events have been assigned to you yet.</Feedback></Surface>
                ) : events.length > 0 && (
                    <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {events.map((event) => (
                            <Surface as="li" key={event._id} className="flex min-w-0 flex-col p-5 sm:p-6">
                                <p className="font-interface text-xs font-bold uppercase tracking-wide text-text-muted">Assigned event</p>
                                <h3 className="mt-2 break-words font-interface text-xl font-bold leading-snug text-text-primary">{event.title}</h3>
                                <dl className="mt-4 space-y-3 text-sm">
                                    <div><dt className="font-semibold text-text-muted">Date and time</dt><dd className="mt-1 text-text-secondary">{new Date(event.date).toLocaleString()}</dd></div>
                                    <div><dt className="font-semibold text-text-muted">Location</dt><dd className="mt-1 break-words text-text-secondary">{event.location}</dd></div>
                                    <div><dt className="font-semibold text-text-muted">Availability</dt><dd className="mt-1 text-text-secondary">{event.availableSeats} of {event.totalSeats} seats</dd></div>
                                </dl>
                                {event.description && <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-text-secondary">{event.description}</p>}
                                <Link to={`/events/${event._id}`} className="eh-button eh-button--outline mt-5 w-full">View public event page</Link>
                            </Surface>
                        ))}
                    </ul>
                )}
            </section>
        </section>
    );
};

export default EventStaffDashboard;
