"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Users, 
  Clock, 
  BarChart3, 
  Target,
  Globe,
  Settings
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { io, Socket } from 'socket.io-client';

interface ChatAnalytics {
  totalMessages: number;
  activeConversations: number;
  peakUsage: Array<{ hour: number; count: number }>;
  messagesPerChapter: Array<{
    chapterName: string;
    location: string;
    messageCount: number;
    uniqueSenders: number;
  }>;
  userEngagement: Array<{
    userName: string;
    email: string;
    messageCount: number;
    chaptersActive: number;
  }>;
  dailyActivity: Array<{
    date: string;
    messageCount: number;
    uniqueUsers: number;
    activeChapters: number;
  }>;
  performance: {
    totalMessages: number;
    totalUsers: number;
    totalChapters: number;
    avgMessageLength: number;
  };
}

export default function ChatManagementDashboard() {
  const [analytics, setAnalytics] = useState<ChatAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const CHAT_HTTP_URL = process.env.NEXT_PUBLIC_CHAT_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');
  const CHAT_WS_URL = CHAT_HTTP_URL.replace(/^http/, 'ws');

  const timeRangeOptions = [
    { label: 'Last 7 days', value: 7 },
    { label: 'Last 30 days', value: 30 },
    { label: 'Last 90 days', value: 90 }
  ];

  const fetchAnalytics = async (days: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/analytics/chat?days=${days}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data);
      } else {
        const errorData = await response.json();
        console.error('Analytics fetch error:', errorData);
        setError(`Failed to load analytics: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setError('Network error: Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(timeRange);
  }, [timeRange]);

  // Live updates: connect to socket server read-only and refresh analytics on new messages
  useEffect(() => {
    try {
      const s = io(CHAT_WS_URL, {
        autoConnect: true,
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        withCredentials: true,
      });
      socketRef.current = s;
      
      // Admin monitoring hook available on server; join all rooms for presence if needed
      s.on('connect', () => {
        try { s.emit('joinAllRooms'); } catch {}
      });
      
      // Debounced refresh on activity
      let t: ReturnType<typeof setTimeout> | null = null;
      const scheduleRefresh = () => {
        if (t) clearTimeout(t);
        t = setTimeout(() => fetchAnalytics(timeRange), 800);
      };
      s.on('newMessage', scheduleRefresh);
      s.on('presence', scheduleRefresh);
      
      // Periodic safety refresh every 60s
      refreshTimer.current = setInterval(() => fetchAnalytics(timeRange), 60000);

      const onVis = () => { if (document.visibilityState === 'visible') fetchAnalytics(timeRange); };
      document.addEventListener('visibilitychange', onVis);

      return () => {
        if (t) clearTimeout(t);
        if (refreshTimer.current) clearInterval(refreshTimer.current);
        document.removeEventListener('visibilitychange', onVis);
        const s2 = socketRef.current;
        if (s2) {
          try { s2.emit('leaveAllRooms'); } catch {}
          s2.off('newMessage');
          s2.off('presence');
          s2.off('connect');
          s2.disconnect();
          socketRef.current = null;
        }
      };
    } catch {
      // ignore socket errors for admin dashboard
      return () => {};
    }
  }, [timeRange]);

  // Data transformation functions
  const getPeakHour = () => {
    if (!analytics?.peakUsage?.length) return 'N/A';
    const peak = analytics.peakUsage.reduce((max, curr) => curr.count > max.count ? curr : max);
    return `${peak.hour.toString().padStart(2, '0')}:00`;
  };

  const getPeakUsageData = () => {
    if (!analytics?.peakUsage?.length) return [];
    return analytics.peakUsage.map(item => ({
      time: `${item.hour.toString().padStart(2, '0')}:00`,
      count: item.count
    }));
  };

  const getDailyActivityData = () => {
    if (!analytics?.dailyActivity?.length) return [];
    return analytics.dailyActivity.slice(-14).map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: item.messageCount
    }));
  };

  const getChapterDistributionData = () => {
    if (!analytics?.messagesPerChapter?.length) return [];
    const total = analytics.messagesPerChapter.reduce((sum, chapter) => sum + chapter.messageCount, 0);
    if (total === 0) return [];
    
    const colors = ['#ef4444', '#10b981', '#eab308', '#3b82f6', '#8b5cf6', '#f59e0b'];
    return analytics.messagesPerChapter.slice(0, 6).map((chapter, index) => ({
      name: chapter.chapterName.length > 15 ? chapter.chapterName.substring(0, 15) + '...' : chapter.chapterName,
      value: Math.round((chapter.messageCount / total) * 100),
      color: colors[index % colors.length],
      fullName: chapter.chapterName
    }));
  };

  const getChapterDetails = () => {
    if (!analytics?.messagesPerChapter?.length) return [];
    return analytics.messagesPerChapter.slice(0, 10).map(chapter => ({
      name: chapter.chapterName,
      location: chapter.location,
      activeUsers: chapter.uniqueSenders,
      messages: chapter.messageCount
    }));
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-end">
          <div className="animate-pulse bg-gray-200 h-8 sm:h-10 w-24 sm:w-32 rounded"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 h-20 sm:h-24 rounded"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 h-48 sm:h-64 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-end">
          <div className="flex flex-wrap gap-2">
            {timeRangeOptions.map((option) => (
              <Button
                key={option.value}
                variant={timeRange === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(option.value)}
                className="text-xs sm:text-sm"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
        <Card className="p-4 sm:p-6 border-red-200 bg-red-50">
          <div className="flex items-center space-x-2 text-red-700">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
            <h3 className="text-base sm:text-lg font-semibold">Error Loading Analytics</h3>
          </div>
          <p className="mt-2 text-sm sm:text-base text-red-600">{error}</p>
          <div className="mt-4 space-x-2">
            <Button onClick={() => fetchAnalytics(timeRange)} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8 sm:py-12">
        <MessageSquare className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
        <h3 className="mt-2 text-sm sm:text-base font-medium text-gray-900">No data available</h3>
        <p className="mt-1 text-xs sm:text-sm text-gray-500">Unable to load chat analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Time filters */}
      <div className="flex items-center justify-end">
        <div className="flex flex-wrap gap-2">
          {timeRangeOptions.map((option) => (
            <Button
              key={option.value}
              variant={timeRange === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(option.value)}
              className="text-xs sm:text-sm"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Messages</p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{analytics.totalMessages.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Last {timeRange} days</p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-100 rounded-full flex-shrink-0">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Active Conversations</p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{analytics.activeConversations}</p>
              <p className="text-xs text-muted-foreground mt-1">Chapters with activity</p>
            </div>
            <div className="p-2 sm:p-3 bg-green-100 rounded-full flex-shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Peak Hour</p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{getPeakHour()}</p>
              <p className="text-xs text-muted-foreground mt-1">Most active time</p>
            </div>
            <div className="p-2 sm:p-3 bg-orange-100 rounded-full flex-shrink-0">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Avg Message Length</p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{Math.round(analytics.performance.avgMessageLength)}</p>
              <p className="text-xs text-muted-foreground mt-1">Characters per message</p>
            </div>
            <div className="p-2 sm:p-3 bg-purple-100 rounded-full flex-shrink-0">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Peak Usage Chart */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold">Peak Usage Times</h3>
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          </div>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getPeakUsageData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  fontSize={10}
                  tick={{ fontSize: 10 }}
                />
                <YAxis fontSize={10} tick={{ fontSize: 10 }} />
                <Tooltip 
                  labelFormatter={(value) => `Time: ${value}`}
                  formatter={(value) => [value, 'Messages']}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Daily Activity Chart */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold">Daily Activity</h3>
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          </div>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getDailyActivityData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  fontSize={10}
                  tick={{ fontSize: 10 }}
                />
                <YAxis fontSize={10} tick={{ fontSize: 10 }} />
                <Tooltip 
                  labelFormatter={(value) => `Date: ${value}`}
                  formatter={(value) => [value, 'Activity']}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Chapter Data Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Chapter Distribution Pie Chart */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold">Chapter Distribution</h3>
            <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          </div>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={getChapterDistributionData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${percent}%`}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getChapterDistributionData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chapter Activity Bar Chart (Empty as shown in screenshot) */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold">Chapter Activity</h3>
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          </div>
          <div className="h-48 sm:h-64 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
              <p className="text-xs sm:text-sm">No data available</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Chapter Details List */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-semibold">Chapter Details</h3>
          <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
        </div>
        <div className="space-y-3">
          {getChapterDetails().map((chapter, index) => (
            <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg gap-2 sm:gap-0">
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                  <h4 className="font-medium truncate">{chapter.name}</h4>
                  <Badge variant="secondary" className="w-fit text-xs">{chapter.location}</Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {chapter.activeUsers} active users
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-base sm:text-lg font-semibold">{chapter.messages}</p>
                <p className="text-xs text-muted-foreground">messages</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
