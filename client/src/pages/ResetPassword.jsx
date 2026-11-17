import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import Button from '../components/ui/Button';
import Feedback from '../components/ui/Feedback';
import FormControl from '../components/ui/FormControl';
import { PageHeading, Surface } from '../components/ui/LayoutPrimitives';

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
        <Surface as="section" className="mx-auto my-8 w-full max-w-xl p-5 text-center sm:p-8">
            <Feedback tone="success" className="mb-5 text-left">Your password has been reset.</Feedback>
            <PageHeading>Password updated</PageHeading>
            <p className="mb-7 mt-3 text-text-secondary">Sign in with your new password.</p>
            <Link to="/login" className="eh-button eh-button--primary">Go to sign in</Link>
        </Surface>
    );

    return (
        <Surface as="section" className="mx-auto my-8 w-full max-w-xl p-5 sm:p-8">
            <p className="mb-2 font-interface text-xs font-bold uppercase tracking-[0.15em] text-brand-navy">Account access</p>
            <PageHeading>Set a new password</PageHeading>
            <p className="mb-7 mt-3 text-text-secondary">Choose a password with at least 8 characters.</p>
            {error && <Feedback tone="error" className="mb-5">{error} <Link to="/forgot-password" className="font-bold underline underline-offset-4">Request another link</Link></Feedback>}
            {!token ? (
                <Feedback tone="warning">This reset link is missing or invalid. <Link to="/forgot-password" className="font-bold underline underline-offset-4">Request another link</Link>.</Feedback>
            ) : (
                <form onSubmit={submit} className="space-y-5">
                    <FormControl id="new-password" name="new-password" label="New password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} />
                    <FormControl id="confirm-password" name="confirm-password" label="Confirm new password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                    <Button type="submit" disabled={loading} loading={loading} loadingText="Updating..." className="w-full">Reset password</Button>
                </form>
            )}
        </Surface>
    );
}
