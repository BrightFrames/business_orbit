"use client"

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, Lock } from 'lucide-react'
import { useSidebarData } from '@/contexts/SidebarDataContext'
import { useState } from 'react'

interface SecretGroupsCardProps {
  className?: string
}

export default function SecretGroupsCard({ className = "" }: SecretGroupsCardProps) {
  const { secretGroups, secretGroupsLoading } = useSidebarData()
  const [expanded, setExpanded] = useState(false)

  if (secretGroupsLoading) {
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
            {secretGroups.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({secretGroups.length})
              </span>
            )}
          </div>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""
              }`}
          />
        </Button>

        {expanded && (
          <div className="ml-6 mt-2 space-y-1">
            {secretGroups.length === 0 ? (
              <p className="text-xs text-muted-foreground">No secret groups available</p>
            ) : (
              secretGroups.map((group) => (
                <Button
                  key={group.id}
                  variant="ghost"
                  className="w-full justify-start p-1 h-auto text-xs"
                  onClick={() => {
                    if (group.id.startsWith('secret-')) {
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
