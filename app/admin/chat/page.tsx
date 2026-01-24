"use client";

import { useState } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import ChatManagementDashboard from "@/components/admin/ChatManagementDashboard";
import AdminSetup from "@/components/admin/AdminSetup";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BarChart3, Shield } from "lucide-react";

export default function AdminChatPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'setup'>('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Analytics Dashboard', icon: BarChart3 },
    { id: 'setup', label: 'Admin Setup', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar />
      <div className="flex-1 lg:ml-0">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-20 lg:pb-8">
          {/* Header */}
          <div className="mb-8">
            <div className="mb-4 mt-12 lg:mt-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Chat Management Dashboard</h1>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <p className="text-sm sm:text-base text-muted-foreground">Monitor and manage chat activity across all chapters</p>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">Admin Setup</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <Card className="p-1 mb-6">
            <div className="flex space-x-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "default" : "ghost"}
                    onClick={() => setActiveTab(tab.id as any)}
                    className="flex-1 justify-start"
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </Button>
                );
              })}
            </div>
          </Card>

          {/* Tab Content */}
          {activeTab === 'dashboard' && <ChatManagementDashboard />}
          {activeTab === 'setup' && <AdminSetup />}
        </div>
      </div>
    </div>
  );
}
