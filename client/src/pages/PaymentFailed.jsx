
import { Link } from 'react-router-dom';
import { FaTimesCircle } from 'react-icons/fa';
import Feedback from '../components/ui/Feedback';
import { PageHeading, Surface } from '../components/ui/LayoutPrimitives';

const PaymentFailed = () => {
    return (
        <div className="flex min-h-[55vh] items-center justify-center py-8">
            <Surface as="section" className="w-full max-w-2xl border-t-4 border-t-error p-5 sm:p-8">
                <Feedback tone="warning" className="mb-6 flex items-center gap-3"><FaTimesCircle aria-hidden="true" className="shrink-0 text-xl" />Booking not completed</Feedback>
                <p className="mb-3 font-interface text-xs font-bold uppercase tracking-[0.15em] text-brand-navy">Your registration</p>
                <PageHeading>Review your booking</PageHeading>
                <p className="mb-7 mt-4 max-w-prose text-text-secondary">Check your dashboard for the current booking status, or return to events to review the available registration details.</p>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <Link to="/" className="eh-button eh-button--primary">Return to events</Link>
                    <Link to="/dashboard" className="eh-button eh-button--outline">View my dashboard</Link>
                </div>
            </Surface>
        </div>
    );
};

export default PaymentFailed;
