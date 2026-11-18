
import { Link } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import Feedback from '../components/ui/Feedback';
import { PageHeading, Surface } from '../components/ui/LayoutPrimitives';

const PaymentSuccess = () => {
    return (
        <div className="flex min-h-[55vh] items-center justify-center py-8">
            <Surface as="section" className="w-full max-w-2xl border-t-4 border-t-success p-5 sm:p-8">
                <Feedback tone="info" className="mb-6 flex items-center gap-3"><FaCheckCircle aria-hidden="true" className="shrink-0 text-xl" />Booking follow-up</Feedback>
                <p className="mb-3 font-interface text-xs font-bold uppercase tracking-[0.15em] text-brand-navy">Your registration</p>
                <PageHeading>Check your booking</PageHeading>
                <p className="mb-7 mt-4 max-w-prose text-text-secondary">Your dashboard shows the current booking and ticket status. Paid bookings may still require administrator confirmation.</p>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <Link to="/dashboard" className="eh-button eh-button--primary">View my dashboard</Link>
                    <Link to="/" className="eh-button eh-button--outline">Explore events</Link>
                </div>
            </Surface>
        </div>
    );
};

export default PaymentSuccess;
