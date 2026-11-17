import { Outlet } from 'react-router-dom';
import { Container } from '../components/ui/LayoutPrimitives';
import { BrandLink, LogoutButton, MenuToggle, NavigationLink } from './LayoutNavigation';
import useLayoutNavigation from './useLayoutNavigation';
import Footer from '../components/Footer';

const AdminLayout = () => {
    const { isOpen, close, toggle } = useLayoutNavigation();

    return (
        <div className="min-h-screen bg-surface-muted text-text-primary lg:flex">
            <aside className="eh-nav-dark hidden w-64 shrink-0 flex-col bg-brand-navy p-5 text-brand-white lg:flex">
                <BrandLink to="/admin" onClick={close} className="text-brand-white" />
                <nav aria-label="Administrator navigation" className="mt-8 flex flex-1 flex-col gap-2">
                    <NavigationLink to="/" end onClick={close} className="eh-admin-navigation-link w-full">Events</NavigationLink>
                    <NavigationLink to="/admin" end onClick={close} className="eh-admin-navigation-link w-full">Dashboard</NavigationLink>
                    <NavigationLink to="/admin/staff" onClick={close} className="eh-admin-navigation-link w-full">Staff management</NavigationLink>
                </nav>
                <LogoutButton className="eh-button--dark" />
            </aside>

            <div className="flex min-h-screen min-w-0 flex-1 flex-col">
                <header className="border-b border-border bg-surface lg:hidden">
                    <Container className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-2">
                        <BrandLink to="/admin" onClick={close} />
                        <MenuToggle controls="admin-mobile-navigation" isOpen={isOpen} onToggle={toggle} />
                        <nav id="admin-mobile-navigation" aria-label="Administrator navigation" className={`${isOpen ? 'flex' : 'hidden'} w-full flex-col gap-2 pb-2`}>
                            <NavigationLink to="/" end onClick={close}>Events</NavigationLink>
                            <NavigationLink to="/admin" end onClick={close}>Dashboard</NavigationLink>
                            <NavigationLink to="/admin/staff" onClick={close}>Staff management</NavigationLink>
                            <LogoutButton />
                        </nav>
                    </Container>
                </header>
                <Container as="main" className="w-full flex-1 py-8">
                    <Outlet />
                </Container>
                <Footer />
            </div>
        </div>
    );
};

export default AdminLayout;
