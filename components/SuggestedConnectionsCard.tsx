"use client"

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserPlus, Users } from 'lucide-react'
import { safeApiCall } from '@/lib/utils/api'
import toast from 'react-hot-toast'
import { useSidebarData } from '@/contexts/SidebarDataContext'

interface SuggestedConnectionsCardProps {
  className?: string
}

export default function SuggestedConnectionsCard({ className = "" }: SuggestedConnectionsCardProps) {
  const { suggestedConnections, followStatus, suggestedConnectionsLoading, updateFollowStatus } = useSidebarData()
  const [connecting, setConnecting] = useState<Set<number>>(new Set())

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
        // Optimistic update via context
        updateFollowStatus(userId, 'pending')
        toast.success(`Connection request sent to ${userName}`)
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

  if (suggestedConnectionsLoading) {
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

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Suggested Connections</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
          {suggestedConnections.length} members
        </span>
      </div>
      <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
        {suggestedConnections.length === 0 ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">No suggestions available</p>
          </div>
        ) : (
          suggestedConnections.map((suggestion) => (
            <div key={suggestion.id} className="flex items-center space-x-2">
              <div
                className="flex items-center space-x-2 flex-1 min-w-0 cursor-pointer hover:bg-muted/50 rounded-md p-1 -m-1 transition-colors"
                onClick={() => window.location.href = `/profile/${suggestion.id}`}
              >
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
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
                  <p className="text-xs font-medium truncate hover:underline">{suggestion.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {suggestion.chapters && suggestion.chapters.length > 0 && (
                      <span>{suggestion.chapters[0].chapter_name}</span>
                    )}
                  </p>
                </div>
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
