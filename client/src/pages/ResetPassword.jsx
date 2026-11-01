import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/axios';

export default function ResetPassword() {
    const location = useLocation();
    const navigate = useNavigate();
    const [token, setToken] = useState(() => (
        new URLSearchParams(window.location.hash.slice(1)).get('token') ||
        new URLSearchParams(window.location.search).get('token') || ''
    ));
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Remove the credential from the address bar and browser history immediately.
        if (location.search || location.hash) navigate('/reset-password', { replace: true });
    }, [location.hash, location.search, navigate]);

    const submit = async (event) => {
        event.preventDefault();
        setError('');
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setLoading(true);
        try {
            await api.post('/auth/reset-password', { token, password, confirmPassword });
            setToken('');
            setPassword('');
            setConfirmPassword('');
            setSuccess(true);
        } catch (err) {
            setError(err.response?.data?.message || 'This reset link is invalid or expired. Request a new one.');
        } finally {
            setLoading(false);
        }
    };

    if (success) return (
        <section className="max-w-md mx-auto mt-16 bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Password updated</h1>
            <p role="status" className="text-gray-600 mb-7">Your password has been reset. Sign in with your new password.</p>
            <Link to="/login" className="inline-block bg-gray-900 text-white font-bold py-3 px-6 rounded-lg hover:bg-black">Go to sign in</Link>
        </section>
    );

    return (
        <section className="max-w-md mx-auto mt-16 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2 text-center">Set a new password</h1>
            <p className="text-gray-600 text-center mb-7">Choose a password with at least 8 characters.</p>
            {error && <div role="alert" className="bg-red-50 text-red-700 p-3 rounded-lg mb-5">{error} <Link to="/forgot-password" className="font-bold underline">Request another link</Link></div>}
            {!token ? (
                <div role="status" className="text-center text-gray-700">This reset link is missing or invalid. <Link to="/forgot-password" className="font-bold underline">Request another link</Link>.</div>
            ) : (
                <form onSubmit={submit} className="space-y-5">
                    <div>
                        <label htmlFor="new-password" className="block text-sm font-semibold text-gray-700 mb-2">New password</label>
                        <input id="new-password" name="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-700" />
                    </div>
                    <div>
                        <label htmlFor="confirm-password" className="block text-sm font-semibold text-gray-700 mb-2">Confirm new password</label>
                        <input id="confirm-password" name="confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-700" />
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-black disabled:opacity-60">{loading ? 'Updating…' : 'Reset password'}</button>
                </form>
            )}
        </section>
    );
}
