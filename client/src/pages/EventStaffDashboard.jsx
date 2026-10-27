import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/axios';
import TicketScanner from '../components/TicketScanner';

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
        <section className="max-w-6xl mx-auto">
            <header className="rounded-2xl bg-gray-900 p-6 text-white sm:p-8">
                <h1 className="text-3xl font-extrabold">Event Staff Dashboard</h1>
                <p className="mt-2 text-gray-300">Event information for events assigned to your account.</p>
            </header>
            <TicketScanner />
            {error && <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}<button className="ml-3 font-bold underline" onClick={loadEvents}>Retry</button></div>}
            {loading ? <p className="py-12 text-center" role="status">Loading assigned events…</p> : events.length === 0 ? (
                <p className="mt-6 rounded-xl bg-white p-8 text-center text-gray-600">No events have been assigned to you yet.</p>
            ) : (
                <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {events.map((event) => <li key={event._id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                        <h2 className="text-xl font-bold text-gray-900">{event.title}</h2>
                        <p className="mt-2 text-sm text-gray-600">{new Date(event.date).toLocaleString()}</p>
                        <p className="text-sm text-gray-600">{event.location}</p>
                        <p className="mt-3 text-sm text-gray-700">{event.availableSeats} of {event.totalSeats} seats available</p>
                        {event.description && <p className="mt-3 line-clamp-3 text-sm text-gray-600">{event.description}</p>}
                        <Link to={`/events/${event._id}`} className="mt-4 inline-block font-semibold text-gray-900 underline">View public event page</Link>
                    </li>)}
                </ul>
            )}
        </section>
    );
};

export default EventStaffDashboard;
