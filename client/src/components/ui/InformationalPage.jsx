import { Link } from 'react-router-dom';
import { PageHeading, Surface } from './LayoutPrimitives';

const InformationalPage = ({ title, introduction, sections, draftNotice, action }) => (
    <article className="mx-auto w-full max-w-[var(--eh-reading-width)] space-y-6">
        <header className="space-y-3 border-b border-border pb-5">
            <PageHeading>{title}</PageHeading>
            <p className="eh-body text-text-secondary">{introduction}</p>
        </header>

        {draftNotice && (
            <div role="note" className="border-l-4 border-brand-gold-muted bg-warning-surface p-4 text-sm leading-relaxed text-text-secondary">
                {draftNotice}
            </div>
        )}

        <Surface className="space-y-7 p-5 sm:p-8">
            {sections.map(({ heading, paragraphs, items }) => (
                <section key={heading} aria-labelledby={`information-${heading.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="space-y-3">
                    <h2 id={`information-${heading.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="eh-section-title text-text-primary">{heading}</h2>
                    {paragraphs?.map((paragraph) => <p key={paragraph} className="eh-body text-text-secondary">{paragraph}</p>)}
                    {items && (
                        <ul className="list-disc space-y-2 pl-5 text-text-secondary">
                            {items.map((item) => <li key={item} className="leading-relaxed">{item}</li>)}
                        </ul>
                    )}
                </section>
            ))}
        </Surface>

        {action && (
            <Link to={action.to} className="eh-button eh-button--secondary">
                {action.label}
            </Link>
        )}
    </article>
);

export default InformationalPage;
