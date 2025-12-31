"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { safeApiCall } from '@/lib/utils/api'
import { useAuth } from '@/contexts/AuthContext'

interface Chapter {
  id: string
  name: string
  location_city: string
  member_count: number
}

interface ChaptersCardProps {
  className?: string
}

export default function ChaptersCard({ className = "" }: ChaptersCardProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const fetchChapters = async () => {
      if (!user) return
      
      try {
        setLoading(true)
        setError(null)

        const result = await safeApiCall(
          () => fetch(`/api/users/${user.id}/chapters`, {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            }
          }),
          'Failed to fetch user chapters'
        )

        if (result.success && result.data && typeof result.data === 'object' && result.data !== null) {
          const data = result.data as any
          if (data.success && Array.isArray(data.chapters)) {
            setChapters(data.chapters.slice(0, 5)) // Limit to 5 chapters
          } else {
            setError('Failed to load chapters')
          }
        } else {
          setError('Failed to load chapters')
        }
      } catch (error) {
        console.error('Error fetching chapters:', error)
        setError('Failed to load chapters')
      } finally {
        setLoading(false)
      }
    }

    fetchChapters()
  }, [user])

  if (loading) {
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
            <Users className="w-4 h-4 mr-2" />
            <span className="text-sm">Chapters</span>
            {chapters.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({chapters.length})
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
            {chapters.length === 0 ? (
              <p className="text-xs text-muted-foreground">No chapters available</p>
            ) : (
              chapters.map((chapter) => (
                <Button
                  key={chapter.id}
                  variant="ghost"
                  className="w-full justify-start p-1 h-auto text-xs"
                  onClick={() => {
                    // Try to navigate to chapter page, or show a message if it's a preference-based chapter
                    if (chapter.id.startsWith('chapter-')) {
                      // This is a preference-based chapter, navigate to chapters page
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


