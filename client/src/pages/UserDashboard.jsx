import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/axios';
import { Link, useNavigate } from 'react-router-dom';
import { FaTicketAlt, FaTimesCircle } from 'react-icons/fa';

const UserDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [downloadingTicketId, setDownloadingTicketId] = useState('');

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
        if (window.confirm('Are you sure you want to cancel this booking request?')) {
            try {
                await api.delete(`/bookings/${id}`);
                fetchBookings();
            } catch (error) {
                alert(error.response?.data?.message || 'Error cancelling booking');
            }
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
            alert('Unable to download this ticket. Please try again.');
        } finally {
            setDownloadingTicketId('');
        }
    };

    const upcomingBookings = bookings
        .filter((booking) => booking.status === 'confirmed' && booking.eventId && new Date(booking.eventDate || booking.eventId.date) > new Date())
        .sort((left, right) => new Date(left.eventDate || left.eventId.date) - new Date(right.eventDate || right.eventId.date))
        .slice(0, 3);

    if (loading && bookings.length === 0) return <div className="text-center py-20 text-xl font-semibold" role="status">Loading dashboard...</div>;

    return (
        <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 mb-8 border border-gray-100 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6">
                <div className="w-20 h-20 bg-gray-200 text-gray-900 rounded-full flex items-center justify-center text-3xl font-bold uppercase tracking-widest shrink-0">
                    {user?.name.charAt(0)}
                </div>
                <div className="flex flex-col items-center sm:items-start">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">Welcome, {user?.name}!</h1>
                    <p className="text-gray-500 flex items-center justify-center sm:justify-start gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span> User Dashboard
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2 sm:gap-3">
                    <FaTicketAlt className="text-gray-700" /> My Bookings requests
                </h2>
                {loading && bookings.length > 0 && <span role="status" className="text-sm text-gray-500">Refreshing...</span>}
            </div>

            {upcomingBookings.length > 0 && (
                <section aria-labelledby="upcoming-events-heading" className="mb-8">
                    <h2 id="upcoming-events-heading" className="text-xl font-bold text-gray-800 mb-4">Upcoming events</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {upcomingBookings.map((booking) => (
                            <Link key={booking._id} to={`/events/${booking.eventId._id}`} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-700">
                                <span className="text-xs font-bold uppercase text-gray-500">{new Date(booking.eventDate || booking.eventId.date).toLocaleDateString()}</span>
                                <h3 className="mt-1 font-bold text-gray-900">{booking.eventTitle || booking.eventId.title}</h3>
                                <span className="mt-2 inline-block text-sm text-gray-600">View event</span>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {loadError && (
                <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                    <p>{loadError}</p>
                    <button type="button" onClick={fetchBookings} className="mt-2 font-bold underline">Retry loading bookings</button>
                </div>
            )}

            {bookings.length === 0 ? (!loadError && (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaTicketAlt className="text-gray-300 text-3xl" />
                    </div>
                    <p className="text-xl text-gray-500 mb-6 mt-4 font-medium">You haven't booked any events yet.</p>
                    <Link to="/" className="inline-block bg-gray-900 hover:bg-black text-white font-bold py-3 px-8 rounded-lg transition shadow-md">
                        Browse Events
                    </Link>
                </div>
            )) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bookings.map((booking) => (
                        <div key={booking._id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition border border-gray-100 flex flex-col">
                            <div className="p-6 border-b border-gray-50 flex-grow">
                                {booking.eventId ? (
                                    <>
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-lg font-bold text-gray-900 leading-tight">{booking.eventTitle || booking.eventId.title}</h3>
                                            <div className="flex flex-col gap-1 items-end">
                                                <span className={`px-2 py-1 text-[10px] font-black rounded uppercase tracking-wider ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                                    booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {booking.status}
                                                </span>
                                                <span className={`px-2 py-1 text-[10px] font-black rounded uppercase tracking-wider ${booking.paymentStatus === 'paid' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                                        }`}>
                                                    Payment: {String(booking.paymentStatus || 'not_paid').replace('_', ' ')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-500 mb-4 space-y-1">
                                            <p><strong className="text-gray-700">Date:</strong> {new Date(booking.eventDate || booking.eventId.date).toLocaleDateString()}</p>
                                            <p><strong className="text-gray-700">Amount:</strong> {booking.amount === 0 ? 'Free' : `₹${booking.amount}`}</p>
                                            <p><strong className="text-gray-700">Requested:</strong> {new Date(booking.bookedAt).toLocaleDateString()}</p>
                                            <p><strong className="text-gray-700">Booking reference:</strong> <span className="font-mono">{booking.bookingReference || 'Legacy booking'}</span></p>
                                            <p><strong className="text-gray-700">Quantity:</strong> {booking.quantity || 1}</p>
                                            <p><strong className="text-gray-700">Issued tickets:</strong> {booking.status === 'confirmed' ? (booking.tickets || []).filter(ticket => ticket.status === 'active').length : 0}</p>
                                            {(booking.attendees || []).length > 0 && (
                                                <div className="border-t border-gray-100 pt-2 mt-2">
                                                    <p><strong className="text-gray-700">Attendees:</strong></p>
                                                    <ul className="list-disc pl-5">
                                                        {booking.attendees.map((attendee, index) => <li key={`${booking._id}-attendee-${index}`}>{attendee.name}{attendee.email ? ` · ${attendee.email}` : ''}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                            {booking.status === 'confirmed' && booking.tickets?.some(ticket => ticket.status === 'active') && (
                                                <div className="border-t border-gray-100 pt-2 mt-2">
                                                    <p><strong className="text-gray-700">Issued ticket references:</strong></p>
                                                    <ul className="space-y-2">
                                                        {booking.tickets.filter(ticket => ticket.status === 'active').map(ticket => (
                                                            <li key={ticket._id} className="break-words">
                                                                <div>{ticket.attendee?.name}: <span className="font-mono break-all">{ticket.ticketReference}</span></div>
                                                                <button type="button" onClick={() => downloadTicket(ticket)} disabled={downloadingTicketId === ticket._id} className="mt-1 font-semibold text-gray-900 underline disabled:opacity-50">
                                                                    {downloadingTicketId === ticket._id ? 'Preparing PDF…' : 'Download PDF ticket'}
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {booking.amount > 0 && <p className="mt-2 text-xs text-gray-500">Payment status is admin-recorded and is not gateway-verified.</p>}
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-red-500 italic">Event details unavailable (might have been deleted)</p>
                                )}
                            </div>
                            <div className="p-4 bg-gray-50 flex justify-between items-center shrink-0">
                                {booking.eventId && ['pending', 'confirmed'].includes(booking.status) ? (
                                    <>
                                        <Link to={`/events/${booking.eventId._id}`} className="text-gray-900 font-semibold text-sm hover:underline">View Event</Link>
                                        {user?.role !== 'event_staff' && (
                                            <button
                                                onClick={() => cancelBooking(booking._id)}
                                                className="text-red-500 font-semibold text-sm hover:text-red-700 transition flex items-center gap-1"
                                            >
                                                <FaTimesCircle /> Cancel
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div className="w-full text-center text-sm text-gray-500 italic">Booking Cancelled</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default UserDashboard;
