'use client';

import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

type Step = 'email' | 'otp' | 'new-password' | 'success';

interface ForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resetToken, setResetToken] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setStep('email');
                setEmail('');
                setOtp('');
                setNewPassword('');
                setConfirmPassword('');
                setResetToken('');
                setResendCooldown(0);
            }, 300);
        }
    }, [isOpen]);

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleSendOTP = async () => {
        if (!email) {
            toast.error('Please enter your email');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('If an account exists, you will receive an OTP');
                setStep('otp');
                setResendCooldown(60); // 60 second cooldown
            } else {
                toast.error(data.error || 'Failed to send OTP');
            }
        } catch (error) {
            toast.error('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (otp.length !== 6) {
            toast.error('Please enter a 6-digit OTP');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, purpose: 'forgot_password' }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                toast.success('OTP verified successfully');
                setResetToken(data.resetToken || '');
                setStep('new-password');
            } else {
                toast.error(data.error || 'Invalid OTP');
                if (data.remainingAttempts !== undefined) {
                    toast.error(`${data.remainingAttempts} attempts remaining`);
                }
            }
        } catch (error) {
            toast.error('Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        // Check password strength
        const hasLetter = /[a-zA-Z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);
        if (!hasLetter || !hasNumber) {
            toast.error('Password must contain letters and numbers');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    resetToken,
                    newPassword
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                toast.success('Password reset successfully!');
                setStep('success');
            } else {
                toast.error(data.error || 'Failed to reset password');
            }
        } catch (error) {
            toast.error('Password reset failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        if (resendCooldown > 0) return;
        await handleSendOTP();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Step: Email */}
                {step === 'email' && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Forgot Password?</h2>
                            <p className="text-gray-600 mt-1">
                                Enter your email and we'll send you a code to reset your password.
                            </p>
                        </div>

                        <div>
                            <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                                <input
                                    type="email"
                                    id="forgot-email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                                    placeholder="Enter your email"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSendOTP}
                            disabled={loading || !email}
                            className="w-full bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    Sending...
                                </>
                            ) : (
                                'Send Reset Code'
                            )}
                        </button>
                    </div>
                )}

                {/* Step: OTP */}
                {step === 'otp' && (
                    <div className="space-y-6">
                        <button
                            onClick={() => setStep('email')}
                            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Back
                        </button>

                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Enter Verification Code</h2>
                            <p className="text-gray-600 mt-1">
                                We sent a 6-digit code to <span className="font-medium">{email}</span>
                            </p>
                        </div>

                        <div>
                            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                                Verification Code
                            </label>
                            <input
                                type="text"
                                id="otp"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="w-full px-4 py-4 text-center text-2xl tracking-[0.5em] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent font-mono"
                                placeholder="000000"
                                maxLength={6}
                                autoFocus
                            />
                        </div>

                        <button
                            onClick={handleVerifyOTP}
                            disabled={loading || otp.length !== 6}
                            className="w-full bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    Verifying...
                                </>
                            ) : (
                                'Verify Code'
                            )}
                        </button>

                        <div className="text-center">
                            <p className="text-gray-600 text-sm">
                                Didn't receive the code?{' '}
                                {resendCooldown > 0 ? (
                                    <span className="text-gray-400">Resend in {resendCooldown}s</span>
                                ) : (
                                    <button
                                        onClick={handleResendOTP}
                                        className="text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        Resend Code
                                    </button>
                                )}
                            </p>
                        </div>
                    </div>
                )}

                {/* Step: New Password */}
                {step === 'new-password' && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Create New Password</h2>
                            <p className="text-gray-600 mt-1">
                                Your new password must be at least 8 characters with letters and numbers.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                                    New Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="new-password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                                        placeholder="Enter new password"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        id="confirm-password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                                        placeholder="Confirm new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleResetPassword}
                            disabled={loading || !newPassword || !confirmPassword}
                            className="w-full bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    Resetting...
                                </>
                            ) : (
                                'Reset Password'
                            )}
                        </button>
                    </div>
                )}

                {/* Step: Success */}
                {step === 'success' && (
                    <div className="space-y-6 text-center py-4">
                        <div className="flex justify-center">
                            <div className="bg-green-100 rounded-full p-4">
                                <CheckCircle className="h-12 w-12 text-green-600" />
                            </div>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Password Reset!</h2>
                            <p className="text-gray-600 mt-2">
                                Your password has been reset successfully. You can now log in with your new password.
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                        >
                            Back to Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForgotPasswordModal;
