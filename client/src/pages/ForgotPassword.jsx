import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/axios';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async (event) => {
        event.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);
        try {
            const { data } = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
            setMessage(data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'Password reset is temporarily unavailable. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="max-w-md mx-auto mt-16 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2 text-center">Forgot password?</h1>
            <p className="text-gray-600 text-center mb-7">Enter the email address associated with your account.</p>
            {message && <div role="status" className="bg-green-50 text-green-800 p-3 rounded-lg mb-5">{message}</div>}
            {error && <div role="alert" className="bg-red-50 text-red-700 p-3 rounded-lg mb-5">{error}</div>}
            <form onSubmit={submit} className="space-y-5">
                <div>
                    <label htmlFor="reset-email" className="block text-sm font-semibold text-gray-700 mb-2">Email address</label>
                    <input id="reset-email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-700" />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-black disabled:opacity-60">{loading ? 'Sending…' : 'Send reset link'}</button>
            </form>
            <p className="text-center mt-7 text-gray-600"><Link to="/login" className="font-bold text-gray-900 hover:underline">Back to sign in</Link></p>
        </section>
    );
}
