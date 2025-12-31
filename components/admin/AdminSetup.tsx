"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  CheckCircle, 
  User, 
  Shield, 
  Users, 
  Activity, 
  Database, 
  Clock,
  AlertTriangle,
  Settings,
  BarChart3,
  Globe,
  MessageSquare,
  TrendingUp
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface User {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  last_active?: string;
  message_count?: number;
  chapters_joined?: number;
}

interface SystemStats {
  totalUsers: number;
  totalAdmins: number;
  totalChapters: number;
  totalMessages: number;
  activeUsers: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  databaseStatus: 'connected' | 'disconnected';
  lastBackup?: string;
}

interface AdminActivity {
  id: number;
  admin_name: string;
  action: string;
  target_user?: string;
  timestamp: string;
}

export default function AdminSetup() {
  const [users, setUsers] = useState<User[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [adminActivities, setAdminActivities] = useState<AdminActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'settings' | 'logs'>('overview');
  const socketRef = useRef<Socket | null>(null);
  const CHAT_HTTP_URL = process.env.NEXT_PUBLIC_CHAT_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');
  const CHAT_WS_URL = CHAT_HTTP_URL.replace(/^http/, 'ws');

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/setup-admin', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchSystemStats = async () => {
    try {
      const response = await fetch('/api/admin/analytics/chat?days=30', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSystemStats({
          totalUsers: data.data.performance.totalUsers,
          totalAdmins: users.filter(u => u.is_admin).length,
          totalChapters: data.data.performance.totalChapters,
          totalMessages: data.data.performance.totalMessages,
          activeUsers: data.data.activeConversations,
          systemHealth: 'healthy',
          databaseStatus: 'connected',
          lastBackup: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to fetch system stats:', error);
    }
  };

  const fetchAdminActivities = async () => {
    try {
      // Mock data for now - in real implementation, this would come from an API
      const mockActivities: AdminActivity[] = [
        {
          id: 1,
          admin_name: 'System Admin',
          action: 'Made user admin',
          target_user: 'john@example.com',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString()
        },
        {
          id: 2,
          admin_name: 'System Admin',
          action: 'Updated system settings',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
        },
        {
          id: 3,
          admin_name: 'System Admin',
          action: 'Viewed analytics dashboard',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString()
        }
      ];
      setAdminActivities(mockActivities);
    } catch (error) {
      console.error('Failed to fetch admin activities:', error);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchUsers(),
        fetchSystemStats(),
        fetchAdminActivities()
      ]);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const makeAdmin = async (userEmail: string) => {
    try {
      const response = await fetch('/api/admin/setup-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: userEmail })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage(data.message);
        setMessageType('success');
        fetchAllData(); // Refresh all data
        setEmail(''); // Clear the input
      } else {
        setMessage(data.error);
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Failed to make user admin');
      setMessageType('error');
    }
  };

  // Real-time updates
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
      
      s.on('connect', () => {
        try { s.emit('joinAllRooms'); } catch {}
      });
      
      // Refresh data on user activity
      s.on('newMessage', () => {
        fetchSystemStats();
      });
      
      s.on('presence', () => {
        fetchSystemStats();
      });

      return () => {
        const s2 = socketRef.current;
        if (s2) {
          try { s2.emit('leaveAllRooms'); } catch {}
          s2.disconnect();
          socketRef.current = null;
        }
      };
    } catch {
      return () => {};
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 h-20 sm:h-24 rounded"></div>
          ))}
        </div>
        <div className="animate-pulse bg-gray-200 h-48 sm:h-64 rounded"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'logs', label: 'Activity Logs', icon: Activity }
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Tab Navigation */}
      <Card className="p-1">
        <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                onClick={() => setActiveTab(tab.id as any)}
                className="flex-1 justify-start text-sm sm:text-base"
              >
                <Icon className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </Button>
            );
          })}
        </div>
      </Card>

      {/* Messages */}
      {message && (
        <div className={`p-3 rounded-lg flex items-center space-x-2 ${
          messageType === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {messageType === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message}</span>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4 sm:space-y-6">
          {/* System Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Users</p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{systemStats?.totalUsers || 0}</p>
                </div>
                <div className="p-2 sm:p-3 bg-blue-100 rounded-full flex-shrink-0">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Admins</p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{systemStats?.totalAdmins || 0}</p>
                </div>
                <div className="p-2 sm:p-3 bg-green-100 rounded-full flex-shrink-0">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Chapters</p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{systemStats?.totalChapters || 0}</p>
                </div>
                <div className="p-2 sm:p-3 bg-orange-100 rounded-full flex-shrink-0">
                  <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Messages</p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{systemStats?.totalMessages || 0}</p>
                </div>
                <div className="p-2 sm:p-3 bg-purple-100 rounded-full flex-shrink-0">
                  <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* System Health */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold">System Health</h3>
                <div className={`p-2 rounded-full ${
                  systemStats?.systemHealth === 'healthy' ? 'bg-green-100' :
                  systemStats?.systemHealth === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  {systemStats?.systemHealth === 'healthy' ? (
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  ) : systemStats?.systemHealth === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">Database Status</span>
                  <Badge variant={systemStats?.databaseStatus === 'connected' ? 'default' : 'destructive'} className="text-xs">
                    {systemStats?.databaseStatus || 'Unknown'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">Active Users</span>
                  <span className="text-sm sm:text-base font-medium">{systemStats?.activeUsers || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">Last Backup</span>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {systemStats?.lastBackup ? new Date(systemStats.lastBackup).toLocaleDateString() : 'Never'}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold">Quick Actions</h3>
                <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              </div>
              <div className="space-y-2 sm:space-y-3">
                <Button className="w-full justify-start text-sm" variant="outline">
                  <Database className="w-4 h-4 mr-2" />
                  Backup Database
                </Button>
                <Button className="w-full justify-start text-sm" variant="outline">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
                <Button className="w-full justify-start text-sm" variant="outline">
                  <Activity className="w-4 h-4 mr-2" />
                  System Logs
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4 sm:space-y-6">
          <Card className="p-4 sm:p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              <h2 className="text-lg sm:text-xl font-semibold">User Management</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Make User Admin by Email</label>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <Input
                    type="email"
                    placeholder="Enter user email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => makeAdmin(email)}
                    disabled={!email}
                    className="w-full sm:w-auto"
                  >
                    Make Admin
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4">All Users ({users.length})</h3>
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg gap-3 sm:gap-0">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <User className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{user.name}</p>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">{user.email}</p>
                      <p className="text-xs text-gray-500">
                        Joined: {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {user.is_admin ? (
                      <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                        Admin
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => makeAdmin(user.email)}
                        className="text-xs"
                      >
                        Make Admin
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <Card className="p-4 sm:p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            <h2 className="text-lg sm:text-xl font-semibold">Platform Settings</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Platform Name</label>
              <Input placeholder="Business Orbit" className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Max Users per Chapter</label>
              <Input type="number" placeholder="100" className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Message Retention (days)</label>
              <Input type="number" placeholder="30" className="w-full" />
            </div>
            <Button className="w-full sm:w-auto">Save Settings</Button>
          </div>
        </Card>
      )}

      {/* Activity Logs Tab */}
      {activeTab === 'logs' && (
        <Card className="p-4 sm:p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            <h2 className="text-lg sm:text-xl font-semibold">Admin Activity Logs</h2>
          </div>
          <div className="space-y-3">
            {adminActivities.map((activity) => (
              <div key={activity.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg gap-2 sm:gap-0">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base">{activity.action}</p>
                    <p className="text-xs sm:text-sm text-gray-600">
                      by {activity.admin_name}
                      {activity.target_user && ` • Target: ${activity.target_user}`}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(activity.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}


