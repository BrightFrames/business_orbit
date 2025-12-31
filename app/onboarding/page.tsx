'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Check, ChevronLeft, ChevronRight, MapPin, Users, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import toast from 'react-hot-toast';

interface OnboardingData {
  chapters: string[];
  secretGroups: string[];
}

interface AvailableData {
  chapters: string[];
  secretGroups: string[];
}

export default function OnboardingPage() {
  const { user, completeOnboarding, loading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    chapters: [],
    secretGroups: []
  });
  const [availableData, setAvailableData] = useState<AvailableData>({
    chapters: [],
    secretGroups: []
  });
  const [inviteLink, setInviteLink] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [inviteEmails, setInviteEmails] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/product/auth';
    }
  }, [user, loading]);

  // Fetch available chapters and secret groups
  useEffect(() => {
    const fetchOnboardingData = async () => {
      try {
        const response = await fetch('/api/preferences');
        const data = await response.json();
        setAvailableData(data);
      } catch (error) {
        toast.error('Failed to load onboarding data');
      }
    };

    fetchOnboardingData();
  }, []);

  // Check if user has already completed onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) return;
      
      try {
        const response = await fetch(`/api/preferences/${user.id}`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.onboardingCompleted) {
            // Redirect to subscription page after onboarding completed
            window.location.href = '/product/subscription';
          }
        }
      } catch (error) {
        // Error checking onboarding status
      }
    };

    checkOnboardingStatus();
  }, [user]);

  const handleSelection = (type: 'chapters' | 'secretGroups', item: string) => {
    setOnboardingData(prev => {
      const currentSelection = prev[type];
      const isSelected = currentSelection.includes(item);
      
      let newSelection: string[];
      if (isSelected) {
        // Remove item if already selected
        newSelection = currentSelection.filter(i => i !== item);
      } else {
        // For chapters: allow at least 1 (can select up to 5)
        // For secret groups: no limit
        const maxLimit = type === 'chapters' ? 5 : 10;
        if (currentSelection.length < maxLimit) {
          newSelection = [...currentSelection, item];
        } else {
          const itemType = type === 'chapters' ? 'chapters' : 'secret groups';
          toast.error(`You can select up to ${maxLimit} ${itemType}`);
          return prev;
        }
      }
      
      return {
        ...prev,
        [type]: newSelection
      };
    });
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (onboardingData.chapters.length < 1) {
        toast.error('Please select at least 1 chapter to continue');
        return;
      }
      // Complete onboarding after chapter selection (secret groups step commented out)
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const handleFinish = async () => {
    // Secret groups step commented out - users can join secret groups later from /product/groups
    // if (onboardingData.secretGroups.length === 0) {
    //   toast.error('Please select at least 1 secret group');
    //   return;
    // }

    setOnboardingLoading(true);
    try {
      // Save preferences (existing)
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          chapters: onboardingData.chapters,
          secretGroups: [] // Secret groups step commented out - users can join later from /product/groups
        }),
      });

      // Also create memberships for the chosen chapter locations
      const locationsPayload = {
        locations: onboardingData.chapters,
      };
      
      const chapterResponse = await fetch('/api/onboarding/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(locationsPayload),
      });
      
      const chapterData = await chapterResponse.json();
      
      if (!chapterResponse.ok || !chapterData.success) {
        // Show detailed error message
        if (chapterData.details && chapterData.details.available_cities) {
          toast.error(`Chapters not found for: ${chapterData.details.requested.join(', ')}. Available cities: ${chapterData.details.available_cities.join(', ')}`);
        } else {
          toast.error(chapterData.message || 'Failed to join chapters. Please contact admin to create chapters for your selected locations.');
        }
        return;
      }
      
      toast.success(`Successfully joined ${chapterData.memberships} chapters!`);

      // Secret groups step commented out - users can join secret groups later from /product/groups
      // Join selected secret groups
      // let joinedGroupsCount = 0;
      // for (const groupName of onboardingData.secretGroups) {
      //   try {
      //     // First, find the group by name
      //     const groupsResponse = await fetch('/api/admin/management/secret-groups', {
      //       credentials: 'include'
      //     });
      //     
      //     if (groupsResponse.ok) {
      //       const groupsData = await groupsResponse.json();
      //       const group = groupsData.groups.find((g: any) => g.name === groupName);
      //       
      //       if (group) {
      //         // Join the group
      //         const joinResponse = await fetch(`/api/secret-groups/${encodeURIComponent(group.id)}/membership`, {
      //           method: 'POST',
      //           credentials: 'include',
      //           headers: { 'Content-Type': 'application/json' },
      //         }              );
      //         
      //         if (joinResponse.ok) {
      //           joinedGroupsCount++;
      //         }
      //       }
      //     }
      //   } catch (error) {
      //     // Error joining group
      //   }
      // }

      // if (joinedGroupsCount > 0) {
      //   toast.success(`Successfully joined ${joinedGroupsCount} secret groups!`);
      // }

      if (response.ok) {
        // Update the onboarding status in context
        completeOnboarding();
        
        toast.success('Onboarding completed successfully!');
        
        // Small delay to ensure state updates
        setTimeout(() => {
          window.location.href = '/product/subscription';
        }, 100);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to save preferences');
      }
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setOnboardingLoading(false);
    }
  };

  // Also send chapter memberships to backend (no secret groups)
  useEffect(() => {
    // when both selections exist, post to chapters onboarding
    // We keep it explicit by posting after Finish click too if needed
  }, [])

  const renderSelectionCard = (
    type: 'chapters' | 'secretGroups',
    items: string[],
    selectedItems: string[],
    icon: React.ReactNode,
    title: string,
    description: string
  ) => (
    <Card className="p-6 shadow-xl">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-gray-100 rounded-lg">
          {icon}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-600">{description}</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Selected: {selectedItems.length} / {type === 'chapters' ? '5' : '10'} {type === 'chapters' ? '(Minimum 1 Required)' : ''}
          </span>
          {((type === 'chapters' && selectedItems.length >= 1) || (type === 'secretGroups' && selectedItems.length >= 1)) && (
            <span className="text-sm text-green-600 font-medium flex items-center">
              <Check className="h-4 w-4 mr-1" />
              Ready
            </span>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div 
            className="bg-black h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min((selectedItems.length / (type === 'chapters' ? 5 : 10)) * 100, 100)}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((item) => {
          const isSelected = selectedItems.includes(item);
          return (
            <button
              key={item}
              onClick={() => handleSelection(type, item)}
              className={`p-3 rounded-lg border-2 transition-all duration-200 text-sm font-medium cursor-pointer ${
                isSelected
                  ? 'border-black bg-black text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>

      {selectedItems.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-800 mb-2">Selected:</p>
          <div className="flex flex-wrap gap-2">
            {selectedItems.map((item) => (
              <span
                key={item}
                className="px-2 py-1 bg-gray-200 text-gray-800 rounded-full text-xs font-medium"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-8">
      <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-gray-900' : 'text-gray-400'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          currentStep >= 1 ? 'bg-black text-white' : 'bg-gray-200'
        }`}>
          1
        </div>
        <span className="font-medium">Chapters</span>
      </div>
      
      {/* Secret Groups step commented out - users can join secret groups later from /product/groups */}
      {/* <div className="w-12 h-0.5 bg-gray-300"></div>
      
      <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-gray-900' : 'text-gray-400'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          currentStep >= 2 ? 'bg-black text-white' : 'bg-gray-200'
        }`}>
          2
        </div>
        <span className="font-medium">Secret Groups</span>
      </div> */}
    </div>
  );

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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Business Orbit
          </h1>
          <p className="text-gray-600">
            Let's personalize your experience by selecting your preferred chapters and secret groups.
          </p>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Content */}
        <div className="mb-8">
          {currentStep === 1 && (
            renderSelectionCard(
              'chapters',
              availableData.chapters,
              onboardingData.chapters,
              <MapPin className="h-6 w-6 text-gray-600" />,
              'Select Your Chapters (Minimum 1 Required)',
              'Please select at least 1 chapter to join. You can select up to 5 chapters total. These will help us connect you with like-minded professionals in your area.'
            )
          )}

          {/* Secret Groups step commented out - users can join secret groups later from /product/groups */}
          {/* {currentStep === 2 && (
            <>
              {renderSelectionCard(
                'secretGroups',
                availableData.secretGroups,
                onboardingData.secretGroups,
                <Users className="h-6 w-6 text-gray-600" />,
                'Join Secret Groups',
                'Select secret groups that match your interests and professional goals. These exclusive communities will enhance your networking experience.'
              )}

              <Card className="p-6 mt-6">
                <h3 className="text-xl font-semibold mb-2">Join or Create a Secret Group</h3>
                <p className="text-sm text-gray-600 mb-4">Optional: you can paste an invite link or create a group now, or skip and do it later.</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Paste your invite link here</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://businessorbit.app/join/a1b2c3d4"
                        value={inviteLink}
                        onChange={(e) => setInviteLink(e.target.value)}
                      />
                      <Button
                        onClick={() => {
                          const valid = /^https?:\/\/([\w.-]+)\/.+\/(join)\/[A-Za-z0-9_-]+$/.test(inviteLink.trim());
                          if (valid) {
                            toast.success('Invite link looks valid. We\'ll process this after onboarding.');
                          } else {
                            toast.error('Invalid invite link. Please check the link and try again.');
                          }
                        }}
                      >
                        Validate
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Or create a new group</label>
                    <Button onClick={() => setShowCreateDialog(true)}>Create a Secret Group</Button>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => toast.success('You can set up groups later from the app.')}
                      className="text-sm underline"
                    >
                      Skip for now
                    </button>
                  </div>
                </div>
              </Card>

              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create a Secret Group</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Input
                      placeholder="Group Name"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                    />
                    <Textarea
                      placeholder="Invite by Email (comma-separated)"
                      value={inviteEmails}
                      onChange={(e) => setInviteEmails(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                    <Button
                      onClick={() => {
                        if (!groupName.trim()) {
                          toast.error('Group Name is required');
                          return;
                        }
                        const emails = inviteEmails.split(',').map(e => e.trim()).filter(Boolean);
                        const invalid = emails.some(e => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
                        if (invalid) {
                          toast.error('One or more emails are invalid');
                          return;
                        }
                        toast.success('We\'ll create the group and send invites after onboarding.');
                        setShowCreateDialog(false);
                      }}
                    >
                      Continue
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )} */}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-end">
          {/* Previous button removed since secret groups step is commented out */}
          {/* <Button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            variant="outline"
            className="flex items-center space-x-2 cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" />
            <span>Previous</span>
          </Button> */}

          <div className="flex items-center space-x-3">
            {/* Secret groups step commented out - finish onboarding after chapter selection */}
            <Button
              onClick={handleNext}
              disabled={onboardingData.chapters.length < 1 || onboardingLoading}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <span>{onboardingLoading ? 'Saving...' : 'Finish Setup'}</span>
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
