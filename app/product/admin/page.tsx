"use client";

import React, { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MessageSquare, Calendar, Users, Settings, MapPinned } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface AdminStat {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface AdminAction {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export default function AdminDashboard(): React.JSX.Element | null {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [chatStats, setChatStats] = useState({
    totalMessages: 0,
    activeConversations: 0,
    totalUsers: 0,
    totalChapters: 0
  });
  const [memberStats, setMemberStats] = useState({
    totalMembers: 0,
    pendingApprovals: 0,
    activeEvents: 0
  });
  const [loading, setLoading] = useState(true);

  // Check admin authentication
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // Redirect to auth page if not authenticated
        router.push('/product/auth?admin=true');
        return;
      }
      if (user && !isAdmin) {
        // If user is logged in but not admin, redirect to profile
        router.push('/product/profile');
        return;
      }
    }
  }, [user, isAdmin, authLoading, router]);

  useEffect(() => {
    const fetchAllStats = async () => {
      try {
        // Fetch chat analytics
        const chatResponse = await fetch('/api/admin/analytics/chat?days=30', {
          credentials: 'include'
        });
        
        if (chatResponse.ok) {
          const chatData = await chatResponse.json();
          setChatStats({
            totalMessages: chatData.data.totalMessages,
            activeConversations: chatData.data.activeConversations,
            totalUsers: chatData.data.performance.totalUsers,
            totalChapters: chatData.data.performance.totalChapters
          });
        }

        // Fetch member statistics
        const statsResponse = await fetch('/api/admin/analytics/chapters', {
          credentials: 'include'
        });
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          if (statsData.success) {
            setMemberStats(prev => ({
              ...prev,
              totalMembers: statsData.stats.totalMembers
            }));
          }
        }

        // Fetch events count
        const eventsResponse = await fetch('/api/admin/management/events', {
          credentials: 'include'
        });
        
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          const activeEvents = Array.isArray(eventsData) 
            ? eventsData.filter((event: any) => 
                event.status !== 'cancelled' && 
                event.status !== 'completed'
              ).length 
            : 0;
          setMemberStats(prev => ({
            ...prev,
            activeEvents
          }));
        }

      } catch {
      } finally {
        setLoading(false);
      }
    };

    fetchAllStats();
  }, []);

  const adminStats: AdminStat[] = [
    { 
      label: "Total Members", 
      value: loading ? "..." : memberStats.totalMembers.toLocaleString(), 
      icon: Users 
    },
    { 
      label: "Pending Approvals", 
      value: loading ? "..." : memberStats.pendingApprovals.toLocaleString(), 
      icon: Users 
    },
    { 
      label: "Active Events", 
      value: loading ? "..." : memberStats.activeEvents.toLocaleString(), 
      icon: Calendar 
    },
    { 
      label: "Chat Messages", 
      value: loading ? "..." : chatStats.totalMessages.toLocaleString(), 
      icon: MessageSquare 
    },
  ];

  const adminActions: AdminAction[] = [
    {
      title: "Manage Chapters",
      description: "Create and manage chapters",
      href: "/product/admin/chapters",
      icon: MapPinned,
      color: "bg-black",
    },
    {
      title: "Chat Management",
      description: "Monitor and manage chat analytics",
      href: "/product/admin/chat",
      icon: MessageSquare,
      color: "bg-black",
    },
    {
      title: "Event Management",
      description: "Create and manage events",
      href: "/product/admin/events",
      icon: Calendar,
      color: "bg-black",
    },
    {
      title: "Review Members",
      description: "Approve and manage members",
      href: "/product/admin/members",
      icon: Users,
      color: "bg-black",
    },
    {
      title: "Platform Settings",
      description: "Configure platform settings",
      href: "/product/admin/settings",
      icon: Settings,
      color: "bg-black",
    },
  ];

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-3 sm:mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar />
      <div className="flex-1 lg:ml-0">
        <div className="px-3 sm:px-4 md:px-6 lg:px-8 pt-12 sm:pt-3 sm:py-4 md:py-8 pb-16 sm:pb-20 lg:pb-8">
        
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage your Business Orbit Admin platform</p>
        </div>

        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {adminStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="p-4 sm:p-6 shadow-elevated border-border/50">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{stat.label}</p>
                    <p className="text-xl sm:text-2xl font-bold text-foreground truncate">{stat.value}</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-accent rounded-full flex-shrink-0 ml-2">
                    <Icon className="w-4 h-4 sm:w-6 sm:h-6 text-foreground" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
          {adminActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} href={action.href}>
                <Card className="p-4 sm:p-6 shadow-elevated border-border/50 hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer">
                  <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
                    <div className={`p-3 sm:p-4 rounded-full ${action.color}`}>
                      <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <div className="min-w-0 w-full">
                      <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1 sm:mb-2 truncate">{action.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{action.description}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Chat Analytics Overview */}
        <Card className="mt-6 sm:mt-8 p-4 sm:p-6 shadow-elevated border-border/50">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4">Chat Analytics Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
              <p className="text-xs sm:text-sm font-medium text-blue-600">Active Conversations</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-900">
                {loading ? "..." : chatStats.activeConversations}
              </p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
              <p className="text-xs sm:text-sm font-medium text-green-600">Chat Users</p>
              <p className="text-xl sm:text-2xl font-bold text-green-900">
                {loading ? "..." : chatStats.totalUsers}
              </p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg sm:col-span-2 lg:col-span-1">
              <p className="text-xs sm:text-sm font-medium text-purple-600">Active Chapters</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-900">
                {loading ? "..." : chatStats.totalChapters}
              </p>
            </div>
          </div>
        </Card>

        
        <Card className="mt-6 sm:mt-8 p-4 sm:p-6 shadow-elevated border-border/50">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <Button asChild className="h-auto p-3 sm:p-4 flex flex-col items-center space-y-1 sm:space-y-2 text-xs sm:text-sm">
              <Link href="/product/admin/chapters">
                <MapPinned className="w-4 h-4 sm:w-6 sm:h-6 text-black" />
                <span className="truncate">Manage Chapters</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-3 sm:p-4 flex flex-col items-center space-y-1 sm:space-y-2 text-xs sm:text-sm">
              <Link href="/product/admin/chat">
                <MessageSquare className="w-4 h-4 sm:w-6 sm:h-6 text-black" />
                <span className="truncate">Chat Management</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-3 sm:p-4 flex flex-col items-center space-y-1 sm:space-y-2 text-xs sm:text-sm">
              <Link href="/product/admin/events">
                <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-black" />
                <span className="truncate">Event Management</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-3 sm:p-4 flex flex-col items-center space-y-1 sm:space-y-2 text-xs sm:text-sm">
              <Link href="/product/admin/members">
                <Users className="w-4 h-4 sm:w-6 sm:h-6 text-black" />
                <span className="truncate">Review Members</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-3 sm:p-4 flex flex-col items-center space-y-1 sm:space-y-2 text-xs sm:text-sm">
              <Link href="/product/admin/settings">
                <Settings className="w-4 h-4 sm:w-6 sm:h-6 text-black" />
                <span className="truncate">Platform Settings</span>
              </Link>
            </Button>
          </div>
        </Card>
        </div>
      </div>
    </div>
  );
}
