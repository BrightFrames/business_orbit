"use client"

import { UserProfile, UserGroup } from "@/lib/types/profile"
import { safeApiCall, generateRandomMemberCount } from "@/lib/utils/api"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, MessageCircle, UserPlus, Calendar, Star, Award, Users, Lock, DollarSign, Clock, Edit, LogOut, Heart, Share2, RefreshCw, Hash, Mail, Send } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import ImageManager from "@/components/ImageManager"
import MembersCard from "@/components/MembersCard"
import RequestsCard from "@/components/RequestsCard"
import EditProfileForm from "@/components/EditProfileForm"
import toast from 'react-hot-toast';

// Default activity data
const defaultActivityPosts = [
  {
    author: {
      name: "You",
      role: "Professional",
      avatar: "U",
      rewardScore: 85,
    },
    content: "Just launched our new AI-powered analytics dashboard! The response from beta users has been incredible. Looking for feedback from fellow product managers - what metrics do you prioritize when measuring user engagement?",
    timestamp: "2h ago",
    engagement: {
      likes: 24,
      comments: 8,
      shares: 3,
    },
    isLiked: false,
  },
  {
    author: {
      name: "You",
      role: "Professional", 
      avatar: "U",
      rewardScore: 85,
    },
    content: "Reflecting on the importance of user empathy in product development. Sometimes the best insights come from simply listening to your users' frustrations and pain points.",
    timestamp: "1d ago",
    engagement: {
      likes: 18,
      comments: 5,
      shares: 2,
    },
    isLiked: true,
  },
]

// Default groups data
const defaultGroups: UserGroup[] = [
  { name: "Product Leaders SF", type: "chapter", members: 245 },
  { name: "AI/ML Enthusiasts", type: "secret", members: 89 },
  { name: "Startup Founders Network", type: "secret", members: 156 },
  { name: "Women in Tech", type: "chapter", members: 1200 },
]

export default function ProfilePage() {
  const { user, loading, logout, updateUser } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("about")
  const [isEditing, setIsEditing] = useState(false)
  const [userGroups, setUserGroups] = useState<UserGroup[]>(defaultGroups)
  // Removed static posts list; activity will show dynamic stats only
  const [expanded, setExpanded] = useState<null | 'chapters' | 'groups' | 'connections' | 'events'>(null)
  const [chapters, setChapters] = useState<any[]>([])
  const [connections, setConnections] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [stats, setStats] = useState({
    chaptersJoined: 0,
    groupsJoined: 0,
    connections: 0,
    connectionRequestsIncoming: 0,
    connectionRequestsOutgoing: 0,
    totalMessages: 0,
    posts: 0,
    eventsAttended: 0,
  })
  const [statsLoading, setStatsLoading] = useState(false)
  const [userPosts, setUserPosts] = useState<any[]>([])

  // Function to fetch user groups (chapters + secret groups)
  const fetchUserGroups = async (showLoading = false) => {
    if (!user) return
    
    if (showLoading) setGroupsLoading(true)
    
    try {
      // Fetch chapters
      const chaptersResult = await safeApiCall(
        () => fetch(`/api/users/${user.id}/chapters`, { 
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        }),
        'Failed to fetch user chapters'
      )
      
      // Fetch secret groups
      const secretGroupsResult = await safeApiCall(
        () => fetch(`/api/users/${user.id}/secret-groups`, { 
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        }),
        'Failed to fetch user secret groups'
      )
      
      let allGroups: UserGroup[] = []
      
      // Process chapters
      if (chaptersResult.success && chaptersResult.data && typeof chaptersResult.data === 'object' && chaptersResult.data !== null) {
        const chaptersData = chaptersResult.data as any
        if (chaptersData.success && Array.isArray(chaptersData.chapters)) {
          const chapterGroups: UserGroup[] = chaptersData.chapters.map((c: any) => ({
            name: c.name,
            type: 'chapter' as const,
            members: Number(c.member_count || 0)
          }))
          allGroups = [...allGroups, ...chapterGroups]
        }
      }
      
      // Process secret groups
      if (secretGroupsResult.success && secretGroupsResult.data && typeof secretGroupsResult.data === 'object' && secretGroupsResult.data !== null) {
        const secretGroupsData = secretGroupsResult.data as any
        if (Array.isArray(secretGroupsData.groups)) {
          const secretGroups: UserGroup[] = secretGroupsData.groups.map((g: any) => ({
            name: g.name,
            type: 'secret' as const,
            members: Number(g.member_count || 0)
          }))
          allGroups = [...allGroups, ...secretGroups]
        }
      }
      
      setUserGroups(allGroups)
      
      if (showLoading) {
        toast.success('Groups updated successfully!')
      }
      
    } catch (error) {
      console.error('Error fetching user groups:', error)
      setUserGroups([])
      if (showLoading) {
        toast.error('Failed to refresh groups')
      }
    } finally {
      if (showLoading) setGroupsLoading(false)
    }
  }

  // Fetch user's joined chapters and secret groups on component mount
  useEffect(() => {
    fetchUserGroups()
  }, [user])

  // Fetch user activity stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return
      setStatsLoading(true)
      try {
        const res = await safeApiCall(
          () => fetch(`/api/users/${user.id}/activity`, { credentials: 'include' }),
          'Failed to fetch activity stats'
        )
        const data: any = (res as any).data
        if ((res as any).success && data?.stats) {
          setStats(data.stats)
        }
        // Try to fetch user's posts for the Activity tab
        const postsRes = await safeApiCall(
          () => fetch(`/api/posts?userId=${user.id}&limit=20`, { credentials: 'include' }),
          'Failed to fetch posts'
        )
        const postsPayload: any = (postsRes as any).data
        const items = postsPayload?.data
        if ((postsRes as any).success && Array.isArray(items)) {
          setUserPosts(items)
        } else {
          setUserPosts([])
        }
      } finally {
        setStatsLoading(false)
      }
    }
    fetchStats()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in to view your profile</h1>
          <Button onClick={() => window.location.href = '/product/auth'} className="cursor-pointer">
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  const handleEditToggle = () => {
    setIsEditing(!isEditing)
  }

  const handleSaveProfile = (updatedData: any) => {
    // Update the user context with new data
    if (user) {
      const updatedUser = { ...user, ...updatedData }
      updateUser(updatedUser)
    }
    setIsEditing(false)
  }

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      try {
        await logout()
        router.push('/product/auth')
      } catch (error) {
        toast.error('Failed to logout')
      }
    }
  }

  // Toggle sections and fetch on demand
  const handleToggle = async (key: 'chapters' | 'groups' | 'connections' | 'events') => {
    const next = expanded === key ? null : key
    setExpanded(next)
    if (!user || next === null) return
    try {
      if (key === 'chapters') {
        const res = await safeApiCall(
          () => fetch(`/api/users/${user.id}/chapters`, { credentials: 'include' }),
          'Failed to load chapters'
        )
        const data: any = (res as any).data
        if ((res as any).success && data?.chapters) setChapters(data.chapters)
      } else if (key === 'connections') {
        const res = await safeApiCall(
          () => fetch(`/api/follow`, { credentials: 'include' }),
          'Failed to load connections'
        )
        const data: any = (res as any).data
        if ((res as any).success && Array.isArray(data?.following)) setConnections(data.following)
      } else if (key === 'events') {
        const res = await safeApiCall(
          () => fetch(`/api/users/${user.id}/events-attended`, { credentials: 'include' }),
          'Failed to load events'
        )
        const data: any = (res as any).data
        if ((res as any).success && Array.isArray(data?.events)) setEvents(data.events)
      }
    } catch {}
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Content */}
          <div className="xl:col-span-2">
            {/* Cover Banner with Pattern */}
            <div
              className="h-24 sm:h-32 md:h-40 lg:h-48 bg-muted relative overflow-hidden"
              style={{ 
                backgroundImage: user.bannerUrl ? `url("${user.bannerUrl}")` : `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23000000' fillOpacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent"></div>
            </div>

            {/* Profile Header */}
            <div className="px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6">
              <div className="flex flex-col space-y-3 sm:space-y-4 -mt-8 sm:-mt-12 md:-mt-16 relative z-10">
                {/* Profile Picture and Basic Info */}
                <div className="flex flex-col items-center lg:items-start">
                  <div className="relative">
                    {user.profilePhotoUrl ? (
                      <img
                        src={user.profilePhotoUrl}
                        alt="Profile"
                        className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full border-4 border-background shadow-lg object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 bg-gray-300 rounded-full border-4 border-background shadow-lg flex items-center justify-center text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="text-center lg:text-left space-y-2 bg-background/80 backdrop-blur-sm rounded-lg p-3 sm:p-4 lg:bg-transparent lg:backdrop-blur-none lg:p-0">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">{user.name}</h1>
                    <p className="text-sm sm:text-base md:text-lg text-muted-foreground">{user.profession || "Professional"}</p>

                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 lg:space-x-4 text-xs sm:text-sm text-muted-foreground">
                      {(user as any).location && (
                        <div className="flex items-center justify-center lg:justify-start">
                          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          {(user as any).location}
                        </div>
                      )}
                      <Badge variant="secondary" className="flex items-center justify-center w-fit mx-auto lg:mx-0">
                        <Award className="w-3 h-3 mr-1" />
                        Score: {(user as any).rewardScore || 85}
                      </Badge>
                      <div className="flex items-center justify-center lg:justify-start">
                        <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        {(user as any).mutualConnections || 12} mutual connections
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 lg:space-x-3 pt-2 sm:pt-4">
                  <Button
                    variant="outline"
                    onClick={handleEditToggle}
                    className="w-full sm:w-auto cursor-pointer text-xs sm:text-sm"
                  >
                    <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    {isEditing ? "Cancel Edit" : "Edit Profile"}
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleLogout}
                    className="w-full sm:w-auto cursor-pointer text-xs sm:text-sm"
                  >
                    <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Logout
                  </Button>
                </div>
              </div>
            </div>

            {/* Profile Content */}
            <div className="px-4 sm:px-6 lg:px-8">
              {isEditing ? (
                <EditProfileForm 
                  user={user} 
                  onCancel={() => setIsEditing(false)}
                  onSave={handleSaveProfile}
                />
              ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="overflow-x-auto">
                  <TabsList className="grid w-full grid-cols-4 min-w-max lg:min-w-0">
                    <TabsTrigger value="about" className="whitespace-nowrap cursor-pointer text-xs sm:text-sm">
                      About
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="whitespace-nowrap cursor-pointer text-xs sm:text-sm">
                      Activity
                    </TabsTrigger>
                    <TabsTrigger value="groups" className="whitespace-nowrap cursor-pointer text-xs sm:text-sm">
                      Groups
                    </TabsTrigger>
                    <TabsTrigger value="consultation" className="whitespace-nowrap cursor-pointer text-xs sm:text-sm">
                      Consultation
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="about" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
                  <Card className="p-3 sm:p-4 md:p-6">
                    <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">About</h3>
                    <p className="text-muted-foreground leading-relaxed text-xs sm:text-sm md:text-base">
                      {user.description || "Passionate professional with experience in building innovative solutions. I love connecting with fellow entrepreneurs and sharing insights about strategy, research, and leadership."}
                    </p>
                  </Card>

                  <Card className="p-3 sm:p-4 md:p-6">
                    <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Skills</h3>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {user.skills && user.skills.length > 0 ? (
                        user.skills.map((skill) => (
                          <Badge key={skill} variant="outline" className="text-xs sm:text-sm">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <>
                          <Badge variant="outline" className="text-xs sm:text-sm">Product Strategy</Badge>
                          <Badge variant="outline" className="text-xs sm:text-sm">AI/ML</Badge>
                          <Badge variant="outline" className="text-xs sm:text-sm">User Research</Badge>
                          <Badge variant="outline" className="text-xs sm:text-sm">Team Leadership</Badge>
                          <Badge variant="outline" className="text-xs sm:text-sm">Data Analytics</Badge>
                          <Badge variant="outline" className="text-xs sm:text-sm">Agile Methodologies</Badge>
                        </>
                      )}
                    </div>
                  </Card>

                  <Card className="p-3 sm:p-4 md:p-6">
                    <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Interests</h3>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {user.interest ? (
                        <Badge variant="secondary" className="text-xs sm:text-sm">
                          {user.interest}
                        </Badge>
                      ) : (
                        <>
                          <Badge variant="secondary" className="text-xs sm:text-sm">Artificial Intelligence</Badge>
                          <Badge variant="secondary" className="text-xs sm:text-sm">Startup Ecosystem</Badge>
                          <Badge variant="secondary" className="text-xs sm:text-sm">Design Thinking</Badge>
                          <Badge variant="secondary" className="text-xs sm:text-sm">Mentoring</Badge>
                          <Badge variant="secondary" className="text-xs sm:text-sm">Tech Innovation</Badge>
                        </>
                      )}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="activity" className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm sm:text-base">Recent Activity</h3>
                  </div>
                  <Card className="p-3 sm:p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                      <StatTile onClick={() => handleToggle('chapters')} clickable icon={<Users className="w-4 h-4" />} label="Chapters Joined" value={statsLoading ? '—' : String(stats.chaptersJoined)} />
                      <StatTile onClick={() => handleToggle('groups')} clickable icon={<Lock className="w-4 h-4" />} label="Groups Joined" value={statsLoading ? '—' : String(stats.groupsJoined)} />
                      <StatTile onClick={() => handleToggle('connections')} clickable icon={<UserPlus className="w-4 h-4" />} label="Connections" value={statsLoading ? '—' : String(stats.connections)} />
                      <StatTile icon={<Mail className="w-4 h-4" />} label="Req. Incoming" value={statsLoading ? '—' : String(stats.connectionRequestsIncoming)} />
                      <StatTile icon={<Send className="w-4 h-4" />} label="Req. Outgoing" value={statsLoading ? '—' : String(stats.connectionRequestsOutgoing)} />
                      <StatTile icon={<MessageCircle className="w-4 h-4" />} label="Total Messages" value={statsLoading ? '—' : String(stats.totalMessages)} />
                      <StatTile icon={<Hash className="w-4 h-4" />} label="Posts" value={statsLoading ? '—' : String(stats.posts)} />
                      <StatTile onClick={() => handleToggle('events')} clickable icon={<Calendar className="w-4 h-4" />} label="Events Attended" value={statsLoading ? '—' : String(stats.eventsAttended)} />
                        </div>
                  </Card>

                  {expanded === 'chapters' && (
                    <Card className="p-3 sm:p-4">
                      <h4 className="font-medium mb-2">Chapters</h4>
                      <SimpleList items={chapters.map((c:any)=>({id: c.id, title: `${c.name} • ${c.location_city}`}))} emptyText="No chapters"/>
                    </Card>
                  )}
                  {expanded === 'groups' && (
                    <Card className="p-3 sm:p-4">
                      <h4 className="font-medium mb-2">Groups</h4>
                      <SimpleList items={userGroups.map((g:any)=>({id: g.name, title: `${g.name} • ${g.members} members`}))} emptyText="No groups"/>
                    </Card>
                  )}
                  {expanded === 'connections' && (
                    <Card className="p-3 sm:p-4">
                      <h4 className="font-medium mb-2">Connections</h4>
                      <SimpleList items={connections.map((u:any)=>({id: u.id, title: u.name}))} emptyText="No connections"/>
                    </Card>
                  )}
                  {expanded === 'events' && (
                    <Card className="p-3 sm:p-4">
                      <h4 className="font-medium mb-2">Events Attended</h4>
                      <SimpleList items={events.map((e:any)=>({id: e.id, title: `${e.title} • ${new Date(e.date).toLocaleDateString()}`}))} emptyText="No events"/>
                    </Card>
                  )}

                  {/* Your Posts */}
                  <div className="mt-4 sm:mt-6 mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm sm:text-base">Your Posts</h3>
                    </div>
                    {userPosts.length === 0 ? (
                      <div className="text-sm text-muted-foreground">You haven't posted yet.</div>
                    ) : (
                      <div className="space-y-3">
                        {userPosts.map((p: any, idx: number) => (
                          <div key={p.id || idx} className="border rounded-lg p-3 sm:p-4 bg-background">
                            <div className="text-xs text-muted-foreground mb-1">
                              {p.created_at ? new Date(p.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Recently'}
                            </div>
                            <div className="text-sm sm:text-base whitespace-pre-wrap break-words">
                              {p.content || p.text || ''}
                            </div>
                            {Array.isArray(p.media) && p.media.length > 0 && (
                              <div className="mt-2 space-y-2">
                                {p.media.map((m: any) => (
                                  <img key={m.id} src={m.cloudinary_url} alt="" className="max-h-64 rounded" />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="groups" className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm sm:text-base">Groups & Chapters</h3>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">{userGroups.length} groups</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchUserGroups(true)}
                        disabled={groupsLoading}
                        className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                      >
                        <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${groupsLoading ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                  
                  {userGroups.length === 0 ? (
                    <Card className="p-6 sm:p-8 text-center">
                      <div className="flex flex-col items-center space-y-3">
                        <Users className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium text-base sm:text-lg">No Groups Yet</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                            Join chapters and secret groups to see them here
                          </p>
                        </div>
                        <Button 
                          onClick={() => window.location.href = '/product/groups'}
                          className="mt-2 text-xs sm:text-sm"
                        >
                          Browse Groups
                        </Button>
                      </div>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {userGroups.map((group) => (
                        <Card key={`${group.type}-${group.name}`} className="p-3 sm:p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
                          if (group.type === 'secret') {
                            window.location.href = `/product/groups/${encodeURIComponent(group.name)}`
                          } else {
                            window.location.href = `/chapters/${encodeURIComponent(group.name)}`
                          }
                        }}>
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              group.type === "chapter" 
                                ? "bg-gray-100 text-gray-600" 
                                : "bg-gray-100 text-gray-600"
                            }`}>
                              {group.type === "chapter" ? <Users className="w-5 h-5 sm:w-6 sm:h-6" /> : <Lock className="w-5 h-5 sm:w-6 sm:h-6" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm sm:text-base truncate">{group.name}</h4>
                              <p className="text-xs sm:text-sm text-muted-foreground">{group.members} members</p>
                              <Badge 
                                variant="outline" 
                                className={`text-xs mt-1 ${
                                  group.type === "chapter" 
                                    ? "border-gray-200 text-gray-700 bg-gray-50" 
                                    : "border-gray-200 text-gray-700 bg-gray-50"
                                }`}
                              >
                                {group.type === "chapter" ? "Chapter" : "Secret Group"}
                              </Badge>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="consultation" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
                  <Card className="p-3 sm:p-4 md:p-6">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <h3 className="font-semibold text-sm sm:text-base">Consultation Services</h3>
                      <Badge className="bg-green-100 text-green-800 text-xs">Available</Badge>
                    </div>
                    <p className="text-muted-foreground mb-4 sm:mb-6 text-xs sm:text-sm md:text-base">
                      Book a consultation session to discuss product strategy, team leadership, or AI implementation.
                    </p>

                    <div className="space-y-4 sm:space-y-6">
                      <div className="grid grid-cols-1 gap-3 sm:gap-4">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-sm sm:text-base">$150/hour</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">Rate set by Reward System</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-sm sm:text-base">30-60 min sessions</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">Flexible duration</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-sm sm:text-base">4.9/5 rating</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">Based on 23 sessions</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 sm:space-y-3">
                        <Button className="w-full cursor-pointer text-xs sm:text-sm">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          Book Now
                        </Button>
                        <Button variant="outline" className="w-full bg-transparent cursor-pointer text-xs sm:text-sm">
                          View Available Slots
                        </Button>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-3 sm:p-4 md:p-6">
                    <h4 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Expertise Areas</h4>
                    <div className="space-y-2 sm:space-y-3">
                      {[
                        "Product Strategy & Roadmapping",
                        "AI/ML Product Development",
                        "Team Leadership & Management",
                        "User Research & Analytics",
                      ].map((area) => (
                        <div key={area} className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-foreground rounded-full flex-shrink-0"></div>
                          <span className="text-xs sm:text-sm">{area}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
              )}
            </div>
          </div>

          {/* Right Sidebar - Members Card and Requests */}
          <div className="xl:col-span-1">
            <div className="sticky top-4 sm:top-6 space-y-4 sm:space-y-6">
              <MembersCard />
              <RequestsCard />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatTile({ icon, label, value, onClick, clickable }: { icon: React.ReactNode, label: string, value: string, onClick?: () => void, clickable?: boolean }) {
  return (
    <div onClick={onClick} className={`rounded-lg border p-3 sm:p-4 bg-background ${clickable ? 'cursor-pointer hover:bg-accent/30 transition-colors' : ''}`}>
      <div className="flex items-center justify-between mb-2 text-muted-foreground">
        <span className="text-xs sm:text-sm">{label}</span>
        {icon}
      </div>
      <div className="text-lg sm:text-2xl font-semibold">{value}</div>
    </div>
  )
}

function SimpleList({ items, emptyText }: { items: { id: string|number, title: string }[], emptyText: string }) {
  if (!items || items.length === 0) {
    return <div className="text-sm text-muted-foreground">{emptyText}</div>
  }
  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li key={it.id} className="text-sm">{it.title}</li>
      ))}
    </ul>
  )
}