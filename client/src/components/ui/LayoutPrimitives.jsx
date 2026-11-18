const Container = ({ as: Element = 'div', className = '', children, ...props }) => (
    <Element
        {...props}
        className={`mx-auto w-full max-w-[var(--eh-content-width)] px-page-gutter ${className}`.trim()}
    >
        {children}
    </Element>
);

const PageHeading = ({ as: Element = 'h1', className = '', children, ...props }) => (
    <Element {...props} className={`eh-page-title text-text-primary ${className}`.trim()}>
        {children}
    </Element>
);

const Surface = ({ as: Element = 'div', className = '', children, ...props }) => (
    <Element {...props} className={`eh-surface ${className}`.trim()}>
        {children}
    </Element>
);

export { Container, PageHeading, Surface };
