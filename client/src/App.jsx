import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import EventDetail from './pages/EventDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailed from './pages/PaymentFailed';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import EventStaffDashboard from './pages/EventStaffDashboard';
import StaffManagement from './pages/StaffManagement';

const RequireAuth = ({ children, role }) => {
    const { user, loading } = useContext(AuthContext);
    const location = useLocation();

    if (loading) return <div className="text-center py-20" role="status">Checking your session...</div>;
    if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
    if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'event_staff' ? '/staff' : '/'} replace />;
    return children;
};

function App() {
    return (
        <Router>
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <Navbar />
                <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/events/:id" element={<EventDetail />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/dashboard" element={<RequireAuth role="user"><UserDashboard /></RequireAuth>} />
                        <Route path="/admin" element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>} />
                        <Route path="/admin/staff" element={<RequireAuth role="admin"><StaffManagement /></RequireAuth>} />
                        <Route path="/staff" element={<RequireAuth role="event_staff"><EventStaffDashboard /></RequireAuth>} />
                        <Route path="/payment-success" element={<PaymentSuccess />} />
                        <Route path="/payment-failed" element={<PaymentFailed />} />
                        <Route path="*" element={<h1 className="text-3xl font-bold text-center mt-20">404 - Page Not Found</h1>} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
