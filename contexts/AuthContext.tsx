'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  profilePhotoUrl?: string;
  profilePhotoId?: string;
  bannerUrl?: string;
  bannerId?: string;
  skills?: string[];
  description?: string;
  profession?: string;
  interest?: string;
  createdAt: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (updatedUser: User) => void;
  onboardingCompleted: boolean;
  setOnboardingCompleted: (completed: boolean) => void;
  completeOnboarding: () => void;
  inviteSent: boolean;
  setInviteSent: (sent: boolean) => void;
  markInviteSent: () => void;
  isNewUser: boolean;
  setIsNewUser: (isNew: boolean) => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // Helper function to clear token cookie
  const clearTokenCookie = () => {
    if (typeof window !== 'undefined') {
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
  };

  // Helper function to check if token exists in cookies
  const hasToken = () => {
    if (typeof window === 'undefined') return false;
    return document.cookie.split(';').some(cookie => cookie.trim().startsWith('token='));
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsNewUser(false); // Existing user checking auth
        
        // Check onboarding status - only if user exists
        try {
          const prefsResponse = await fetch(`/api/preferences/${data.user.id}`, {
            credentials: 'include',
          });
          if (prefsResponse.ok) {
            const prefsData = await prefsResponse.json();
            setOnboardingCompleted(prefsData.onboardingCompleted);
          } else {
            setOnboardingCompleted(false);
          }
        } catch (prefsError) {
          setOnboardingCompleted(false);
        }
        
        // Check if user has sent any invites
        try {
          const invitesResponse = await fetch('/api/invites/has-sent', {
            credentials: 'include',
          });
          if (invitesResponse.ok) {
            const invitesData = await invitesResponse.json();
            setInviteSent(invitesData.hasSentInvites);
          } else {
            setInviteSent(false);
          }
        } catch (invitesError) {
          setInviteSent(false);
        }
      } else {
        // User is not authenticated - clear user state and handle redirects
        setUser(null);
        setOnboardingCompleted(false);
        setInviteSent(false);
        
        // Clear any invalid token from cookies
        clearTokenCookie();
        
        if (typeof window !== 'undefined') {
          const path = window.location.pathname || '';
          const publicProductPaths = ['/product', '/product/', '/product/auth'];
          const isProduct = path.startsWith('/product');
          const isPublic = publicProductPaths.some(p => path.startsWith(p));
          
          // If on product pages and not public, redirect to auth
          if (isProduct && !isPublic) {
            window.location.href = '/product/auth';
          }
          // If on home page and not authenticated, stay on landing page
          // (don't redirect to auth from home page)
        }
      }
    } catch (error) {
      // On error, clear user state and clear cookies
      setUser(null);
      setOnboardingCompleted(false);
      setInviteSent(false);
      
      // Clear the token cookie on error
      clearTokenCookie();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsNewUser(false); // Existing user logging in
        
        // Check if user has completed onboarding
        try {
          const prefsResponse = await fetch(`/api/preferences/${data.user.id}`, {
            credentials: 'include',
          });
          if (prefsResponse.ok) {
            const prefsData = await prefsResponse.json();
            setOnboardingCompleted(prefsData.onboardingCompleted);
          } else {
            setOnboardingCompleted(false);
          }
        } catch (prefsError) {
          setOnboardingCompleted(false);
        }
        
        toast.success('Login successful!');
        return { success: true };
      } else {
        const errorData = await response.json();
        const message = errorData.error || 'Login failed';
        // Don't show toast for EMAIL_NOT_REGISTERED, let AuthForm handle it
        if (errorData.error !== 'EMAIL_NOT_REGISTERED') {
          toast.error(errorData.message || message);
        }
        return { success: false, error: errorData.error || message };
      }
    } catch (error) {
      const message = 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const signup = async (formData: FormData) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsNewUser(true); // New user signing up
        
        // New users haven't completed onboarding
        setOnboardingCompleted(false);
        setInviteSent(false);
        
        toast.success('Account created successfully!');
        return { success: true };
      } else {
        const errorData = await response.json();
        const message = errorData.error || 'Signup failed';
        toast.error(message);
        return { success: false, error: message };
      }
    } catch (error) {
      const message = 'Signup failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
      setOnboardingCompleted(false);
      setInviteSent(false);
      
      // Clear token cookie on client side as well
      clearTokenCookie();
      if (typeof window !== 'undefined') {
        toast.success('Logged out successfully!');
        window.location.href = '/product/auth';
      }
    } catch (error) {
      // Even if server logout fails, clear client state and cookies
      setUser(null);
      setOnboardingCompleted(false);
      setInviteSent(false);
      
      clearTokenCookie();
      if (typeof window !== 'undefined') {
        toast.success('Logged out successfully!');
        window.location.href = '/product/auth';
      }
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const completeOnboarding = () => {
    setOnboardingCompleted(true);
  };

  const markInviteSent = () => {
    setInviteSent(true);
  };

  // Check if user is admin
  const isAdmin = user?.isAdmin || false;

  const value: AuthContextType = {
    user,
    loading,
    login,
    signup,
    logout,
    checkAuth,
    updateUser,
    onboardingCompleted,
    setOnboardingCompleted,
    completeOnboarding,
    inviteSent,
    setInviteSent,
    markInviteSent,
    isNewUser,
    setIsNewUser,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
