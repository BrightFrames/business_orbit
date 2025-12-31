'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Check, Star, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SubscriptionPlan {
  id: string;
  name: string;
  tagline: string;
  price: string;
  period: string;
  features: string[];
  savings?: string;
  popular?: boolean;
}

export default function SubscriptionPage() {
  const { user, loading } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const plans: SubscriptionPlan[] = [
    {
      id: 'monthly',
      name: 'Monthly Plan',
      tagline: 'Perfect for getting started',
      price: '₹1000',
      period: 'Month',
      features: [
        'Full access to all features',
        'Priority support',
        'Cancel anytime'
      ]
    },
    {
      id: '6months',
      name: '6 Months Plan',
      tagline: 'Most popular choice',
      price: '₹3500',
      period: '6 Months',
      features: [
        'Full access to all features',
        'Priority support',
        'Cancel anytime',
        'Save ₹2500'
      ],
      savings: '₹2500',
      popular: true
    },
    {
      id: 'yearly',
      name: 'Yearly Plan',
      tagline: 'Best value for long-term',
      price: '₹7000',
      period: '12 Months',
      features: [
        'Full access to all features',
        'Priority support',
        'Cancel anytime',
        'Save ₹5000'
      ],
      savings: '₹5000'
    }
  ];

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/product/auth';
    }
  }, [user, loading]);

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleProceedToPay = () => {
    if (!selectedPlan) return;
    // Here you would integrate with payment gateway
    window.location.href = '/product/connection';
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
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
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Subscription Plan
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Unlock the full potential of Business Orbit with our flexible subscription plans. Choose the plan that best fits your needs and start growing your network today.
          </p>
        </div>

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`relative p-8 shadow-lg border-2 transition-all duration-200 cursor-pointer ${
                selectedPlan === plan.id 
                  ? 'border-gray-900 shadow-xl' 
                  : 'border-gray-200 hover:border-gray-300'
              } ${plan.popular ? 'pt-12' : ''}`}
              onClick={() => handlePlanSelect(plan.id)}
            >
              {/* Most Popular Badge */}
              {plan.popular && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-black text-white px-4 py-2 rounded-full text-sm font-medium flex items-center space-x-1">
                    <Star className="h-4 w-4" />
                    <span>Most Popular</span>
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-4">{plan.tagline}</p>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {plan.price}
                </div>
                <p className="text-gray-600">/ {plan.period}</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">
                      {feature.includes('Save') ? (
                        <span className="text-green-600 font-medium">{feature}</span>
                      ) : (
                        feature
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        {/* Proceed to Pay Button */}
        <div className="text-center mb-12">
          <Button
            onClick={handleProceedToPay}
            disabled={!selectedPlan}
            className={`px-8 py-4 text-lg rounded-lg transition-all duration-200 ${
              selectedPlan 
                ? 'bg-gray-900 text-white hover:bg-gray-800' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Wallet className="h-5 w-5 mr-2" />
            Proceed to Pay
          </Button>
          {!selectedPlan && (
            <p className="text-sm text-gray-500 mt-2">
              Please select a subscription plan to continue
            </p>
          )}
        </div>

        {/* What's Included Section */}
        <Card className="p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            What's Included in All Plans?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
              <span className="text-gray-700">Access to all chapters and secret groups</span>
            </div>
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
              <span className="text-gray-700">Unlimited networking opportunities</span>
            </div>
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
              <span className="text-gray-700">Priority customer support</span>
            </div>
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
              <span className="text-gray-700">Cancel anytime, no questions asked</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
