import { useCallback, useEffect, useState } from 'react';

const useLayoutNavigation = () => {
    const [isOpen, setIsOpen] = useState(false);
    const close = useCallback(() => setIsOpen(false), []);

    useEffect(() => {
        if (!isOpen) return undefined;
        const onKeyDown = (event) => {
            if (event.key === 'Escape') close();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, close]);

    const toggle = useCallback(() => setIsOpen((current) => !current), []);

    return { isOpen, close, toggle };
};

export default useLayoutNavigation;
