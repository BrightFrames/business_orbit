"use client";

import { Navigation } from "@/components/navigation";
import { Card } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, Calendar, MessageSquare } from "lucide-react";

export default function AdminAnalytics() {
  const analyticsData = [
    { label: "Total Users", value: "1,234", change: "+12%", icon: Users },
    { label: "Active Events", value: "8", change: "+2", icon: Calendar },
    { label: "Messages Sent", value: "456", change: "+23%", icon: MessageSquare },
    { label: "Engagement Rate", value: "78%", change: "+5%", icon: TrendingUp },
  ];

  const chartData = [
    { month: "Jan", users: 100, events: 5 },
    { month: "Feb", users: 150, events: 7 },
    { month: "Mar", users: 200, events: 8 },
    { month: "Apr", users: 250, events: 10 },
    { month: "May", users: 300, events: 12 },
    { month: "Jun", users: 350, events: 15 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-20 lg:pb-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Platform performance and user insights</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {analyticsData.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label} className="p-6 shadow-elevated border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                    <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                    <p className="text-sm text-green-600">{metric.change}</p>
                  </div>
                  <div className="p-3 bg-accent rounded-full">
                    <Icon className="w-6 h-6 text-foreground" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User Growth Chart */}
          <Card className="p-6 shadow-elevated border-border/50">
            <h3 className="text-lg font-semibold text-foreground mb-4">User Growth</h3>
            <div className="space-y-3">
              {chartData.map((data) => (
                <div key={data.month} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{data.month}</span>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">{data.users} users</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">{data.events} events</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Activity Overview */}
          <Card className="p-6 shadow-elevated border-border/50">
            <h3 className="text-lg font-semibold text-foreground mb-4">Activity Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Daily Active Users</span>
                <span className="font-semibold">234</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Weekly Events</span>
                <span className="font-semibold">12</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Messages Today</span>
                <span className="font-semibold">89</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">New Registrations</span>
                <span className="font-semibold">15</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="p-6 shadow-elevated border-border/50">
          <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">New user registered: John Doe</span>
              </div>
              <span className="text-xs text-muted-foreground">2 minutes ago</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm">Event created: Tech Meetup</span>
              </div>
              <span className="text-xs text-muted-foreground">15 minutes ago</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm">Member approved: Sarah Wilson</span>
              </div>
              <span className="text-xs text-muted-foreground">1 hour ago</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
