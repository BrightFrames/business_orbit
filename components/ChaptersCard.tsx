"use client"

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSidebarData } from '@/contexts/SidebarDataContext'
import { useState } from 'react'

interface ChaptersCardProps {
  className?: string
}

export default function ChaptersCard({ className = "" }: ChaptersCardProps) {
  const router = useRouter()
  const { chapters, chaptersLoading } = useSidebarData()
  const [expanded, setExpanded] = useState(false)

  if (chaptersLoading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded w-20"></div>
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
            <Users className="w-4 h-4 mr-2" />
            <span className="text-sm">Chapters</span>
            {chapters.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({chapters.length})
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
            {chapters.length === 0 ? (
              <p className="text-xs text-muted-foreground">No chapters available</p>
            ) : (
              chapters.map((chapter) => (
                <Button
                  key={chapter.id}
                  variant="ghost"
                  className="w-full justify-start p-1 h-auto text-xs"
                  onClick={() => {
                    if (chapter.id.startsWith('chapter-')) {
                      router.push('/chapters')
                    } else {
                      router.push(`/chapters/${chapter.id}`)
                    }
                  }}
                >
                  {chapter.name}
                </Button>
              ))
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
