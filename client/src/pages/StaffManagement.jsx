import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/axios';
import Button from '../components/ui/Button';
import Feedback from '../components/ui/Feedback';
import FormControl from '../components/ui/FormControl';
import { PageHeading, Surface } from '../components/ui/LayoutPrimitives';

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

    const createStaff = async (event) => {
        event.preventDefault();
        setBusyId('create-staff'); setError(''); setNotice('');
        try {
            const { data } = await api.post('/staff/admin', { email });
            setEmail('');
            setNotice(data.message || `Staff account created for ${data.staff.email}. They must set a password through Forgot Password and verify the email before signing in.`);
            await loadData();
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to create this staff account.');
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
        <div className="mx-auto max-w-5xl space-y-6">
            <Link to="/admin" className="inline-flex min-h-11 items-center font-semibold text-brand-navy underline underline-offset-4">← Admin dashboard</Link>
            <header className="border-b border-border pb-5">
                <p className="mb-2 font-interface text-xs font-bold uppercase tracking-[0.15em] text-brand-navy">Administrator tools</p>
                <PageHeading>Event Staff Management</PageHeading>
                <p className="mt-3 max-w-3xl text-text-secondary">Create staff accounts, assign event access, or revoke the role. Staff set their own password through Forgot Password and verify their email before signing in.</p>
            </header>

            {error && <Feedback tone="error">{error}</Feedback>}
            {notice && <Feedback tone="success">{notice}</Feedback>}

            <Surface as="section" aria-labelledby="create-staff-heading" className="p-5 sm:p-6">
                <div className="mb-4">
                    <h2 id="create-staff-heading" className="eh-section-title">Create staff account</h2>
                    <p className="mt-2 text-sm text-text-secondary">Only new email addresses can be used. The account stays unverified until the staff member controls the inbox and completes email verification.</p>
                </div>
                <form onSubmit={createStaff} className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1">
                        <FormControl id="staff-email" label="New staff email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full sm:w-auto" disabled={busyId === 'create-staff'} loading={busyId === 'create-staff'} loadingText="Creating…">Create staff account</Button>
                </form>
            </Surface>

            <section aria-labelledby="staff-list-heading" className="space-y-4">
                <div className="flex items-end justify-between gap-3 border-b border-border pb-3">
                    <div>
                        <p className="mb-1 font-interface text-xs font-bold uppercase tracking-wide text-text-muted">Access and assignments</p>
                        <h2 id="staff-list-heading" className="eh-section-title">Staff accounts <span className="text-base font-semibold text-text-muted">({staff.length})</span></h2>
                    </div>
                </div>

                {loading ? <Feedback tone="loading" className="my-6">Loading staff accounts…</Feedback> : staff.length === 0 ? (
                    <Surface className="p-6 sm:p-8"><Feedback tone="empty">No staff accounts yet.</Feedback></Surface>
                ) : (
                    <ul className="space-y-4">
                        {staff.map((person) => (
                            <Surface as="li" key={person._id} className="min-w-0 p-5 sm:p-6">
                                <div className="flex min-w-0 flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                        <h3 className="break-words font-interface text-lg font-bold text-text-primary">{person.name}</h3>
                                        <p className="break-all text-sm text-text-secondary">{person.email}</p>
                                    </div>
                                    <Button type="button" variant="destructive" className="w-full shrink-0 sm:w-auto" disabled={busyId === person._id} onClick={() => revoke(person)}>Revoke staff access</Button>
                                </div>

                                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                                    <div className="min-w-0 flex-1">
                                        <FormControl as="select" id={`event-${person._id}`} label={`Assign event to ${person.name}`} value={selectedEvents[person._id] || ''} onChange={(e) => setSelectedEvents((current) => ({ ...current, [person._id]: e.target.value }))}>
                                            <option value="">Choose an event to assign</option>
                                            {events.map((event) => <option key={event._id} value={event._id}>{event.title}</option>)}
                                        </FormControl>
                                    </div>
                                    <Button type="button" className="w-full sm:w-auto" disabled={!selectedEvents[person._id] || busyId === person._id} onClick={() => assign(person)}>Assign event</Button>
                                </div>

                                <div className="mt-5 border-t border-border pt-4">
                                    <h4 className="mb-2 font-interface text-sm font-bold text-text-primary">Assigned events</h4>
                                    {person.events.length === 0 ? <p className="text-sm text-text-muted">No event assignments.</p> : (
                                        <ul className="divide-y divide-border">
                                            {person.events.map((event) => (
                                                <li key={event._id} className="flex min-w-0 flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                                                    <span className="min-w-0 break-words text-sm text-text-secondary">{event.title} · {new Date(event.date).toLocaleDateString()}</span>
                                                    <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={busyId === person._id} onClick={() => removeAssignment(person, event)}>Remove assignment</Button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </Surface>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
};

export default StaffManagement;
