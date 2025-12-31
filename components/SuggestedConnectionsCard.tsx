"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserPlus, Users } from 'lucide-react'
import { safeApiCall } from '@/lib/utils/api'
import toast from 'react-hot-toast'

interface SuggestedConnection {
  id: number
  name: string
  profile_photo_url?: string
  email?: string
  chapters?: Array<{
    chapter_id: string
    chapter_name: string
    location_city?: string
  }>
  userJoinedAt?: string
}

interface SuggestedConnectionsCardProps {
  className?: string
}

export default function SuggestedConnectionsCard({ className = "" }: SuggestedConnectionsCardProps) {
  const [suggestions, setSuggestions] = useState<SuggestedConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState<Set<number>>(new Set())
  const [followStatus, setFollowStatus] = useState<Map<number, 'following' | 'pending' | 'not-following'>>(new Map())

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch all community members
        const result = await safeApiCall(
          () => fetch('/api/members', {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            }
          }),
          'Failed to fetch community members'
        )

         if (result.success && result.data) {
           const membersData = result.data as any
           const members = membersData.members || []
           
           // Show all community members
           const suggested = members.map((member: any) => ({
             id: member.id,
             name: member.name,
             profile_photo_url: member.profilePhotoUrl,
             email: member.email,
             chapters: member.chapters || [],
             userJoinedAt: member.userJoinedAt
           }))
           
           setSuggestions(suggested)

          // Fetch follow status for these users
          if (suggested.length > 0) {
            await fetchFollowStatus(suggested.map((s: any) => s.id))
          }
        }

      } catch (error) {
        setError('Failed to load community members')
      } finally {
        setLoading(false)
      }
    }

    fetchSuggestions()
  }, [])

  const fetchFollowStatus = async (userIds: number[]) => {
    try {
      const userIdsParam = userIds.join(',')
      const result = await safeApiCall(
        () => fetch(`/api/follow?checkStatus=true&userIds=${userIdsParam}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        }),
        'Failed to fetch follow status'
      )

      if (result.success && result.data) {
        const data = result.data as any
        if (data.followStatus) {
          const statusMap = new Map(Object.entries(data.followStatus).map(([k, v]) => [parseInt(k), v as any]))
          setFollowStatus(statusMap)
        }
      }
    } catch (error) {
      // Error fetching follow status
    }
  }

  const handleConnect = async (userId: number, userName: string) => {
    try {
      setConnecting(prev => new Set(prev).add(userId))
      
      const result = await safeApiCall(
        () => fetch('/api/follow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            targetUserId: userId,
            action: 'follow'
          })
        }),
        'Failed to send connection request'
      )

      if (result.success) {
        // Update follow status
        setFollowStatus(prev => new Map(prev).set(userId, 'pending'))
        
        // Show success message
        toast.success(`Connection request sent to ${userName}`)
        
        // Optional: Remove from suggestions after connecting
        // setSuggestions(prev => prev.filter(suggestion => suggestion.id !== userId))
      } else {
        toast.error(result.error || 'Failed to send connection request')
      }

    } catch (error) {
      toast.error('Failed to send connection request')
    } finally {
      setConnecting(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  if (loading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-40 mb-3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-muted rounded w-24"></div>
                  <div className="h-3 bg-muted rounded w-16"></div>
                </div>
                <div className="w-16 h-6 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="text-center text-sm text-muted-foreground">
          {error}
        </div>
      </Card>
    )
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Suggested Connections</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
          {suggestions.length} members
        </span>
      </div>
      <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
        {suggestions.length === 0 ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">No suggestions available</p>
          </div>
        ) : (
          suggestions.map((suggestion) => (
            <div key={suggestion.id} className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                {suggestion.profile_photo_url ? (
                  <img
                    src={suggestion.profile_photo_url}
                    alt={suggestion.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold">
                    {suggestion.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{suggestion.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {suggestion.chapters && suggestion.chapters.length > 0 && (
                    <span>{suggestion.chapters[0].chapter_name}</span>
                  )}
                </p>
              </div>
              <Button
                size="sm"
                className="h-6 px-2 text-xs cursor-pointer flex-shrink-0"
                onClick={() => handleConnect(suggestion.id, suggestion.name)}
                disabled={connecting.has(suggestion.id) || followStatus.get(suggestion.id) !== 'not-following'}
                variant={followStatus.get(suggestion.id) === 'following' || followStatus.get(suggestion.id) === 'pending' ? 'secondary' : 'default'}
              >
                {connecting.has(suggestion.id) ? (
                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                ) : followStatus.get(suggestion.id) === 'following' ? (
                  'Connected'
                ) : followStatus.get(suggestion.id) === 'pending' ? (
                  'Pending'
                ) : (
                  <>
                    <UserPlus className="w-3 h-3 mr-1" />
                    Connect
                  </>
                )}
              </Button>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}


