import { Outlet } from 'react-router-dom';
import { Container } from '../components/ui/LayoutPrimitives';
import { BrandLink, LogoutButton, MenuToggle, NavigationLink } from './LayoutNavigation';
import useLayoutNavigation from './useLayoutNavigation';

const StaffLayout = () => {
    const { isOpen, close, toggle } = useLayoutNavigation();

    return (
        <div className="flex min-h-screen flex-col bg-page text-text-primary">
            <header className="eh-nav-dark border-b border-border bg-brand-navy text-brand-white">
                <Container className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-2">
                    <BrandLink to="/staff" onClick={close} className="text-brand-white" />
                    <MenuToggle controls="staff-navigation" isOpen={isOpen} onToggle={toggle} className="eh-button--dark" />
                    <nav id="staff-navigation" aria-label="Event Staff navigation" className={`${isOpen ? 'flex' : 'hidden'} w-full flex-col gap-2 pb-2 lg:flex lg:w-auto lg:flex-row lg:items-center lg:pb-0`}>
                        <NavigationLink to="/" end onClick={close} className="text-white hover:bg-white/10 hover:text-white">Events</NavigationLink>
                        <NavigationLink to="/staff" end onClick={close} className="text-white hover:bg-white/10 hover:text-white [&.active]:text-brand-navy">Dashboard</NavigationLink>
                        <LogoutButton className="eh-button--dark" />
                    </nav>
                </Container>
            </header>
            <Container as="main" className="flex-1 py-8">
                <Outlet />
            </Container>
        </div>
    );
};

export default StaffLayout;
