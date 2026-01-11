'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Search, Filter, ArrowRight, CheckCircle, User, MapPin, Building, Briefcase, MessageCircle, UserMinus, UserPlus, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

interface Connection {
  id: number;
  name: string;
  profession: string;
  profile_photo_url: string | null;
  isConnected: boolean;
  connectionRequestSent: boolean;
  connectionRequestReceived: boolean;
  requestId?: number; // For accepting/declining/cancelling
}

interface PendingRequest {
  id: number;
  requesterId: number;
  requesterName: string;
  requesterPhoto: string | null;
}

export default function ConnectionsPage() {
  const { user, loading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loadingStates, setLoadingStates] = useState<{ [key: number]: string }>({});
  const [isSearching, setIsSearching] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Debounced search
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setConnections([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&category=people&limit=20`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success && Array.isArray(data.people)) {
        // Get follow status for these users
        const userIds = data.people.map((p: any) => p.id).join(',');
        let followStatus: Record<number, string> = {};

        if (userIds) {
          const statusResponse = await fetch(`/api/follow?checkStatus=true&userIds=${userIds}`, {
            credentials: 'include'
          });
          const statusData = await statusResponse.json();
          if (statusData.success) {
            followStatus = statusData.followStatus || {};
          }
        }

        // Get sent requests to map request IDs
        const sentResponse = await fetch('/api/follow-requests?type=sent', {
          credentials: 'include'
        });
        const sentData = await sentResponse.json();
        const sentRequestsMap: Record<number, number> = {};
        if (sentData.success && Array.isArray(sentData.requests)) {
          sentData.requests.forEach((req: any) => {
            sentRequestsMap[req.targetId] = req.id;
          });
        }

        const mappedConnections: Connection[] = data.people
          .filter((p: any) => p.id !== user?.id) // Exclude current user
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            profession: p.profession || 'Professional',
            profile_photo_url: p.profile_photo_url,
            isConnected: followStatus[p.id] === 'following',
            connectionRequestSent: followStatus[p.id] === 'pending',
            connectionRequestReceived: false,
            requestId: sentRequestsMap[p.id]
          }));

        setConnections(mappedConnections);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  }, [user?.id]);

  // Fetch pending requests on mount
  useEffect(() => {
    const fetchPendingRequests = async () => {
      if (!user) return;

      try {
        const response = await fetch('/api/follow-requests?type=received', {
          credentials: 'include'
        });
        const data = await response.json();

        if (data.success && Array.isArray(data.requests)) {
          setPendingRequests(data.requests);
        }
      } catch (error) {
        console.error('Error fetching pending requests:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    if (!loading && user) {
      fetchPendingRequests();
    }
  }, [user, loading]);

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/product/auth';
    }
  }, [user, loading]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        searchUsers(searchTerm);
      } else {
        setConnections([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchUsers]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleConnect = async (connectionId: number) => {
    setLoadingStates(prev => ({ ...prev, [connectionId]: 'connecting' }));

    try {
      const response = await fetch('/api/follow-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetUserId: connectionId })
      });

      const data = await response.json();

      if (data.success) {
        setConnections(prev =>
          prev.map(conn =>
            conn.id === connectionId
              ? { ...conn, connectionRequestSent: true }
              : conn
          )
        );
        toast.success('Connection request sent successfully!');
      } else {
        toast.error(data.error || 'Failed to send request');
      }
    } catch (error) {
      console.error('Connect error:', error);
      toast.error('Failed to send connection request');
    } finally {
      setLoadingStates(prev => ({ ...prev, [connectionId]: '' }));
    }
  };

  const handleDisconnect = async (connectionId: number) => {
    setLoadingStates(prev => ({ ...prev, [connectionId]: 'disconnecting' }));

    try {
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetUserId: connectionId, action: 'unfollow' })
      });

      const data = await response.json();

      if (data.success) {
        setConnections(prev =>
          prev.map(conn =>
            conn.id === connectionId
              ? { ...conn, isConnected: false, connectionRequestSent: false }
              : conn
          )
        );
        toast.success('Disconnected successfully!');
      } else {
        toast.error(data.error || 'Failed to disconnect');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect');
    } finally {
      setLoadingStates(prev => ({ ...prev, [connectionId]: '' }));
    }
  };

  const handleAcceptConnection = async (requestId: number, requesterId: number) => {
    setLoadingStates(prev => ({ ...prev, [requesterId]: 'accepting' }));

    try {
      const response = await fetch(`/api/follow-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'accept' })
      });

      const data = await response.json();

      if (data.success) {
        setPendingRequests(prev => prev.filter(req => req.id !== requestId));
        toast.success('Connection accepted!');
      } else {
        toast.error(data.error || 'Failed to accept request');
      }
    } catch (error) {
      console.error('Accept error:', error);
      toast.error('Failed to accept request');
    } finally {
      setLoadingStates(prev => ({ ...prev, [requesterId]: '' }));
    }
  };

  const handleDeclineConnection = async (requestId: number, requesterId: number) => {
    setLoadingStates(prev => ({ ...prev, [requesterId]: 'declining' }));

    try {
      const response = await fetch(`/api/follow-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'decline' })
      });

      const data = await response.json();

      if (data.success) {
        setPendingRequests(prev => prev.filter(req => req.id !== requestId));
        toast.success('Connection request declined');
      } else {
        toast.error(data.error || 'Failed to decline request');
      }
    } catch (error) {
      console.error('Decline error:', error);
      toast.error('Failed to decline request');
    } finally {
      setLoadingStates(prev => ({ ...prev, [requesterId]: '' }));
    }
  };

  const handleCancelRequest = async (connection: Connection) => {
    if (!connection.requestId) {
      toast.error('Cannot cancel request - no request ID found');
      return;
    }

    setLoadingStates(prev => ({ ...prev, [connection.id]: 'cancelling' }));

    try {
      const response = await fetch(`/api/follow-requests/${connection.requestId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setConnections(prev =>
          prev.map(conn =>
            conn.id === connection.id
              ? { ...conn, connectionRequestSent: false, requestId: undefined }
              : conn
          )
        );
        toast.success('Connection request cancelled');
      } else {
        toast.error(data.error || 'Failed to cancel request');
      }
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error('Failed to cancel request');
    } finally {
      setLoadingStates(prev => ({ ...prev, [connection.id]: '' }));
    }
  };

  const handleViewProfile = (connection: Connection) => {
    window.location.href = `/profile/${connection.id}`;
  };

  const handleMessage = (connection: Connection) => {
    window.location.href = `/product/messages?userId=${connection.id}`;
  };

  const handleContinue = () => {
    window.location.href = '/product/profile';
  };

  // Show loading while checking authentication
  if (loading || initialLoading) {
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
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Build Your Network
          </h1>
          <p className="text-gray-600">
            Connect with professionals who share your interests and goals
          </p>
        </div>

        {/* Pending Requests Section */}
        {pendingRequests.length > 0 && (
          <Card className="p-6 mb-8 shadow-lg border-2 border-blue-200 bg-blue-50">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <UserPlus className="h-5 w-5 mr-2 text-blue-600" />
              Pending Connection Requests ({pendingRequests.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
                      {request.requesterPhoto ? (
                        <img src={request.requesterPhoto} alt={request.requesterName} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <span className="text-white font-bold">{request.requesterName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{request.requesterName}</h3>
                      <p className="text-sm text-gray-500">wants to connect</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-black hover:bg-gray-800 text-white"
                      size="sm"
                      onClick={() => handleAcceptConnection(request.id, request.requesterId)}
                      disabled={loadingStates[request.requesterId] === 'accepting'}
                    >
                      {loadingStates[request.requesterId] === 'accepting' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Accept'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                      onClick={() => handleDeclineConnection(request.id, request.requesterId)}
                      disabled={loadingStates[request.requesterId] === 'declining'}
                    >
                      {loadingStates[request.requesterId] === 'declining' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Decline'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Search and Filter */}
        <Card className="p-6 mb-8 shadow-lg">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search professionals by name or profession..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 animate-spin" />
                )}
              </div>
            </div>
            <Button
              variant="outline"
              className="flex items-center space-x-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <Input
                    placeholder="Filter by role..."
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <Input
                    placeholder="Filter by location..."
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Search Prompt */}
        {!searchTerm && connections.length === 0 && (
          <Card className="p-8 text-center mb-8">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Search for People</h3>
            <p className="text-gray-600">Start typing a name or profession to find professionals to connect with</p>
          </Card>
        )}

        {/* Results Count */}
        {searchTerm && (
          <div className="mb-6">
            <p className="text-gray-600">
              {isSearching ? 'Searching...' : `Found ${connections.length} professionals`}
            </p>
          </div>
        )}

        {/* Connections Grid */}
        {connections.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {connections.map((connection) => (
              <Card key={connection.id} className="p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-200">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-3">
                    {connection.profile_photo_url ? (
                      <img src={connection.profile_photo_url} alt={connection.name} className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-lg">{connection.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{connection.name}</h3>
                  <p className="text-gray-600">{connection.profession}</p>
                </div>

                <div className="space-y-2">
                  {connection.isConnected ? (
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
                        size="sm"
                        onClick={() => handleMessage(connection)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Message
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                        onClick={() => handleViewProfile(connection)}
                      >
                        <User className="h-4 w-4 mr-1" />
                        Profile
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => handleDisconnect(connection.id)}
                        disabled={loadingStates[connection.id] === 'disconnecting'}
                      >
                        {loadingStates[connection.id] === 'disconnecting' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserMinus className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ) : connection.connectionRequestSent ? (
                    <div className="space-y-2">
                      <Button
                        className="w-full bg-gray-400 text-white cursor-not-allowed"
                        size="sm"
                        disabled
                      >
                        Request Sent
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                        onClick={() => handleCancelRequest(connection)}
                        disabled={loadingStates[connection.id] === 'cancelling'}
                      >
                        {loadingStates[connection.id] === 'cancelling' ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : null}
                        Cancel Request
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-black hover:bg-gray-800 text-white"
                        size="sm"
                        onClick={() => handleConnect(connection.id)}
                        disabled={loadingStates[connection.id] === 'connecting'}
                      >
                        {loadingStates[connection.id] === 'connecting' ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <UserPlus className="h-4 w-4 mr-1" />
                        )}
                        Connect
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                        onClick={() => handleViewProfile(connection)}
                      >
                        <User className="h-4 w-4 mr-1" />
                        Profile
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* No Results */}
        {searchTerm && !isSearching && connections.length === 0 && (
          <Card className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No professionals found</h3>
            <p className="text-gray-600">Try adjusting your search criteria</p>
          </Card>
        )}

        {/* Continue Button */}
        <div className="text-center mt-8">
          <Button
            onClick={handleContinue}
            className="bg-black text-white hover:bg-gray-800 px-8 py-3 text-lg"
          >
            Go to Your Profile
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>

        {/* User Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Logged in as <span className="font-medium text-gray-700">{user?.email}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
