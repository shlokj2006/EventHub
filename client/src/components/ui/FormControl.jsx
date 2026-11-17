import { useId } from 'react';

const FormControl = ({
    as = 'input',
    className = '',
    error,
    helpText,
    id: providedId,
    label,
    type = 'text',
    children,
    ...props
}) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const helpId = helpText ? `${id}-help` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [props['aria-describedby'], helpId, errorId].filter(Boolean).join(' ') || undefined;
    const controlClassName = `eh-control ${error ? 'eh-control--error' : ''} ${className}`.trim();

    const controlProps = {
        ...props,
        id,
        className: controlClassName,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : props['aria-invalid'],
    };

    let control;
    if (as === 'textarea') {
        control = <textarea {...controlProps}>{children}</textarea>;
    } else if (as === 'select') {
        control = <select {...controlProps}>{children}</select>;
    } else {
        control = <input {...controlProps} type={type} />;
    }

    return (
        <div className="eh-field">
            {label && <label className="eh-field__label" htmlFor={id}>{label}</label>}
            {control}
            {helpText && <div className="eh-field__help" id={helpId}>{helpText}</div>}
            {error && <div className="eh-field__error" id={errorId}>{error}</div>}
        </div>
    );
};

export default FormControl;
