'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface SignupOTPModalProps {
    isOpen: boolean;
    onClose: () => void;
    email: string;
    sessionToken: string;
    onVerificationSuccess: (user: any) => void;
}

const SignupOTPModal: React.FC<SignupOTPModalProps> = ({
    isOpen,
    onClose,
    email,
    sessionToken,
    onVerificationSuccess,
}) => {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState('');
    const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
    const [countdown, setCountdown] = useState(0);
    const [expiryCountdown, setExpiryCountdown] = useState(600); // 10 minutes in seconds
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Initialize refs array
    useEffect(() => {
        inputRefs.current = inputRefs.current.slice(0, 6);
    }, []);

    // Focus first input when modal opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRefs.current[0]?.focus();
            }, 100);
            // Reset state
            setOtp(['', '', '', '', '', '']);
            setError('');
            setRemainingAttempts(null);
            setExpiryCountdown(600);
        }
    }, [isOpen]);

    // Resend cooldown timer
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // Expiry countdown
    useEffect(() => {
        if (isOpen && expiryCountdown > 0) {
            const timer = setTimeout(() => setExpiryCountdown(expiryCountdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, expiryCountdown]);

    const handleChange = (index: number, value: string) => {
        // Only allow digits
        const digit = value.replace(/\D/g, '').slice(-1);

        const newOtp = [...otp];
        newOtp[index] = digit;
        setOtp(newOtp);
        setError('');

        // Auto-focus next input
        if (digit && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all digits entered
        if (digit && index === 5 && newOtp.every(d => d)) {
            handleVerify(newOtp.join(''));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            const newOtp = pasted.split('');
            setOtp(newOtp);
            inputRefs.current[5]?.focus();
            handleVerify(pasted);
        }
    };

    const handleVerify = async (otpValue?: string) => {
        const otpString = otpValue || otp.join('');

        if (otpString.length !== 6) {
            setError('Please enter all 6 digits');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    email,
                    otp: otpString,
                    purpose: 'signup_verification',
                    sessionToken,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                toast.success('Account created successfully!');
                onVerificationSuccess(data.user);
            } else {
                setError(data.error || 'Verification failed');
                if (data.remainingAttempts !== undefined) {
                    setRemainingAttempts(data.remainingAttempts);
                }
                // Clear OTP inputs on error
                setOtp(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (countdown > 0 || resending) return;

        setResending(true);
        setError('');

        try {
            const response = await fetch('/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    purpose: 'signup_verification',
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('New verification code sent!');
                setCountdown(60); // 60 second cooldown
                setExpiryCountdown(600); // Reset expiry
                setOtp(['', '', '', '', '', '']);
                setRemainingAttempts(null);
                inputRefs.current[0]?.focus();
            } else {
                setError(data.error || 'Failed to resend code');
            }
        } catch (err) {
            setError('Failed to resend code. Please try again.');
        } finally {
            setResending(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 animate-in fade-in zoom-in duration-200">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <Mail className="w-8 h-8 text-blue-600" />
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                    Verify Your Email
                </h2>
                <p className="text-gray-600 text-center mb-6">
                    We've sent a 6-digit code to<br />
                    <span className="font-medium text-gray-900">{email}</span>
                </p>

                {/* OTP Inputs */}
                <div className="flex justify-center gap-3 mb-6">
                    {otp.map((digit, index) => (
                        <input
                            key={index}
                            ref={(el) => { inputRefs.current[index] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            onPaste={handlePaste}
                            disabled={loading}
                            className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all
                ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50'}
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
                        />
                    ))}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="flex items-center justify-center gap-2 text-red-600 text-sm mb-4">
                        <AlertCircle className="w-4 h-4" />
                        <span>{error}</span>
                        {remainingAttempts !== null && remainingAttempts > 0 && (
                            <span className="text-gray-500">
                                ({remainingAttempts} {remainingAttempts === 1 ? 'attempt' : 'attempts'} left)
                            </span>
                        )}
                    </div>
                )}

                {/* Expiry Timer */}
                <div className="text-center text-sm text-gray-500 mb-4">
                    {expiryCountdown > 0 ? (
                        <span>Code expires in {formatTime(expiryCountdown)}</span>
                    ) : (
                        <span className="text-red-600">Code expired. Please request a new one.</span>
                    )}
                </div>

                {/* Verify Button */}
                <button
                    onClick={() => handleVerify()}
                    disabled={loading || otp.some(d => !d)}
                    className="w-full py-3 px-4 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Verifying...
                        </>
                    ) : (
                        <>
                            <CheckCircle className="w-5 h-5" />
                            Verify & Create Account
                        </>
                    )}
                </button>

                {/* Resend */}
                <div className="text-center mt-4">
                    <span className="text-gray-600 text-sm">Didn't receive the code? </span>
                    {countdown > 0 ? (
                        <span className="text-gray-400 text-sm">
                            Resend in {countdown}s
                        </span>
                    ) : (
                        <button
                            onClick={handleResend}
                            disabled={resending}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {resending ? 'Sending...' : 'Resend Code'}
                        </button>
                    )}
                </div>

                {/* Change Email */}
                <div className="text-center mt-3">
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-sm transition-colors"
                    >
                        Use a different email
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SignupOTPModal;
