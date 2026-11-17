import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/axios';
import Button from '../components/ui/Button';
import Feedback from '../components/ui/Feedback';
import FormControl from '../components/ui/FormControl';
import { PageHeading, Surface } from '../components/ui/LayoutPrimitives';

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
        <Surface as="section" className="mx-auto my-8 w-full max-w-xl p-5 sm:p-8">
            <p className="mb-2 font-interface text-xs font-bold uppercase tracking-[0.15em] text-brand-navy">Account access</p>
            <PageHeading>Reset your password</PageHeading>
            <p className="mb-7 mt-3 text-text-secondary">Enter the email address associated with your account.</p>
            {message && <Feedback tone="success" className="mb-5">{message}</Feedback>}
            {error && <Feedback tone="error" className="mb-5">{error}</Feedback>}
            <form onSubmit={submit} className="space-y-5">
                <FormControl id="reset-email" name="email" label="Email address" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
                <Button type="submit" disabled={loading} loading={loading} loadingText="Sending..." className="w-full">Send reset link</Button>
            </form>
            <p className="mt-7 text-center text-sm text-text-secondary"><Link to="/login" className="font-bold text-brand-navy underline underline-offset-4">Back to sign in</Link></p>
        </Surface>
    );
}
