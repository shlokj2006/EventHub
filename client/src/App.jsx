import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import PublicLayout from './layouts/PublicLayout';
import UserLayout from './layouts/UserLayout';
import AdminLayout from './layouts/AdminLayout';
import StaffLayout from './layouts/StaffLayout';
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
import NotFound from './pages/NotFound';
import About from './pages/About';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';

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
            <Routes>
                <Route element={<PublicLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/events/:id" element={<EventDetail />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/payment-success" element={<PaymentSuccess />} />
                    <Route path="/payment-failed" element={<PaymentFailed />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="*" element={<NotFound />} />
                </Route>
                <Route element={<RequireAuth role="user"><UserLayout /></RequireAuth>}>
                    <Route path="/dashboard" element={<UserDashboard />} />
                </Route>
                <Route element={<RequireAuth role="admin"><AdminLayout /></RequireAuth>}>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/staff" element={<StaffManagement />} />
                </Route>
                <Route element={<RequireAuth role="event_staff"><StaffLayout /></RequireAuth>}>
                    <Route path="/staff" element={<EventStaffDashboard />} />
                </Route>
            </Routes>
        </Router>
    );
}

export default App;
