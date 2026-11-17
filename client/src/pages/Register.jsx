import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Feedback from '../components/ui/Feedback';
import FormControl from '../components/ui/FormControl';
import { PageHeading, Surface } from '../components/ui/LayoutPrimitives';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [showOTP, setShowOTP] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { register, verifyOTP } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (!showOTP) {
                await register(name, email, password);
                setShowOTP(true);
                setError('');
            } else {
                await verifyOTP(email, otp);
                navigate('/');
            }
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Surface as="section" className="mx-auto my-8 w-full max-w-xl p-5 sm:p-8">
            <div className="mb-8 border-b border-border pb-6">
                <p className="mb-2 font-interface text-xs font-bold uppercase tracking-[0.15em] text-brand-navy">Your account</p>
                <PageHeading>{showOTP ? 'Verify your email' : 'Create an account'}</PageHeading>
                <p className="mt-3 text-text-secondary">{showOTP ? 'Enter the code sent to your email to finish registration.' : 'Join EventHub to book and manage event registrations.'}</p>
            </div>

            {error && <Feedback tone="error" className="mb-6">{error}</Feedback>}

            <form onSubmit={handleSubmit} className="space-y-5">
                {!showOTP ? (
                    <>
                        <FormControl id="register-name" label="Full name" type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
                        <FormControl id="register-email" label="Email address" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                        <FormControl id="register-password" label="Password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                    </>
                ) : (
                    <div>
                        <Feedback tone="success" className="mb-4">
                            An OTP has been sent to your email. Please verify your account.
                        </Feedback>
                        <FormControl id="register-otp" label="Verification code (OTP)" type="text" inputMode="numeric" autoComplete="one-time-code" required placeholder="6-digit code" className="text-center font-bold tracking-widest" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength="6" />
                    </div>
                )}

                <Button type="submit" disabled={loading} loading={loading} loadingText="Processing…" className="mt-4 w-full">{showOTP ? 'Verify and finish' : 'Create account'}</Button>
            </form>

            {!showOTP && (
                <p className="mt-6 text-center text-sm text-text-secondary">
                    Already have an account? <Link to="/login" className="font-bold text-brand-navy underline underline-offset-4">Sign in</Link>
                </p>
            )}
        </Surface>
    );
};

export default Register;
