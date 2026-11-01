const isSafePath = (path) => typeof path === 'string' && path.startsWith('/') && !path.startsWith('//');

export const getLoginDestination = (role, requestedPath) => {
    const fallback = role === 'admin' ? '/admin' : role === 'event_staff' ? '/staff' : '/';
    if (!isSafePath(requestedPath) || ['/login', '/register', '/forgot-password', '/reset-password'].includes(requestedPath)) {
        return fallback;
    }
    if (role === 'admin') return requestedPath === '/dashboard' || requestedPath === '/staff' || requestedPath.startsWith('/staff/') ? fallback : requestedPath;
    if (role === 'event_staff') return requestedPath === '/staff' || requestedPath.startsWith('/staff/') ? requestedPath : fallback;
    if (requestedPath === '/admin' || requestedPath.startsWith('/admin/') || requestedPath === '/staff' || requestedPath.startsWith('/staff/')) return fallback;
    return requestedPath;
};
