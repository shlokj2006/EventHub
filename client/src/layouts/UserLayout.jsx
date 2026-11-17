import { Outlet } from 'react-router-dom';
import { Container } from '../components/ui/LayoutPrimitives';
import { BrandLink, LogoutButton, MenuToggle, NavigationLink } from './LayoutNavigation';
import useLayoutNavigation from './useLayoutNavigation';

const UserLayout = () => {
    const { isOpen, close, toggle } = useLayoutNavigation();

    return (
        <div className="flex min-h-screen flex-col bg-page text-text-primary">
            <header className="border-b border-border bg-surface">
                <Container className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-2">
                    <BrandLink to="/dashboard" onClick={close} />
                    <MenuToggle controls="user-navigation" isOpen={isOpen} onToggle={toggle} />
                    <nav id="user-navigation" aria-label="User navigation" className={`${isOpen ? 'flex' : 'hidden'} w-full flex-col gap-2 pb-2 lg:flex lg:w-auto lg:flex-row lg:items-center lg:pb-0`}>
                        <NavigationLink to="/" end onClick={close}>Events</NavigationLink>
                        <NavigationLink to="/dashboard" end onClick={close}>Dashboard</NavigationLink>
                        <LogoutButton />
                    </nav>
                </Container>
            </header>
            <Container as="main" className="flex-1 py-8">
                <Outlet />
            </Container>
        </div>
    );
};

export default UserLayout;
