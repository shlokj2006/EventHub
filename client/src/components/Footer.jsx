import { useContext } from 'react';
import { FaTicketAlt } from 'react-icons/fa';
import { Link, NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Container } from './ui/LayoutPrimitives';

const linkClassName = ({ isActive }) => `inline-flex min-h-11 items-center text-sm transition-colors hover:text-brand-gold-light ${isActive ? 'text-brand-gold-light underline underline-offset-4' : 'text-white/85'}`;

const FooterLink = ({ to, end = false, children }) => (
    <NavLink to={to} end={end} className={linkClassName}>
        {children}
    </NavLink>
);

const Footer = () => {
    const { user } = useContext(AuthContext);
    const dashboardPath = user?.role === 'admin' ? '/admin' : user?.role === 'event_staff' ? '/staff' : '/dashboard';
    const year = new Date().getFullYear();

    return (
        <footer className="eh-nav-dark mt-auto bg-brand-navy text-white">
            <Container className="grid gap-8 py-9 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))] lg:gap-10 lg:py-10">
                <section aria-labelledby="footer-brand-heading" className="max-w-sm">
                    <h2 id="footer-brand-heading" className="font-interface text-xl font-bold">
                        <Link to="/" className="inline-flex min-h-11 items-center gap-2 text-white transition-colors hover:text-brand-gold-light">
                            <FaTicketAlt aria-hidden="true" className="text-brand-gold-light" />
                            <span>EventHub</span>
                        </Link>
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-white/80">Discover events, explore the details, and book tickets with EventHub.</p>
                </section>

                <nav aria-label="Explore">
                    <h2 className="font-interface text-base font-bold text-brand-gold-light">Explore</h2>
                    <ul className="mt-2">
                        <li><FooterLink to="/" end>Browse events</FooterLink></li>
                    </ul>
                </nav>

                <nav aria-label="Information">
                    <h2 className="font-interface text-base font-bold text-brand-gold-light">Information</h2>
                    <ul className="mt-2">
                        <li><FooterLink to="/about">About us</FooterLink></li>
                        <li><FooterLink to="/terms">Terms &amp; Conditions</FooterLink></li>
                        <li><FooterLink to="/privacy">Privacy policy</FooterLink></li>
                    </ul>
                </nav>

                <nav aria-label="Account">
                    <h2 className="font-interface text-base font-bold text-brand-gold-light">Account</h2>
                    <ul className="mt-2">
                        {user ? (
                            <li><FooterLink to={dashboardPath}>Your dashboard</FooterLink></li>
                        ) : (
                            <>
                                <li><FooterLink to="/login">Log in</FooterLink></li>
                                <li><FooterLink to="/register">Register</FooterLink></li>
                            </>
                        )}
                    </ul>
                </nav>
            </Container>

            <div className="border-t border-white/15">
                <Container className="flex min-h-14 flex-col justify-center gap-1 py-3 text-sm text-white/80 sm:flex-row sm:items-center sm:justify-between">
                    <p>Copyright {year} EventHub.</p>
                    <p>Discover events. Make memories.</p>
                </Container>
            </div>
        </footer>
    );
};

export default Footer;
