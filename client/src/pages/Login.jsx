import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { getLoginDestination } from '../utils/authNavigation';
import Button from '../components/ui/Button';
import Feedback from '../components/ui/Feedback';
import FormControl from '../components/ui/FormControl';
import { PageHeading, Surface } from '../components/ui/LayoutPrimitives';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [showOTP, setShowOTP] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, verifyOTP } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const finishLogin = (data) => {
        navigate(getLoginDestination(data.role, location.state?.from?.pathname), { replace: true });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (!showOTP) {
                const data = await login(email, password);
                finishLogin(data);
            } else {
                const data = await verifyOTP(email, otp);
                finishLogin(data);
            }
        } catch (err) {
            if (err.needsVerification) {
                setShowOTP(true);
                setError('Account not verified. A new OTP has been sent to your email.');
            } else {
                setError(err.message || err);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Surface as="section" className="mx-auto my-8 w-full max-w-xl p-5 sm:p-8">
            <div className="mb-8 border-b border-border pb-6">
                <p className="mb-2 font-interface text-xs font-bold uppercase tracking-[0.15em] text-brand-navy">Your account</p>
                <PageHeading>{showOTP ? 'Verify your sign-in' : 'Welcome back'}</PageHeading>
                <p className="mt-3 text-text-secondary">{showOTP ? 'Enter the code sent to your email to continue.' : 'Sign in to your EventHub account.'}</p>
            </div>

            {error && <Feedback tone={error.startsWith('Account not verified') ? 'info' : 'error'} className="mb-6">{error}</Feedback>}

            <form onSubmit={handleSubmit} className="space-y-5">
                {!showOTP ? (
                    <>
                        <FormControl id="login-email" label="Email address" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                        <FormControl id="login-password" label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                    </>
                ) : (
                    <FormControl id="login-otp" label="Verification code (OTP)" type="text" inputMode="numeric" autoComplete="one-time-code" required placeholder="6-digit code" className="text-center font-bold tracking-widest" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength="6" />
                )}
                <Button type="submit" disabled={loading} loading={loading} loadingText="Processing…" className="w-full">{showOTP ? 'Verify OTP & sign in' : 'Sign in'}</Button>
            </form>

            <p className="mt-7 text-center text-sm text-text-secondary">
                Don&apos;t have an account? <Link to="/register" className="font-bold text-brand-navy underline underline-offset-4">Create one</Link>
            </p>
            {!showOTP && <p className="mt-3 text-center text-sm"><Link to="/forgot-password" className="font-semibold text-text-secondary underline underline-offset-4">Forgot password?</Link></p>}
        </Surface>
    );
};

export default Login;
