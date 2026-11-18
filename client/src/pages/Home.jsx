import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/axios';
import { FaCalendarAlt, FaMapMarkerAlt, FaTicketAlt } from 'react-icons/fa';
import Button from '../components/ui/Button';
import Feedback from '../components/ui/Feedback';
import FormControl from '../components/ui/FormControl';
import { PageHeading, Surface } from '../components/ui/LayoutPrimitives';

const Home = () => {
    const [events, setEvents] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchEvents = useCallback(async (searchTerm, signal) => {
        setLoading(true);
        setError('');
        try {
            const { data } = await api.get('/events', {
                params: { search: searchTerm },
                signal,
            });
            if (!Array.isArray(data)) {
                setEvents([]);
                setError('Events could not be loaded. Please try again.');
                return;
            }
            setEvents(data);
        } catch {
            if (!signal?.aborted) {
                setEvents([]);
                setError('Events could not be loaded. Please try again.');
            }
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            fetchEvents(search, controller.signal);
        }, 400); // 400ms debounce
        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [search, fetchEvents]);

    return (
        <div className="space-y-12 sm:space-y-16">
            <section className="relative isolate overflow-hidden bg-brand-navy text-white">
                <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[url('https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=3000&auto=format&fit=crop')] bg-cover bg-center" />
                <div aria-hidden="true" className="absolute inset-0 -z-10 bg-brand-navy/85" />
                <div className="grid min-h-[28rem] items-end gap-10 p-5 sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)] md:p-12 lg:p-16">
                    <div className="max-w-3xl">
                        <p className="mb-5 font-interface text-sm font-bold uppercase tracking-[0.18em] text-brand-gold-light">Find your next gathering</p>
                        <h1 className="font-display text-5xl leading-[0.95] text-white sm:text-6xl lg:text-7xl">
                            Make room for <span className="text-brand-gold-light">what moves you.</span>
                        </h1>
                        <p className="mt-6 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
                            Browse upcoming events, find the details that matter, and choose what you want to be part of.
                        </p>
                    </div>
                    <div className="border-l-2 border-brand-gold-light pl-5 md:justify-self-end md:max-w-sm">
                        <p className="mb-3 font-interface text-sm font-semibold uppercase tracking-wide text-white">Start exploring</p>
                        <FormControl id="event-search" label="Search events by title" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Try a title or keyword" className="bg-white" />
                        <p className="mt-3 text-sm text-white/75">Results update as you type.</p>
                    </div>
                </div>
            </section>

            <section aria-label="Using EventHub" className="grid gap-5 border-y border-border py-7 sm:grid-cols-3 sm:gap-7">
                <div><p className="font-interface text-xs font-bold uppercase tracking-[0.14em] text-brand-navy">01 / Discover</p><p className="mt-2 text-sm leading-relaxed text-text-secondary">Browse current listings and open an event for its details.</p></div>
                <div><p className="font-interface text-xs font-bold uppercase tracking-[0.14em] text-brand-navy">02 / Register</p><p className="mt-2 text-sm leading-relaxed text-text-secondary">Choose ticket quantity and provide attendee information on the event page.</p></div>
                <div><p className="font-interface text-xs font-bold uppercase tracking-[0.14em] text-brand-navy">03 / Keep track</p><p className="mt-2 text-sm leading-relaxed text-text-secondary">Review bookings and available ticket actions from your dashboard.</p></div>
            </section>

            <section aria-labelledby="events-heading">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
                <div><p className="mb-2 font-interface text-xs font-bold uppercase tracking-[0.16em] text-text-muted">The calendar</p><PageHeading id="events-heading" as="h2" className="eh-section-title">Upcoming events</PageHeading></div>
                <p className="text-sm font-medium text-text-secondary" aria-live="polite">{loading ? 'Searching…' : `${events.length} ${events.length === 1 ? 'event' : 'events'}`}</p>
            </div>

            {loading ? (
                <Feedback tone="loading">Loading events…</Feedback>
            ) : error ? (
                <div className="space-y-4"><Feedback tone="error">{error}</Feedback><Button type="button" onClick={() => fetchEvents(search)}>Try again</Button></div>
            ) : events.length === 0 ? (
                <Feedback tone="empty">No events found matching your search.</Feedback>
            ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
                    {events.map(event => (
                        <Surface as="article" key={event._id} className="group flex min-w-0 flex-col overflow-hidden transition-shadow duration-standard hover:shadow-panel">
                            <div className="relative aspect-[16/10] overflow-hidden bg-surface-muted">
                                {event.image ? (
                                    <img src={event.image} alt={event.title} className="h-full w-full object-cover transition-transform duration-standard group-hover:scale-[1.02]" />
                                ) : (
                                    <div className="flex h-full items-center justify-center bg-brand-navy px-4 text-center font-display text-4xl text-brand-gold-light">
                                        {event.category || 'Event'}
                                    </div>
                                )}
                                <span className="absolute bottom-3 left-3 bg-surface px-3 py-1 font-interface text-sm font-bold text-brand-navy">{event.ticketPrice === 0 ? 'Free' : `₹${event.ticketPrice}`}</span>
                            </div>
                            <div className="flex flex-1 flex-col p-5 sm:p-card">
                                <p className="mb-2 font-interface text-xs font-bold uppercase tracking-[0.12em] text-text-muted">{event.category || 'Event'}</p>
                                <h3 className="break-words text-xl font-bold leading-snug text-text-primary">{event.title}</h3>
                                <dl className="mt-4 space-y-2 text-sm text-text-secondary">
                                    <div className="flex min-w-0 items-start gap-2"><dt className="sr-only">Date</dt><FaCalendarAlt aria-hidden="true" className="mt-0.5 shrink-0 text-brand-navy" /><dd>{new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</dd></div>
                                    <div className="flex min-w-0 items-start gap-2"><dt className="sr-only">Location</dt><FaMapMarkerAlt aria-hidden="true" className="mt-0.5 shrink-0 text-brand-navy" /><dd className="break-words">{event.location}</dd></div>
                                </dl>
                                <p className="mt-3 text-sm text-text-muted">{event.availableSeats} seats remaining</p>
                                <Link to={`/events/${event._id}`} className="eh-button eh-button--outline mt-5 w-full">View event details</Link>
                            </div>
                        </Surface>
                    ))}
                </div>
            )}
            </section>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-sm text-text-muted">
                <span className="inline-flex items-center gap-2 font-interface font-bold text-brand-navy"><FaTicketAlt aria-hidden="true" /> EventHub</span>
                <span>© {new Date().getFullYear()} EventHub</span>
            </footer>
        </div>
    );
};

export default Home;
