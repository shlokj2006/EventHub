import { useContext } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Container } from './ui/LayoutPrimitives';
import { BrandLink, LogoutButton, MenuToggle, NavigationLink } from '../layouts/LayoutNavigation';
import useLayoutNavigation from '../layouts/useLayoutNavigation';

const Navbar = () => {
    const { user } = useContext(AuthContext);
    const { isOpen, close, toggle } = useLayoutNavigation();
    const { pathname } = useLocation();
    const isEventsActive = pathname === '/' || pathname.startsWith('/events/');
    const dashboardPath = user?.role === 'admin' ? '/admin' : user?.role === 'event_staff' ? '/staff' : '/dashboard';

    return (
        <header className="border-b border-border bg-surface">
            <Container className="flex flex-wrap items-center justify-between gap-3 py-2">
                <BrandLink onClick={close} />
                <MenuToggle controls="public-navigation" isOpen={isOpen} onToggle={toggle} />
                <nav id="public-navigation" aria-label="Main navigation" className={`${isOpen ? 'flex' : 'hidden'} w-full flex-col gap-2 pb-2 lg:flex lg:w-auto lg:flex-row lg:items-center lg:pb-0`}>
                    <NavLink
                        to="/"
                        end
                        onClick={close}
                        aria-current={isEventsActive ? 'page' : undefined}
                        className={({ isActive }) => `inline-flex min-h-11 items-center rounded-control px-3 font-interface font-semibold transition-colors ${isActive || isEventsActive ? 'bg-brand-gold-light text-brand-navy' : 'text-text-secondary hover:bg-surface-muted hover:text-brand-navy'}`}
                    >
                        Events
                    </NavLink>
                    {user ? (
                        <>
                            <NavigationLink to={dashboardPath} onClick={close}>Dashboard</NavigationLink>
                            <LogoutButton />
                        </>
                    ) : (
                        <>
                            <NavigationLink to="/login" onClick={close}>Log in</NavigationLink>
                            <NavigationLink to="/register" onClick={close} className="bg-brand-navy text-white hover:bg-brand-navy hover:text-white [&.active]:bg-brand-gold-light [&.active]:text-brand-navy">Sign up</NavigationLink>
                        </>
                    )}
                </nav>
            </Container>
        </header>
    );
};

export default Navbar;
