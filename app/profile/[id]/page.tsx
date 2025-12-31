"use client"

import { UserProfile, UserGroup } from "@/lib/types/profile"
import { safeApiCall, generateRandomMemberCount } from "@/lib/utils/api"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DisplayPostCard } from "@/components/PostCard"
import { MapPin, MessageCircle, UserPlus, Calendar, Star, Award, Users, Lock, DollarSign, Clock } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { Upload } from "lucide-react"
import toast from "react-hot-toast"

const profileData = {
  id: "sarah-chen",
  name: "Sarah Chen",
  role: "Senior Product Manager",
  location: "San Francisco, CA",
  rewardScore: 92,
  avatar: "SC",
  coverPattern:
    "data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23000000' fillOpacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E",
  bio: "Passionate product manager with 8+ years of experience building AI-powered solutions. I love connecting with fellow entrepreneurs and sharing insights about product strategy, user research, and team leadership.",
  skills: ["Product Strategy", "AI/ML", "User Research", "Team Leadership", "Data Analytics", "Agile Methodologies"],
  interests: ["Artificial Intelligence", "Startup Ecosystem", "Design Thinking", "Mentoring", "Tech Innovation"],
  consultationRate: 150, // Auto-calculated based on reward score
  isConnected: false,
  mutualConnections: 12,
}

const userPosts = [
  {
    author: {
      name: "Sarah Chen",
      role: "Senior Product Manager",
      avatar: "SC",
      rewardScore: 92,
    },
    content:
      "Just launched our new AI-powered analytics dashboard! The response from beta users has been incredible. Looking for feedback from fellow product managers - what metrics do you prioritize when measuring user engagement?",
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
      name: "Sarah Chen",
      role: "Senior Product Manager",
      avatar: "SC",
      rewardScore: 92,
    },
    content:
      "Reflecting on the importance of user empathy in product development. Sometimes the best insights come from simply listening to your users' frustrations and pain points.",
    timestamp: "1d ago",
    engagement: {
      likes: 18,
      comments: 5,
      shares: 2,
    },
    isLiked: true,
  },
]

export default function ProfilePage({ params }: { params: { id: string } }) {
  const { user: currentUser, loading } = useAuth()
  const [activeTab, setActiveTab] = useState("about")
  const [isConnected, setIsConnected] = useState(false)
  const [profileData, setProfileData] = useState<UserProfile | null>(null)
  const [userGroups, setUserGroups] = useState<UserGroup[]>([])
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [uploading, setUploading] = useState<{profile:boolean;banner:boolean}>({profile:false, banner:false})

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!currentUser || loading) return
      
      try {
        const result = await safeApiCall(
          () => fetch(`/api/users/${params.id}`, {
            credentials: 'include',
          }),
          'Failed to fetch user profile'
        )
        
        if (result.success && result.data && typeof result.data === 'object' && result.data !== null) {
          const data = result.data as any
          setProfileData(data.user)
          
          // Create groups array from chapters and secret groups
          const groups: UserGroup[] = [
            ...data.groups.chapters.map((chapter: string) => ({ 
              name: chapter, 
              type: "chapter" as const, 
              members: generateRandomMemberCount('chapter')
            })),
            ...data.groups.secretGroups.map((group: string) => ({ 
              name: group, 
              type: "secret" as const, 
              members: generateRandomMemberCount('secret')
            }))
          ]
          setUserGroups(groups)
        } else if (result.error) {
          console.error('Error fetching user profile:', result.error)
        }
      } catch (error) {
        console.error('Unexpected error:', error)
      } finally {
        setLoadingProfile(false)
      }
    }

    fetchUserProfile()
  }, [currentUser, loading, params.id])

  const handleConnect = () => {
    setIsConnected(!isConnected)
  }

  const isOwnProfile = Boolean(
    currentUser && (
      String(currentUser.id) === String(params.id) ||
      (profileData && String(currentUser.id) === String((profileData as any).id))
    )
  )

  const uploadImage = async (file: File, type: 'profile' | 'banner') => {
    if (!file) return
    const allowedTypes = ['image/jpeg','image/jpg','image/png','image/gif','image/webp']
    if (!allowedTypes.includes(file.type)) return
    if (file.size > 5*1024*1024) return
    try {
      setUploading(prev => ({...prev, [type]: true}))
      const form = new FormData()
      form.append(type === 'profile' ? 'profilePhoto' : 'banner', file)
      const res = await fetch(`/api/images/${type === 'profile' ? 'profile' : 'banner'}`, {
        method: 'PUT',
        body: form,
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      // Merge into profileData so UI updates instantly
      setProfileData(prev => prev ? ({
        ...prev,
        profilePhotoUrl: type === 'profile' ? data.user.profilePhotoUrl : prev.profilePhotoUrl,
        bannerUrl: type === 'banner' ? data.user.bannerUrl : prev.bannerUrl,
      }) : prev)
    } finally {
      setUploading(prev => ({...prev, [type]: false}))
    }
  }

  const onProfileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadImage(file, 'profile')
  }

  const onBannerInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadImage(file, 'banner')
  }

  if (loading || loadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
          <p className="text-muted-foreground">The user you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <div className="max-w-6xl mx-auto">
        {/* Cover Banner */}
        <div
          className="h-24 sm:h-32 md:h-40 lg:h-48 bg-muted relative overflow-hidden group"
          style={{ 
            backgroundImage: (profileData.bannerUrl || (currentUser as any)?.bannerUrl)
              ? `url("${profileData.bannerUrl || (currentUser as any)?.bannerUrl}")`
              : `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23000000' fillOpacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent"></div>
          {isOwnProfile && (
            <>
              <input id="bannerInput" type="file" accept="image/*" className="hidden" onChange={onBannerInputChange} />
              <button
                disabled={uploading.banner}
                onClick={() => document.getElementById('bannerInput')?.click()}
                className="absolute right-3 bottom-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-black/60 text-white text-xs px-3 py-1 rounded flex items-center gap-1"
                aria-label="Change banner"
              >
                <Upload className="w-3 h-3" /> {uploading.banner ? 'Uploading…' : 'Change Banner'}
              </button>
            </>
          )}
        </div>

        {/* Profile Header */}
        <div className="px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6">
          <div className="flex flex-col space-y-3 sm:space-y-4 -mt-8 sm:-mt-12 md:-mt-16 relative z-10">
            {/* Profile Picture and Basic Info */}
            <div className="flex flex-col items-center lg:items-start">
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 bg-background rounded-full border-4 border-background shadow-lg flex items-center justify-center text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 overflow-hidden relative group">
                {(profileData.profilePhotoUrl || (currentUser as any)?.profilePhotoUrl) ? (
                  <img 
                    src={profileData.profilePhotoUrl || (currentUser as any)?.profilePhotoUrl} 
                    alt={profileData.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-primary">
                    {profileData.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
                {isOwnProfile && (
                  <>
                    <input id="profileInput" type="file" accept="image/*" className="hidden" onChange={onProfileInputChange} />
                    <button
                      disabled={uploading.profile}
                      onClick={() => document.getElementById('profileInput')?.click()}
                      className="absolute inset-0 bg-black/40 text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                      aria-label="Change profile photo"
                    >
                      <Upload className="w-3 h-3 mr-1" /> {uploading.profile ? 'Uploading…' : 'Change Photo'}
                    </button>
                  </>
                )}
              </div>

              <div className="text-center lg:text-left space-y-2 bg-background/80 backdrop-blur-sm rounded-lg p-3 sm:p-4 lg:bg-transparent lg:backdrop-blur-none lg:p-0">
                <div className="flex items-center justify-center lg:justify-start gap-2">
                  {isOwnProfile ? (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault()
                        const fd = new FormData(e.currentTarget)
                        const name = (fd.get('name') as string)?.trim()
                        if (!name || name === profileData.name) return
                        const res = await fetch(`/api/users/${params.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name })
                        })
                        if (res.ok) {
                          const data = await res.json()
                          setProfileData(prev => prev ? ({...prev, name: data.user.name}) : prev)
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        name="name"
                        defaultValue={profileData.name}
                        className="px-2 py-1 border rounded text-sm sm:text-base md:text-lg"
                      />
                      <Button type="submit" size="sm" className="text-xs sm:text-sm">Save</Button>
                    </form>
                  ) : (
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">{profileData.name}</h1>
                  )}
                </div>
                <p className="text-sm sm:text-base md:text-lg text-muted-foreground">{profileData.description || 'Professional'}</p>

                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 lg:space-x-4 text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-center justify-center lg:justify-start">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    {profileData.phone || 'Location not specified'}
                  </div>
                  <Badge variant="secondary" className="flex items-center justify-center w-fit mx-auto lg:mx-0">
                    <Award className="w-3 h-3 mr-1" />
                    Score: 85
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">12 mutual connections</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 lg:space-x-3 pt-2 sm:pt-4">
              <Button
                variant={isConnected ? "secondary" : "default"}
                onClick={handleConnect}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                {isConnected ? "Connected" : "Connect"}
              </Button>
              <Button variant="outline" className="w-full sm:w-auto bg-transparent text-xs sm:text-sm">
                <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Message
              </Button>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="px-4 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="overflow-x-auto">
              <TabsList className="grid w-full grid-cols-4 min-w-max lg:min-w-0">
                <TabsTrigger value="about" className="whitespace-nowrap text-xs sm:text-sm">
                  About
                </TabsTrigger>
                <TabsTrigger value="activity" className="whitespace-nowrap text-xs sm:text-sm">
                  Activity
                </TabsTrigger>
                <TabsTrigger value="groups" className="whitespace-nowrap text-xs sm:text-sm">
                  Groups
                </TabsTrigger>
                <TabsTrigger value="consultation" className="whitespace-nowrap text-xs sm:text-sm">
                  Consultation
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="about" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
              <Card className="p-3 sm:p-4 md:p-6">
                <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">About</h3>
                <p className="text-muted-foreground leading-relaxed text-xs sm:text-sm md:text-base">
                  {profileData.description || 'No description available.'}
                </p>
              </Card>

              <Card className="p-3 sm:p-4 md:p-6">
                <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Skills</h3>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {(profileData.skills || []).map((skill: string) => (
                    <Badge key={skill} variant="outline" className="text-xs sm:text-sm">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </Card>

              {profileData.interest && (
                <Card className="p-3 sm:p-4 md:p-6">
                  <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Interests</h3>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    <Badge variant="secondary" className="text-xs sm:text-sm">
                      {profileData.interest}
                    </Badge>
                  </div>
                </Card>
              )}

            </TabsContent>

            <TabsContent value="activity" className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm sm:text-base">Recent Activity</h3>
                <Badge variant="outline" className="text-xs">{userPosts.length} posts</Badge>
              </div>
              {userPosts.map((post, index) => (
                <DisplayPostCard key={index} {...post} />
              ))}
            </TabsContent>

            <TabsContent value="groups" className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm sm:text-base">Groups & Chapters</h3>
                <Badge variant="outline" className="text-xs">{userGroups.length} groups</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {userGroups.map((group) => (
                  <Card key={group.name} className="p-3 sm:p-4">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        {group.type === "chapter" ? <Users className="w-5 h-5 sm:w-6 sm:h-6" /> : <Lock className="w-5 h-5 sm:w-6 sm:h-6" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm sm:text-base truncate">{group.name}</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground">{group.members} members</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {group.type === "chapter" ? "Chapter" : "Secret Group"}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
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
                    <Button 
                      className="w-full text-xs sm:text-sm"
                      onClick={() => {
                        toast("This feature is enabled in Phase2/Version2", {
                          icon: "📹",
                          duration: 3000,
                        })
                      }}
                    >
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      Book Now
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full bg-transparent text-xs sm:text-sm"
                      onClick={() => {
                        toast("This feature is enabled in Phase2/Version2", {
                          icon: "📹",
                          duration: 3000,
                        })
                      }}
                    >
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
        </div>
      </div>
    </div>
  )
}
