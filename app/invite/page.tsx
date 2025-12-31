'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Send, ArrowRight, Users, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';

export default function InvitePage() {
  const { user, markInviteSent, loading } = useAuth();
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteData, setInviteData] = useState({
    recipientEmail: '',
    message: ''
  });

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/product/auth';
    }
  }, [user, loading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setInviteData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteData.recipientEmail.trim()) {
      toast.error('Please enter recipient email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteData.recipientEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Don't allow inviting yourself
    if (inviteData.recipientEmail.toLowerCase() === user?.email?.toLowerCase()) {
      toast.error('You cannot invite yourself');
      return;
    }

    setInviteLoading(true);
    try {
      const response = await fetch('/api/invites/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          recipient_email: inviteData.recipientEmail,
          message: inviteData.message || 'Join me on Business Orbit!'
        }),
      });

      if (response.ok) {
        toast.success('Invite sent successfully!');
        
        // Mark invite as sent and redirect to onboarding
        markInviteSent();
        
        // Redirect to onboarding after successful invite
        setTimeout(() => {
          window.location.href = '/product/onboarding';
        }, 1000);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to send invite');
      }
    } catch (error) {
      console.error('Send invite error:', error);
      toast.error('Failed to send invite');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleSkipInvite = () => {
    toast.success('Skipping invite - proceeding to onboarding');
    markInviteSent();
    window.location.href = '/product/onboarding';
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Invite Your Network! 📧
          </h1>
          <p className="text-gray-600">
            Start building your professional network by inviting colleagues and friends to join Business Orbit.
          </p>
        </div>

        {/* Invite Card */}
        <Card className="p-8 shadow-xl">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Send an Invitation</h2>
            <p className="text-gray-600">
              Invite someone to join Business Orbit and expand your professional network.
            </p>
          </div>

          <form onSubmit={handleSendInvite} className="space-y-6">
            {/* Recipient Email */}
            <div>
              <label htmlFor="recipientEmail" className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Email *
              </label>
              <Input
                type="email"
                id="recipientEmail"
                name="recipientEmail"
                value={inviteData.recipientEmail}
                onChange={handleInputChange}
                placeholder="colleague@company.com"
                required
              />
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Personal Message (Optional)
              </label>
              <Textarea
                id="message"
                name="message"
                value={inviteData.message}
                onChange={handleInputChange}
                placeholder="Hey! I think you'd love Business Orbit. It's a great platform for professionals like us to connect and grow together."
                rows={4}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="submit"
                disabled={inviteLoading}
                className="flex items-center justify-center space-x-2"
              >
                {inviteLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Send Invite</span>
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleSkipInvite}
                className="flex items-center justify-center space-x-2"
              >
                <ArrowRight className="h-4 w-4" />
                <span>Skip for Now</span>
              </Button>
            </div>
          </form>
        </Card>

        {/* Benefits Section */}
        <Card className="mt-8 p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Why Invite Others?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Expand Your Network</h4>
                <p className="text-sm text-gray-600">Connect with more professionals in your field</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Build Relationships</h4>
                <p className="text-sm text-gray-600">Create meaningful professional connections</p>
              </div>
            </div>
          </div>
        </Card>

        {/* User Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Logged in as <span className="font-medium text-gray-700">{user?.email}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
