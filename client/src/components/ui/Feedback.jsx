const tones = ['loading', 'empty', 'error', 'success', 'warning', 'info'];

const Feedback = ({ children, className = '', role, tone = 'info', ...props }) => {
    const safeTone = tones.includes(tone) ? tone : 'info';
    const resolvedRole = role || (safeTone === 'error' ? 'alert' : 'status');

    return (
        <div
            {...props}
            className={`eh-feedback eh-feedback--${safeTone} ${className}`.trim()}
            role={resolvedRole}
            aria-live={resolvedRole === 'alert' ? 'assertive' : 'polite'}
            aria-busy={safeTone === 'loading' || undefined}
        >
            {children}
        </div>
    );
};

export default Feedback;
