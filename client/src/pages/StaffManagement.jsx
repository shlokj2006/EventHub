import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/axios';

const StaffManagement = () => {
    const [staff, setStaff] = useState([]);
    const [events, setEvents] = useState([]);
    const [email, setEmail] = useState('');
    const [selectedEvents, setSelectedEvents] = useState({});
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [staffResponse, eventResponse] = await Promise.all([api.get('/staff/admin'), api.get('/events')]);
            if (!Array.isArray(staffResponse.data) || !Array.isArray(eventResponse.data)) throw new Error('Unexpected response');
            setStaff(staffResponse.data);
            setEvents(eventResponse.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to load staff management data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void Promise.resolve().then(loadData); }, [loadData]);

    const designate = async (event) => {
        event.preventDefault();
        setBusyId('designate'); setError(''); setNotice('');
        try {
            const { data } = await api.post('/staff/admin', { email });
            setEmail('');
            setNotice(`Event staff access enabled for ${data.staff.email}. Their existing login was revoked; they need to sign in again.`);
            await loadData();
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to designate this account.');
        } finally { setBusyId(''); }
    };

    const assign = async (person) => {
        const eventId = selectedEvents[person._id];
        if (!eventId) return;
        setBusyId(person._id); setError(''); setNotice('');
        try { await api.post(`/staff/admin/${person._id}/events`, { eventId }); await loadData(); }
        catch (err) { setError(err.response?.data?.message || 'Unable to assign the event.'); }
        finally { setBusyId(''); }
    };

    const removeAssignment = async (person, event) => {
        setBusyId(person._id); setError(''); setNotice('');
        try { await api.delete(`/staff/admin/${person._id}/events/${event._id}`); await loadData(); }
        catch (err) { setError(err.response?.data?.message || 'Unable to remove the assignment.'); }
        finally { setBusyId(''); }
    };

    const revoke = async (person) => {
        if (!window.confirm(`Revoke event staff access for ${person.email}?`)) return;
        setBusyId(person._id); setError(''); setNotice('');
        try { await api.delete(`/staff/admin/${person._id}`); setNotice(`Event staff access revoked for ${person.email}.`); await loadData(); }
        catch (err) { setError(err.response?.data?.message || 'Unable to revoke staff access.'); }
        finally { setBusyId(''); }
    };

    return (
        <section className="max-w-5xl mx-auto">
            <Link to="/admin" className="font-semibold text-gray-700 underline">← Admin dashboard</Link>
            <h1 className="mt-4 text-3xl font-extrabold text-gray-900">Event Staff Management</h1>
            <p className="mt-2 text-gray-600">Designate an existing verified account, assign its event access, or revoke the role. Staff choose their password through the existing account recovery flow.</p>
            {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
            {notice && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-green-800">{notice}</p>}
            <form onSubmit={designate} className="mt-6 flex flex-col gap-3 rounded-xl bg-white p-5 shadow-sm sm:flex-row">
                <label className="sr-only" htmlFor="staff-email">Verified account email</label>
                <input id="staff-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Verified account email" className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-3" />
                <button disabled={busyId === 'designate'} className="rounded-lg bg-gray-900 px-5 py-3 font-bold text-white disabled:opacity-50">Designate as staff</button>
            </form>
            <p className="mt-2 text-sm text-gray-500">Only existing verified user accounts can be designated. A staff member can use “Forgot password” to set a password known only to them.</p>
            {loading ? <p role="status" className="py-12 text-center">Loading staff…</p> : staff.length === 0 ? <p className="mt-6 rounded-xl bg-white p-8 text-center text-gray-600">No staff accounts yet.</p> : (
                <ul className="mt-6 space-y-4">{staff.map((person) => <li key={person._id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div><h2 className="font-bold text-gray-900">{person.name}</h2><p className="text-sm text-gray-600">{person.email}</p></div>
                        <button disabled={busyId === person._id} onClick={() => revoke(person)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Revoke staff access</button>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <label className="sr-only" htmlFor={`event-${person._id}`}>Event to assign to {person.name}</label>
                        <select id={`event-${person._id}`} value={selectedEvents[person._id] || ''} onChange={(e) => setSelectedEvents((current) => ({ ...current, [person._id]: e.target.value }))} className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2">
                            <option value="">Choose an event to assign</option>
                            {events.map((event) => <option key={event._id} value={event._id}>{event.title}</option>)}
                        </select>
                        <button disabled={!selectedEvents[person._id] || busyId === person._id} onClick={() => assign(person)} className="rounded-lg bg-gray-800 px-4 py-2 font-semibold text-white disabled:opacity-50">Assign event</button>
                    </div>
                    <ul className="mt-3 divide-y divide-gray-100">{person.events.map((event) => <li key={event._id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><span>{event.title} · {new Date(event.date).toLocaleDateString()}</span><button disabled={busyId === person._id} onClick={() => removeAssignment(person, event)} className="font-semibold text-red-700 underline disabled:opacity-50">Remove assignment</button></li>)}</ul>
                </li>)}</ul>
            )}
        </section>
    );
};

export default StaffManagement;
