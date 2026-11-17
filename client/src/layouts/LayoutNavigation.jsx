import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { FaTicketAlt } from 'react-icons/fa';
import Button from '../components/ui/Button';

const BrandLink = ({ className = '', onClick, to = '/' }) => (
    <Link to={to} onClick={onClick} className={`inline-flex min-h-11 items-center gap-2 font-bold text-brand-navy ${className}`.trim()}>
        <FaTicketAlt aria-hidden="true" className="text-xl" />
        <span className="text-xl">EventHub</span>
    </Link>
);

const MenuToggle = ({ className = '', controls, isOpen, onToggle }) => (
    <Button
        variant="outline"
        className={`lg:hidden min-w-20 shrink-0 ${className}`.trim()}
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isOpen}
        aria-controls={controls}
        onClick={onToggle}
    >
        {isOpen ? 'Close' : 'Menu'}
    </Button>
);

const LogoutButton = ({ className = '' }) => {
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <Button variant="outline" className={className} onClick={handleLogout}>
            Log out
        </Button>
    );
};

const NavigationLink = ({ to, end = false, onClick, children, className = '' }) => (
    <NavLink
        to={to}
        end={end}
        onClick={onClick}
        className={({ isActive }) => `inline-flex min-h-11 items-center rounded-control px-3 font-interface font-semibold transition-colors ${isActive ? 'bg-brand-gold-light text-brand-navy' : 'text-text-secondary hover:bg-surface-muted hover:text-brand-navy'} ${className}`.trim()}
    >
        {children}
    </NavLink>
);

export { BrandLink, LogoutButton, MenuToggle, NavigationLink };
