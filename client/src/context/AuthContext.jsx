import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import api, { advanceApiSession, currentApiSession, isCurrentApiSession, setApiSessionToken } from '../utils/axios';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

const publicUser = (user) => ({
    _id: user._id || user.id,
    name: user.name,
    email: user.email,
    role: user.role,
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')));
    const observedToken = useRef(null);

    const clearSession = useCallback(() => {
        advanceApiSession();
        setApiSessionToken(null);
        observedToken.current = null;
        localStorage.removeItem('userInfo');
        localStorage.removeItem('token');
        setUser(null);
        setLoading(false);
    }, []);

    const establishSession = useCallback((data) => {
        advanceApiSession();
        const verifiedUser = publicUser(data);
        setApiSessionToken(data.token);
        observedToken.current = data.token;
        localStorage.setItem('token', data.token);
        setUser(verifiedUser);
        return data;
    }, []);

    useEffect(() => {
        let mounted = true;
        const token = localStorage.getItem('token');
        observedToken.current = token;
        const onInvalidSession = () => {
            if (mounted) {
                observedToken.current = null;
                setUser(null);
                setLoading(false);
            }
        };
        window.addEventListener('eventhub:session-invalid', onInvalidSession);

        if (!token) {
            setApiSessionToken(null);
            localStorage.removeItem('userInfo');
        } else {
            setApiSessionToken(token);
            const requestVersion = currentApiSession();
            api.get('/auth/me')
                .then(({ data }) => {
                    if (mounted && isCurrentApiSession(requestVersion) && localStorage.getItem('token') === token) {
                        const verifiedUser = publicUser(data);
                        setUser(verifiedUser);
                    }
                })
                .catch(() => {
                    if (mounted && isCurrentApiSession(requestVersion)) clearSession();
                })
                .finally(() => {
                    if (mounted && isCurrentApiSession(requestVersion)) setLoading(false);
                });
        }

        return () => {
            mounted = false;
            window.removeEventListener('eventhub:session-invalid', onInvalidSession);
        };
    }, [clearSession]);

    useEffect(() => {
        const onStorage = (event) => {
            if (event.key !== 'token' || event.newValue === observedToken.current) return;
            const token = event.newValue;
            observedToken.current = token;
            advanceApiSession();
            setApiSessionToken(token);
            setUser(null);
            localStorage.removeItem('userInfo');
            setLoading(Boolean(token));
            if (!token) return;

            const requestVersion = currentApiSession();
            api.get('/auth/me')
                .then(({ data }) => {
                    if (isCurrentApiSession(requestVersion) && localStorage.getItem('token') === token) {
                        const verifiedUser = publicUser(data);
                        setUser(verifiedUser);
                    }
                })
                .catch(() => {
                    if (isCurrentApiSession(requestVersion) && localStorage.getItem('token') === token) clearSession();
                })
                .finally(() => {
                    if (isCurrentApiSession(requestVersion)) setLoading(false);
                });
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, [clearSession]);

    const login = async (email, password) => {
        clearSession();
        try {
            const { data } = await api.post('/auth/login', { email, password });
            return establishSession(data);
        } catch (error) {
            if (error.response?.data?.needsVerification) throw error.response.data;
            throw error.response?.data?.message || 'Login failed';
        }
    };

    const register = async (name, email, password) => {
        try {
            const { data } = await api.post('/auth/register', { name, email, password });
            return data;
        } catch (error) {
            throw error.response?.data?.message || 'Registration failed';
        }
    };

    const verifyOTP = async (email, otp) => {
        clearSession();
        try {
            const { data } = await api.post('/auth/verify-otp', { email, otp });
            return establishSession(data);
        } catch (error) {
            throw error.response?.data?.message || 'OTP verification failed';
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, register, verifyOTP, logout: clearSession, loading }}>
            {!loading && <React.Fragment key={user?._id || 'anonymous-session'}>{children}</React.Fragment>}
        </AuthContext.Provider>
    );
};
