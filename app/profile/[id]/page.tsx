"use client"

import { UserProfile, UserGroup } from "@/lib/types/profile"
import { safeApiCall, generateRandomMemberCount } from "@/lib/utils/api"

import { useState, useEffect, use } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import FeedPost from "@/components/FeedPost"
import {
  MapPin, MessageCircle, UserPlus, Calendar, Star, Award, Users, Lock,
  DollarSign, Clock, Edit, Upload, Briefcase, GraduationCap,
  ExternalLink, MoreHorizontal, CheckCircle2, Link2
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import toast from "react-hot-toast"
import { BookingModal } from '@/components/consultations/BookingModal'


export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user: currentUser, loading } = useAuth()
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'not-following' | 'pending' | 'following'>('not-following')
  const [connectionLoading, setConnectionLoading] = useState(false)
  const [profileData, setProfileData] = useState<UserProfile | null>(null)
  const [userGroups, setUserGroups] = useState<UserGroup[]>([])
  const [error, setError] = useState<string | null>(null)

  const [userPosts, setUserPosts] = useState<any[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [uploading, setUploading] = useState<{ profile: boolean; banner: boolean }>({ profile: false, banner: false })
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [showAllSkills, setShowAllSkills] = useState(false)
  const [showFullAbout, setShowFullAbout] = useState(false)

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      // Wait for auth to finish loading before making any decisions
      if (loading) return

      // If auth is done loading and no user, we can't fetch (middleware should have redirected)
      if (!currentUser) {
        setLoadingProfile(false)
        return
      }

      try {
        const response = await fetch(`/api/users/${id}`, {
          credentials: 'include',
        })

        if (response.status === 401) {
          window.location.href = '/product/auth'
          return
        }

        const result = await response.json()

        if (response.ok && result.user) {
          setProfileData(result.user)

          // Create groups array from chapters and secret groups
          const groups: UserGroup[] = [
            ...(result.groups?.chapters || []).map((chapter: string) => ({
              name: chapter,
              type: "chapter" as const,
              members: generateRandomMemberCount('chapter')
            })),
            ...(result.groups?.secretGroups || []).map((group: string) => ({
              name: group,
              type: "secret" as const,
              members: generateRandomMemberCount('secret')
            }))
          ]
          setUserGroups(groups)
        } else {
          console.error('Error fetching user profile:', result.error)
          setError(result.error || 'Failed to load profile')
          if (response.status === 404) setError('User not found')
        }
      } catch (error) {
        console.error('Unexpected error:', error)
        setError('Network error or server unavailable')
      } finally {
        setLoadingProfile(false)
      }
    }

    fetchUserProfile()
  }, [currentUser, loading, id])

  // Fetch connection status
  useEffect(() => {
    const fetchConnectionStatus = async () => {
      // Wait for auth to finish loading
      if (loading) return
      // Skip if not logged in or viewing own profile
      if (!currentUser || String(currentUser.id) === String(id)) return

      try {
        const response = await fetch(`/api/follow?checkStatus=true&userIds=${id}`, {
          credentials: 'include'
        })
        const data = await response.json()
        if (data.success && data.followStatus) {
          const status = data.followStatus[parseInt(id)]
          setConnectionStatus(status || 'not-following')
        }
      } catch (error) {
        console.error('Error fetching connection status:', error)
      }
    }

    fetchConnectionStatus()
  }, [currentUser, loading, id])

  // Fetch user posts
  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!id) return
      setLoadingPosts(true)
      try {
        const res = await safeApiCall(
          () => fetch(`/api/posts?userId=${id}&limit=20`, { credentials: 'include' }),
          'Failed to fetch posts'
        )
        const postsPayload: any = (res as any).data
        const items = postsPayload?.data
        if ((res as any).success && Array.isArray(items)) {
          setUserPosts(items)
        } else {
          setUserPosts([])
        }
      } finally {
        setLoadingPosts(false)
      }
    }
    fetchUserPosts()
  }, [id])

  const handleConnect = async () => {
    setConnectionLoading(true)
    try {
      const response = await fetch('/api/follow-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetUserId: parseInt(id) })
      })
      const data = await response.json()
      if (data.success) {
        setConnectionStatus('pending')
        toast.success('Connection request sent!')
      } else {
        toast.error(data.error || 'Failed to send request')
      }
    } catch (error) {
      toast.error('Failed to send connection request')
    } finally {
      setConnectionLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setConnectionLoading(true)
    try {
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetUserId: parseInt(id), action: 'unfollow' })
      })
      const data = await response.json()
      if (data.success) {
        setConnectionStatus('not-following')
        toast.success('Disconnected successfully!')
      } else {
        toast.error(data.error || 'Failed to disconnect')
      }
    } catch (error) {
      toast.error('Failed to disconnect')
    } finally {
      setConnectionLoading(false)
    }
  }

  const isOwnProfile = Boolean(
    currentUser && (
      String(currentUser.id) === String(id) ||
      (profileData && String(currentUser.id) === String((profileData as any).id))
    )
  )

  const uploadImage = async (file: File, type: 'profile' | 'banner') => {
    if (!file) return
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) return
    if (file.size > 5 * 1024 * 1024) return
    try {
      setUploading(prev => ({ ...prev, [type]: true }))
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
      toast.success(`${type === 'profile' ? 'Profile photo' : 'Banner'} updated!`)
    } catch (e) {
      toast.error('Upload failed')
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }))
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-sm max-w-md mx-auto">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || "User Not Found"}
          </h2>
          <p className="text-gray-500 mb-6">
            {error ? "We couldn't load this profile." : "The profile you're looking for doesn't exist or has been removed."}
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="w-full"
            >
              Go Back
            </Button>
            <Button
              variant="ghost"
              onClick={() => window.location.href = '/product/feed'}
              className="w-full"
            >
              Go to Feed
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const displayedSkills = showAllSkills ? (profileData.skills || []) : (profileData.skills || []).slice(0, 5)
  const aboutText = profileData.description || 'No description available.'
  const shouldTruncateAbout = aboutText.length > 300

  return (
    <div className="min-h-screen bg-gray-100 pb-20 md:pb-8">
      <Navigation />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        {/* Main Profile Card - LinkedIn Style */}
        <Card className="overflow-hidden mb-4 border-0 shadow-sm">
          {/* Cover Banner */}
          <div
            className="h-32 sm:h-44 md:h-52 relative overflow-hidden group"
            style={{
              background: profileData.bannerUrl
                ? `url("${profileData.bannerUrl}") center/cover no-repeat`
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
          >
            {isOwnProfile && (
              <>
                <input id="bannerInput" type="file" accept="image/*" className="hidden" onChange={onBannerInputChange} />
                <button
                  disabled={uploading.banner}
                  onClick={() => document.getElementById('bannerInput')?.click()}
                  className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white text-gray-700 text-sm px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg"
                  aria-label="Change banner"
                >
                  <Upload className="w-4 h-4" />
                  {uploading.banner ? 'Uploading...' : 'Edit cover'}
                </button>
              </>
            )}
          </div>

          {/* Profile Info Section */}
          <div className="px-6 pb-6 relative">
            {/* Profile Photo - Overlapping Banner */}
            <div className="-mt-16 sm:-mt-20 mb-4 flex justify-between items-end">
              <div className="relative group">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden">
                  {profileData.profilePhotoUrl ? (
                    <img
                      src={profileData.profilePhotoUrl}
                      alt={profileData.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-4xl sm:text-5xl font-semibold">
                      {profileData.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                {isOwnProfile && (
                  <>
                    <input id="profileInput" type="file" accept="image/*" className="hidden" onChange={onProfileInputChange} />
                    <button
                      disabled={uploading.profile}
                      onClick={() => document.getElementById('profileInput')?.click()}
                      className="absolute bottom-2 right-2 bg-white rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
                      aria-label="Change profile photo"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                    </button>
                  </>
                )}
              </div>

              {/* Action Buttons - Desktop */}
              <div className="hidden sm:flex gap-2">
                {!isOwnProfile ? (
                  <>
                    {connectionStatus === 'following' ? (
                      <Button
                        variant="outline"
                        onClick={handleDisconnect}
                        disabled={connectionLoading}
                        className="rounded-full border-blue-600 text-blue-600 hover:bg-blue-50"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {connectionLoading ? 'Processing...' : 'Connected'}
                      </Button>
                    ) : connectionStatus === 'pending' ? (
                      <Button
                        variant="outline"
                        disabled
                        className="rounded-full"
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Pending
                      </Button>
                    ) : (
                      <Button
                        onClick={handleConnect}
                        disabled={connectionLoading}
                        className="rounded-full bg-blue-600 hover:bg-blue-700"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        {connectionLoading ? 'Sending...' : 'Connect'}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="rounded-full"
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/messages/start', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ targetUserId: id }),
                            credentials: 'include'
                          });
                          const data = await res.json();
                          if (data.success) {
                            window.location.href = '/product/messages';
                          } else {
                            toast.error('Failed to start conversation');
                          }
                        } catch (e) {
                          toast.error('Error starting conversation');
                        }
                      }}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Message
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <MoreHorizontal className="w-5 h-5" />
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => window.location.href = '/product/settings'}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit profile
                  </Button>
                )}
              </div>
            </div>

            {/* Name & Headline */}
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">{profileData.name}</h1>
              <p className="text-base sm:text-lg text-gray-700">
                {profileData.profession || 'Professional'}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 pt-1">
                {profileData.phone && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {profileData.phone}
                  </span>
                )}
                {userGroups.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600 hover:underline cursor-pointer">
                      {userGroups.length} group{userGroups.length !== 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </div>

              {/* Orbit Score Badge */}
              <div className="flex items-center gap-2 pt-2">
                <Badge variant="secondary" className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1">
                  <Award className="w-4 h-4 mr-1" />
                  {profileData.rewardScore || 0} Orbit Points
                </Badge>
              </div>
            </div>

            {/* Mobile Action Buttons */}
            <div className="flex sm:hidden gap-2 mt-4">
              {!isOwnProfile ? (
                <>
                  {connectionStatus === 'following' ? (
                    <Button
                      variant="outline"
                      onClick={handleDisconnect}
                      disabled={connectionLoading}
                      className="flex-1 rounded-full border-blue-600 text-blue-600"
                      size="sm"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Connected
                    </Button>
                  ) : connectionStatus === 'pending' ? (
                    <Button variant="outline" disabled className="flex-1 rounded-full" size="sm">
                      <Clock className="w-4 h-4 mr-1" />
                      Pending
                    </Button>
                  ) : (
                    <Button
                      onClick={handleConnect}
                      disabled={connectionLoading}
                      className="flex-1 rounded-full bg-blue-600 hover:bg-blue-700"
                      size="sm"
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Connect
                    </Button>
                  )}
                  <Button variant="outline" className="flex-1 rounded-full" size="sm">
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Message
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  className="flex-1 rounded-full"
                  size="sm"
                  onClick={() => window.location.href = '/product/settings'}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit profile
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* About Section */}
            <Card className="p-6 border-0 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
              <div className="text-gray-700 text-sm leading-relaxed">
                {shouldTruncateAbout && !showFullAbout ? (
                  <>
                    {aboutText.slice(0, 300)}...
                    <button
                      onClick={() => setShowFullAbout(true)}
                      className="text-blue-600 hover:underline ml-1 font-medium"
                    >
                      see more
                    </button>
                  </>
                ) : (
                  aboutText
                )}
                {showFullAbout && shouldTruncateAbout && (
                  <button
                    onClick={() => setShowFullAbout(false)}
                    className="text-blue-600 hover:underline ml-1 font-medium block mt-2"
                  >
                    see less
                  </button>
                )}
              </div>
            </Card>

            {/* Experience/Profession Section */}
            {profileData.profession && (
              <Card className="p-6 border-0 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Experience</h2>
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{profileData.profession}</h3>
                    <p className="text-sm text-gray-500">Current Position</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Skills Section */}
            {profileData.skills && profileData.skills.length > 0 && (
              <Card className="p-6 border-0 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Skills</h2>
                  {isOwnProfile && (
                    <Button variant="ghost" size="sm" className="text-gray-500">
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  {displayedSkills.map((skill: string, index: number) => (
                    <div key={skill} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900">{skill}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {profileData.skills.length > 5 && (
                  <button
                    onClick={() => setShowAllSkills(!showAllSkills)}
                    className="mt-4 text-blue-600 hover:underline text-sm font-medium"
                  >
                    {showAllSkills
                      ? 'Show fewer skills'
                      : `Show all ${profileData.skills.length} skills`}
                  </button>
                )}
              </Card>
            )}

            {/* Interests Section */}
            {profileData.interest && (
              <Card className="p-6 border-0 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Interests</h2>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {profileData.interest}
                </Badge>
              </Card>
            )}

            {/* Activity Section */}
            <Card className="p-6 border-0 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Activity</h2>
                <span className="text-sm text-blue-600">{userPosts.length} post{userPosts.length !== 1 ? 's' : ''}</span>
              </div>
              {loadingPosts ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Loading activity...</p>
                </div>
              ) : userPosts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <Edit className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">No posts yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userPosts.slice(0, 3).map((post) => (
                    <FeedPost
                      key={post.id}
                      post={{
                        ...post,
                        likes: Number(post.likes),
                        comments: Number(post.comments),
                        shares: Number(post.shares)
                      }}
                    />
                  ))}
                  {userPosts.length > 3 && (
                    <button className="w-full text-center py-3 text-blue-600 hover:bg-gray-50 rounded-lg font-medium text-sm transition-colors">
                      Show all activity
                    </button>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-4">
            {/* Groups & Chapters Card */}
            <Card className="p-6 border-0 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Groups</h2>
                <Badge variant="outline" className="text-xs">{userGroups.length}</Badge>
              </div>
              {userGroups.length === 0 ? (
                <p className="text-sm text-gray-500">No groups joined yet</p>
              ) : (
                <div className="space-y-3">
                  {userGroups.slice(0, 4).map((group) => (
                    <div key={group.name} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                        {group.type === "chapter" ? <Users className="w-5 h-5 text-gray-600" /> : <Lock className="w-5 h-5 text-gray-600" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-gray-900 truncate">{group.name}</p>
                        <p className="text-xs text-gray-500">{group.members} members</p>
                      </div>
                    </div>
                  ))}
                  {userGroups.length > 4 && (
                    <button className="w-full text-center py-2 text-blue-600 hover:bg-gray-50 rounded-lg font-medium text-sm">
                      Show all {userGroups.length} groups
                    </button>
                  )}
                </div>
              )}
            </Card>

            {/* Consultation Card */}
            {!isOwnProfile && (
              <Card className="p-6 border-0 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">Book Consultation</h2>
                  <Badge className="bg-green-100 text-green-700 border-0">Available</Badge>
                </div>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span>$150/hour</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>30-60 min sessions</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span>4.9/5 rating</span>
                  </div>
                </div>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => setIsBookingModalOpen(true)}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Book a session
                </Button>

                {isBookingModalOpen && profileData && (
                  <BookingModal
                    expert={{
                      id: parseInt(id) || 0,
                      name: profileData.name,
                      hourly_rate: String((profileData as any).consultationRate || 150)
                    }}
                    isOpen={isBookingModalOpen}
                    onClose={() => setIsBookingModalOpen(false)}
                    onSuccess={() => {
                      // Optionally refresh or redirect
                    }}
                  />
                )}
              </Card>
            )}

            {/* Expertise Areas - for consultation */}
            <Card className="p-6 border-0 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Expertise</h2>
              <div className="space-y-2">
                {(profileData.expertise && profileData.expertise.length > 0 ? profileData.expertise : [
                  "Product Strategy",
                  "AI/ML Development",
                  "Team Leadership",
                  "User Research",
                ]).slice(0, 4).map((area: string) => (
                  <div key={area} className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                    {area}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
