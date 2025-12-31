'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import toast from 'react-hot-toast';

const AuthForm = dynamic(() => import('@/components/AuthForm'), {
  ssr: false,
  loading: () => (
    <Card className="p-8">
      <div className="animate-pulse space-y-4">
        <div className="h-5 bg-gray-200 rounded w-1/3"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    </Card>
  ),
});

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [authType, setAuthType] = useState<'user' | 'admin'>('user');
  const { user, loading, onboardingCompleted, inviteSent, isNewUser, isAdmin } = useAuth();

  useEffect(() => {
    // Check for OAuth errors in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const admin = urlParams.get('admin');
    
    // If admin parameter is present, switch to admin auth mode
    if (admin === 'true') {
      setAuthType('admin');
    }
    
    if (error) {
      let errorMessage = 'Authentication failed. Please try again.';
      
      switch (error) {
        case 'oauth_error':
          errorMessage = 'OAuth authentication was cancelled or failed.';
          break;
        case 'no_code':
          errorMessage = 'OAuth authentication incomplete. Please try again.';
          break;
        case 'token_exchange_failed':
          errorMessage = 'Failed to exchange OAuth token. Please try again.';
          break;
        case 'user_info_failed':
          errorMessage = 'Failed to get user information from Google. Please try again.';
          break;
        case 'no_email':
          errorMessage = 'No email address found in Google account. Please use email/password login.';
          break;
        case 'server_error':
          errorMessage = 'Server error during authentication. Please try again.';
          break;
        case 'linkedin_not_implemented':
          errorMessage = 'LinkedIn OAuth is not fully implemented yet. Please use Google OAuth or email/password login.';
          break;
      }
      
      toast.error(errorMessage);
      
      // Clean up URL
      window.history.replaceState({}, document.title, '/product/auth');
    }
  }, []);

  // Handle redirects based on user state
  useEffect(() => {
    if (user && !loading) {
      // User is authenticated, determine where to redirect based on user type
      if (isAdmin) {
        // Admin user: go to product admin panel (not /admin)
        window.location.href = '/product/admin';
      } else if (isNewUser) {
        // New regular user: follow full flow
        if (!inviteSent) {
          window.location.href = '/product/invite';
        } else if (!onboardingCompleted) {
          window.location.href = '/product/onboarding';
        } else {
          window.location.href = '/product/subscription';
        }
      } else {
        // Existing regular user: go directly to profile page per requirement
        window.location.href = '/product/profile';
      }
    }
  }, [user, loading, onboardingCompleted, inviteSent, isNewUser, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const AdminForm = () => {
    const { checkAuth } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const onSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      try {
        // Use relative path - Vercel rewrite will proxy to EC2 backend
        const res = await fetch('/api/admin/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });
        if (res.ok) {
          const data = await res.json();
          // Update auth context with admin user data
          if (data.user) {
            // Refresh auth state before redirect
            await checkAuth();
          }
          // Small delay to ensure cookie is set, then redirect
          setTimeout(() => {
            window.location.href = '/product/admin';
          }, 100);
          return;
        }
        const data = await res.json();
        toast.error(data?.error || 'Invalid admin credentials');
      } catch (err) {
        toast.error('Admin login failed');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter admin email"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter admin password"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors duration-200 disabled:opacity-50 cursor-pointer"
        >
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className={`${mode === 'signup' ? 'max-w-6xl' : 'max-w-md'} w-full space-y-8`}>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-black mb-2">
            Business Orbit
          </h1>
          <p className="text-gray-600">
            Connect, grow, and succeed together
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
          {/* Switch between User and Admin auth */}
          <div className="flex gap-2 mb-6">
            <button
              className={`px-4 py-2 rounded-lg border ${authType === 'user' ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-300'}`}
              onClick={() => setAuthType('user')}
            >
              User
            </button>
            <button
              className={`px-4 py-2 rounded-lg border ${authType === 'admin' ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-300'}`}
              onClick={() => setAuthType('admin')}
            >
              Admin
            </button>
          </div>

          {authType === 'user' ? (
            <AuthForm mode={mode} setMode={setMode} />
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Sign in</h2>
                <p className="text-gray-600">Use admin credentials to access dashboard</p>
              </div>
              <AdminForm />
            </div>
          )}

          
          
          {authType === 'user' && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                {mode === 'signin' ? "Don't have an account?" : "Already have an account?"}
              </p>
              <button
                onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                className="text-black hover:underline font-medium text-sm mt-1 cursor-pointer"
              >
                {mode === 'signin' ? 'Sign up here' : 'Sign in here'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            By continuing, you agree to our{' '}
            <a href="#" className="text-black hover:underline cursor-pointer">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-black hover:underline cursor-pointer">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

