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
  expertise?: string[];
  createdAt: string;
  isAdmin?: boolean;
  location?: string;
  rewardScore?: number;
  mutualConnections?: number;
  isPremium?: boolean;
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
  notifications: any[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  setNotifications: React.Dispatch<React.SetStateAction<any[]>>;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  unreadMessageCount: number;
  setUnreadMessageCount: React.Dispatch<React.SetStateAction<number>>;
  fetchUnreadMessageCount: () => Promise<void>;
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
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

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

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.error("Failed to poll notifications", e);
    }
  };

  const fetchUnreadMessageCount = async () => {
    try {
      const response = await fetch('/api/messages/unread-count', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setUnreadMessageCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.error("Failed to fetch unread message count", e);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/bootstrap', {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        const { data } = result;

        if (data && data.user) {
          setUser(data.user);
          setIsNewUser(false);
          setOnboardingCompleted(data.preferences?.onboardingCompleted || false);
          setInviteSent(data.features?.inviteSent || false);

          if (data.notifications) {
            setNotifications(data.notifications.items || []);
            setUnreadCount(data.notifications.unreadCount || 0);
          }

          // Fetch unread message count
          if (data.unreadMessageCount !== undefined) {
            setUnreadMessageCount(data.unreadMessageCount);
          } else {
            // Fallback: fetch separately if not in bootstrap
            fetchUnreadMessageCount();
          }
        }
      } else {
        // Fallback or Handle 401
        console.log('[Auth] Bootstrap failed or no user, handling unauthenticated');
        handleUnauthenticated();
      }
    } catch (error) {
      console.log('[Auth] Bootstrap error:', error);
      handleUnauthenticated();
    } finally {
      setLoading(false);
    }
  };

  const handleUnauthenticated = async () => {
    setUser(null);
    setOnboardingCompleted(false);
    setInviteSent(false);
    setNotifications([]);
    setUnreadCount(0);
    setUnreadMessageCount(0);

    // Clear the httpOnly cookie via API (document.cookie can't clear httpOnly cookies)
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.error('Failed to clear auth cookie', e);
    }

    if (typeof window !== 'undefined') {
      const path = window.location.pathname || '';
      const isProduct = path.startsWith('/product');
      // Use exact match for /product and /product/, but startsWith for /product/auth
      const isPublic =
        path === '/product' ||
        path === '/product/' ||
        path.startsWith('/product/auth');
      if (isProduct && !isPublic) {
        window.location.href = '/product/auth';
      }
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
    notifications,
    unreadCount,
    fetchNotifications,
    setNotifications,
    setUnreadCount,
    unreadMessageCount,
    setUnreadMessageCount,
    fetchUnreadMessageCount
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
