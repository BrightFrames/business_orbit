'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Search, Filter, ArrowRight, CheckCircle, User, MapPin, Building, Briefcase, MessageCircle, UserMinus, UserPlus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

interface Connection {
  id: number;
  name: string;
  role: string;
  company: string;
  avatar: string;
  mutualConnections: number;
  location: string;
  skills: string[];
  email: string;
  bio: string;
  isConnected: boolean;
  connectionRequestSent: boolean;
  connectionRequestReceived: boolean;
}

export default function ConnectionsPage() {
  const { user, loading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingStates, setLoadingStates] = useState<{[key: number]: string}>({});

  // Sample connections data with more details
  const sampleConnections: Connection[] = [
    {
      id: 1,
      name: 'Sarah Chen',
      role: 'Product Manager',
      company: 'Tech Corp',
      avatar: 'SC',
      mutualConnections: 5,
      location: 'Mumbai',
      skills: ['Product Strategy', 'User Research', 'Agile', 'Data Analysis'],
      email: 'sarah.chen@techcorp.com',
      bio: 'Passionate product manager with 5+ years of experience in tech startups. Love building products that make a difference.',
      isConnected: false,
      connectionRequestSent: false,
      connectionRequestReceived: false
    },
    {
      id: 2,
      name: 'Michael Rodriguez',
      role: 'Startup Founder',
      company: 'InnovateLab',
      avatar: 'MR',
      mutualConnections: 3,
      location: 'Bengaluru',
      skills: ['Entrepreneurship', 'Leadership', 'Strategy', 'Fundraising'],
      email: 'michael@innovatelab.com',
      bio: 'Serial entrepreneur building the next generation of AI-powered solutions. Always looking to connect with fellow innovators.',
      isConnected: false,
      connectionRequestSent: false,
      connectionRequestReceived: false
    },
    {
      id: 3,
      name: 'Priya Sharma',
      role: 'Marketing Director',
      company: 'GrowthCo',
      avatar: 'PS',
      mutualConnections: 7,
      location: 'Delhi',
      skills: ['Digital Marketing', 'Brand Strategy', 'Analytics', 'Content Creation'],
      email: 'priya@growthco.com',
      bio: 'Marketing strategist helping brands grow through data-driven campaigns. Love connecting with creative minds.',
      isConnected: true,
      connectionRequestSent: false,
      connectionRequestReceived: false
    },
    {
      id: 4,
      name: 'Alex Thompson',
      role: 'UX Designer',
      company: 'DesignStudio',
      avatar: 'AT',
      mutualConnections: 4,
      location: 'Chennai',
      skills: ['UI/UX Design', 'Prototyping', 'User Testing', 'Figma'],
      email: 'alex@designstudio.com',
      bio: 'UX designer passionate about creating intuitive user experiences. Always excited to collaborate on new projects.',
      isConnected: false,
      connectionRequestSent: true,
      connectionRequestReceived: false
    },
    {
      id: 5,
      name: 'Rajesh Kumar',
      role: 'Software Engineer',
      company: 'CodeTech',
      avatar: 'RK',
      mutualConnections: 6,
      location: 'Hyderabad',
      skills: ['React', 'Node.js', 'Python', 'AWS'],
      email: 'rajesh@codetech.com',
      bio: 'Full-stack developer with expertise in modern web technologies. Love solving complex technical challenges.',
      isConnected: false,
      connectionRequestSent: false,
      connectionRequestReceived: true
    },
    {
      id: 6,
      name: 'Lisa Wang',
      role: 'Data Scientist',
      company: 'DataInsights',
      avatar: 'LW',
      mutualConnections: 2,
      location: 'Pune',
      skills: ['Machine Learning', 'Python', 'Statistics', 'SQL'],
      email: 'lisa@datainsights.com',
      bio: 'Data scientist turning complex data into actionable insights. Passionate about AI and machine learning.',
      isConnected: false,
      connectionRequestSent: false,
      connectionRequestReceived: false
    }
  ];

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/product/auth';
    }
  }, [user, loading]);

  useEffect(() => {
    setConnections(sampleConnections);
  }, []);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleConnect = async (connectionId: number) => {
    setLoadingStates(prev => ({ ...prev, [connectionId]: 'connecting' }));
    
    // Simulate API call
    setTimeout(() => {
      setConnections(prev => 
        prev.map(conn => 
          conn.id === connectionId 
            ? { ...conn, connectionRequestSent: true }
            : conn
        )
      );
      toast.success('Connection request sent successfully!');
      setLoadingStates(prev => ({ ...prev, [connectionId]: '' }));
    }, 1000);
  };

  const handleDisconnect = async (connectionId: number) => {
    setLoadingStates(prev => ({ ...prev, [connectionId]: 'disconnecting' }));
    
    setTimeout(() => {
      setConnections(prev => 
        prev.map(conn => 
          conn.id === connectionId 
            ? { ...conn, isConnected: false, connectionRequestSent: false }
            : conn
        )
      );
      toast.success('Disconnected successfully!');
      setLoadingStates(prev => ({ ...prev, [connectionId]: '' }));
    }, 1000);
  };

  const handleAcceptConnection = async (connectionId: number) => {
    setLoadingStates(prev => ({ ...prev, [connectionId]: 'accepting' }));
    
    setTimeout(() => {
      setConnections(prev => 
        prev.map(conn => 
          conn.id === connectionId 
            ? { ...conn, isConnected: true, connectionRequestReceived: false }
            : conn
        )
      );
      toast.success('Connection accepted!');
      setLoadingStates(prev => ({ ...prev, [connectionId]: '' }));
    }, 1000);
  };

  const handleDeclineConnection = async (connectionId: number) => {
    setLoadingStates(prev => ({ ...prev, [connectionId]: 'declining' }));
    
    setTimeout(() => {
      setConnections(prev => 
        prev.map(conn => 
          conn.id === connectionId 
            ? { ...conn, connectionRequestReceived: false }
            : conn
        )
      );
      toast.success('Connection request declined');
      setLoadingStates(prev => ({ ...prev, [connectionId]: '' }));
    }, 1000);
  };

  const handleCancelRequest = async (connectionId: number) => {
    setLoadingStates(prev => ({ ...prev, [connectionId]: 'cancelling' }));
    
    setTimeout(() => {
      setConnections(prev => 
        prev.map(conn => 
          conn.id === connectionId 
            ? { ...conn, connectionRequestSent: false }
            : conn
        )
      );
      toast.success('Connection request cancelled');
      setLoadingStates(prev => ({ ...prev, [connectionId]: '' }));
    }, 1000);
  };

  const handleViewProfile = (connection: Connection) => {
    // In a real app, this would navigate to the profile page
    toast.success(`Viewing ${connection.name}'s profile`);
  };

  const handleMessage = (connection: Connection) => {
    toast.success(`Starting conversation with ${connection.name}`);
  };

  const filteredConnections = connections.filter(connection => {
    const matchesSearch = connection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         connection.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         connection.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         connection.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = !filterRole || connection.role.toLowerCase().includes(filterRole.toLowerCase());
    const matchesLocation = !filterLocation || connection.location.toLowerCase().includes(filterLocation.toLowerCase());
    
    return matchesSearch && matchesRole && matchesLocation;
  });

  const handleContinue = () => {
    window.location.href = '/product/profile';
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

        {/* Search and Filter */}
        <Card className="p-6 mb-8 shadow-lg">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search professionals by name, role, company, or skills..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
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

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {filteredConnections.length} of {connections.length} professionals
          </p>
        </div>

        {/* Connections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredConnections.map((connection) => (
            <Card key={connection.id} className="p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-200">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold text-lg">{connection.avatar}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{connection.name}</h3>
                <p className="text-gray-600">{connection.role}</p>
                <p className="text-sm text-gray-500">{connection.company}</p>
                <div className="flex items-center justify-center text-sm text-gray-500 mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  {connection.location}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  {connection.mutualConnections} mutual connections
                </p>
                <div className="flex flex-wrap gap-1">
                  {connection.skills.slice(0, 3).map((skill, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                  {connection.skills.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                      +{connection.skills.length - 3} more
                    </span>
                  )}
                </div>
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
                      <UserMinus className="h-4 w-4" />
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
                      onClick={() => handleCancelRequest(connection.id)}
                      disabled={loadingStates[connection.id] === 'cancelling'}
                    >
                      Cancel Request
                    </Button>
                  </div>
                ) : connection.connectionRequestReceived ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1 bg-black hover:bg-gray-800 text-white" 
                        size="sm"
                        onClick={() => handleAcceptConnection(connection.id)}
                        disabled={loadingStates[connection.id] === 'accepting'}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => handleDeclineConnection(connection.id)}
                        disabled={loadingStates[connection.id] === 'declining'}
                      >
                        Decline
                      </Button>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                      onClick={() => handleViewProfile(connection)}
                    >
                      <User className="h-4 w-4 mr-1" />
                      View Profile
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
                      <UserPlus className="h-4 w-4 mr-1" />
                      {loadingStates[connection.id] === 'connecting' ? 'Sending...' : 'Connect'}
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

        {/* No Results */}
        {filteredConnections.length === 0 && (
          <Card className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No professionals found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria</p>
          </Card>
        )}

        {/* Success Message */}
        <Card className="p-6 mb-8 bg-gray-50 border-gray-200">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-gray-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Great! You're all set up
              </h3>
              <p className="text-gray-700">
                You've completed the onboarding process. Now you can start building meaningful professional connections.
              </p>
            </div>
          </div>
        </Card>

        {/* Continue Button */}
        <div className="text-center">
          <Button 
            onClick={handleContinue}
            className="bg-black text-white hover:bg-gray-800 px-8 py-3 text-lg"
          >
            Complete Setup & Go to Profile
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
