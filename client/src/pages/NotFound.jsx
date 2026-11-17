import { Link } from 'react-router-dom';
import { PageHeading, Surface } from '../components/ui/LayoutPrimitives';

const NotFound = () => (
    <div className="flex min-h-[50vh] items-center justify-center py-8">
        <Surface as="section" className="w-full max-w-2xl border-l-4 border-l-brand-gold-muted p-5 sm:p-8">
            <p className="mb-3 font-interface text-xs font-bold uppercase tracking-[0.15em] text-brand-navy">404 / Page not found</p>
            <PageHeading>We couldn&apos;t find that page.</PageHeading>
            <p className="mb-7 mt-4 text-text-secondary">The address may be incorrect, or the page may have moved. Return to the event listings to continue browsing.</p>
            <Link to="/" className="eh-button eh-button--primary">Back to events</Link>
        </Surface>
    </div>
);

export default NotFound;
