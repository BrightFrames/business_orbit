"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Calendar, UserPlus, Check, Clock } from 'lucide-react'
import { safeApiCall } from '@/lib/utils/api'
import { toast } from 'sonner'
import toastHot from 'react-hot-toast'

interface Member {
  id: number
  name: string
  email: string
  profilePhotoUrl?: string
  userJoinedAt: string
  chapters: any[]
}

interface MembersCardProps {
  className?: string
}

export default function MembersCard({ className = "" }: MembersCardProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [following, setFollowing] = useState<Set<number>>(new Set())
  const [followLoading, setFollowLoading] = useState<Set<number>>(new Set())
  const [pendingRequests, setPendingRequests] = useState<Set<number>>(new Set())

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true)
        const result = await safeApiCall(
          () => fetch('/api/members', {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            }
          }),
          'Failed to fetch members'
        )

        if (result.success && result.data && typeof result.data === 'object' && result.data !== null) {
          const data = result.data as any
          if (data.success && Array.isArray(data.members)) {
            setMembers(data.members)
          } else {
            setError('No members found')
          }
        } else {
          setError(result.error || 'Failed to fetch members')
        }
      } catch {
        setError('Failed to fetch members')
      } finally {
        setLoading(false)
      }
    }

    fetchMembers()
  }, [])

  // Load current user's following list
  useEffect(() => {
    const fetchFollowing = async () => {
      try {
        const result = await safeApiCall(
          () => fetch('/api/follow', {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            }
          }),
          'Failed to fetch following list'
        )

        if (result.success && result.data && typeof result.data === 'object' && result.data !== null) {
          const data = result.data as any
          if (data.success && Array.isArray(data.following)) {
            const followingIds = new Set<number>(data.following.map((user: any) => Number(user.id)))
            setFollowing(followingIds)
          }
        }
      } catch {
      }
    }

    fetchFollowing()
  }, [])

  // Load sent follow requests
  useEffect(() => {
    const fetchSentRequests = async () => {
      try {
        const result = await safeApiCall(
          () => fetch('/api/follow-requests?type=sent', {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            }
          }),
          'Failed to fetch sent requests'
        )

        if (result.success && result.data && typeof result.data === 'object' && result.data !== null) {
          const data = result.data as any
          if (data.success && Array.isArray(data.requests)) {
            const pendingIds = new Set<number>(data.requests
              .filter((req: any) => req.status === 'pending')
              .map((req: any) => Number(req.targetId))
            )
            setPendingRequests(pendingIds)
          }
        }
      } catch {
      }
    }

    fetchSentRequests()
  }, [])

  const handleFollow = async (memberId: number, memberName: string) => {
    try {
      setFollowLoading(prev => new Set(prev).add(memberId))
      
      const isCurrentlyFollowing = following.has(memberId)
      const action = isCurrentlyFollowing ? 'unfollow' : 'follow'
      
      const result = await safeApiCall(
        () => fetch('/api/follow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            targetUserId: memberId,
            action: action
          })
        }),
        `Failed to ${action} member`
      )
      
      if (result.success) {
        setFollowing(prev => {
          const newSet = new Set(prev)
          if (isCurrentlyFollowing) {
            newSet.delete(memberId)
            toast.success(`Unfollowed ${memberName}`)
          } else {
            newSet.add(memberId)
            toast.success(`Following ${memberName}`)
          }
          return newSet
        })
      } else {
        toast.error(result.error || `Failed to ${action} member`)
      }
    } catch {
      toast.error('Failed to follow member')
    } finally {
      setFollowLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(memberId)
        return newSet
      })
    }
  }


  if (loading) {
    return (
      <Card className={`p-4 pt-6 mt-8 ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Community Members</h3>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`p-4 pt-6 mt-8 ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Community Members</h3>
        </div>
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`p-4 pt-6 mt-8 ${className}`}>
      <div className="flex items-center space-x-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Community Members</h3>
        <Badge variant="secondary" className="ml-auto">
          {members.length}
        </Badge>
      </div>
      
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {members.map((member) => (
          <div key={member.id} className="p-3 rounded-lg hover:bg-muted/50 transition-colors border border-border/50">
            <div className="flex items-start space-x-3 mb-3">
              <div 
                className="relative cursor-pointer"
                onClick={() => {
                  toastHot("This feature is enabled in Phase2/Version2", {
                    duration: 3000,
                  })
                }}
              >
                {member.profilePhotoUrl ? (
                  <img
                    src={member.profilePhotoUrl}
                    alt={member.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-background"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/40 rounded-full flex items-center justify-center text-sm font-semibold text-primary border-2 border-background">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              
              <div 
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => {
                  toastHot("This feature is enabled in Phase2/Version2", {
                    duration: 3000,
                  })
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-sm">{member.name}</h4>
                  <Button
                    size="sm"
                    variant={
                      following.has(member.id) 
                        ? "outline" 
                        : pendingRequests.has(member.id) 
                        ? "secondary" 
                        : "default"
                    }
                    onClick={() => handleFollow(member.id, member.name)}
                    disabled={followLoading.has(member.id) || pendingRequests.has(member.id)}
                    className="h-7 px-3 text-xs cursor-pointer"
                  >
                    {followLoading.has(member.id) ? (
                      <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    ) : following.has(member.id) ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Following
                      </>
                    ) : pendingRequests.has(member.id) ? (
                      <>
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3 h-3 mr-1" />
                        Follow
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>Joined {new Date(member.userJoinedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {members.length === 0 && (
        <div className="text-center py-6">
          <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No members found</p>
        </div>
      )}
    </Card>
  )
}
