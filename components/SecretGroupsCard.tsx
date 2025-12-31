"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, Lock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface SecretGroup {
  id: string
  name: string
  description?: string
  member_count?: number
  is_private: boolean
}

interface SecretGroupsCardProps {
  className?: string
}

export default function SecretGroupsCard({ className = "" }: SecretGroupsCardProps) {
  const { user } = useAuth()
  const [groups, setGroups] = useState<SecretGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const fetchSecretGroups = async () => {
      if (!user?.id) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const res = await fetch(`/api/users/${user.id}/secret-groups`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (res.ok) {
          const data = await res.json()
          const userGroups = (data?.groups || []).map((g: any) => ({
            id: String(g.id),
            name: String(g.name || ''),
            description: g.description,
            member_count: Number(g.member_count || 0),
            is_private: true
          }))
          setGroups(userGroups)
        } else {
          setError('Failed to load secret groups')
        }
      } catch (error) {
        setError('Failed to load secret groups')
      } finally {
        setLoading(false)
      }
    }

    fetchSecretGroups()
  }, [user?.id])

  if (loading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded w-24"></div>
            </div>
            <div className="w-4 h-4 bg-muted rounded"></div>
          </div>
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-6 bg-muted rounded"></div>
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
      <div className="space-y-3">
        <Button
          variant="ghost"
          className="w-full justify-between p-2 h-auto"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center">
            <Lock className="w-4 h-4 mr-2" />
            <span className="text-sm">Secret Groups</span>
            {groups.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({groups.length})
              </span>
            )}
          </div>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </Button>
        
        {expanded && (
          <div className="ml-6 mt-2 space-y-1">
            {groups.length === 0 ? (
              <p className="text-xs text-muted-foreground">No secret groups available</p>
            ) : (
              groups.map((group) => (
                <Button
                  key={group.id}
                  variant="ghost"
                  className="w-full justify-start p-1 h-auto text-xs"
                  onClick={() => {
                    // Try to navigate to group page, or show a message if it's a preference-based group
                    if (group.id.startsWith('secret-')) {
                      // This is a preference-based group, navigate to groups page
                      window.location.href = '/product/groups'
                    } else {
                      window.location.href = `/product/groups/${group.id}`
                    }
                  }}
                >
                  {group.name}
                  {group.member_count !== undefined && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      ({group.member_count})
                    </span>
                  )}
                </Button>
              ))
            )}
          </div>
        )}
      </div>
    </Card>
  )
}


