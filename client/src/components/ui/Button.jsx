const variants = {
    primary: 'eh-button--primary',
    secondary: 'eh-button--secondary',
    outline: 'eh-button--outline',
    destructive: 'eh-button--destructive',
};

const Button = ({
    children,
    className = '',
    disabled = false,
    loading = false,
    loadingText = 'Loading…',
    type = 'button',
    variant = 'primary',
    ...props
}) => (
    <button
        {...props}
        type={type}
        className={`eh-button ${variants[variant] || variants.primary} ${className}`.trim()}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
    >
        {loading && <span className="eh-button__spinner" aria-hidden="true" />}
        {loading ? loadingText : children}
    </button>
);

export default Button;
