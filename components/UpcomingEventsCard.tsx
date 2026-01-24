"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, MapPin, Users } from 'lucide-react'
import { useSidebarData } from '@/contexts/SidebarDataContext'

interface UpcomingEventsCardProps {
  className?: string
}

export default function UpcomingEventsCard({ className = "" }: UpcomingEventsCardProps) {
  const router = useRouter()
  const { upcomingEvents, eventsLoading } = useSidebarData()
  const [joining, setJoining] = useState<Set<string>>(new Set())

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Tomorrow'
    } else if (diffDays < 7) {
      return `In ${diffDays} days`
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    }
  }

  if (eventsLoading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-32 mb-3"></div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-6 bg-muted rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`p-4 ${className}`}>
      <h3 className="font-semibold text-sm mb-3">Upcoming Events</h3>
      <div className="space-y-3">
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-2">
              <Calendar className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">No upcoming events</p>
          </div>
        ) : (
          upcomingEvents.map((event) => (
            <div key={event.id} className="space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-xs font-medium">{event.title}</h4>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatEventDate(event.date)}</span>
                    <Clock className="w-3 h-3 ml-2" />
                    <span>{event.time}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                  {event.attendees_count > 0 && (
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                      <Users className="w-3 h-3" />
                      <span>{event.attendees_count} attending</span>
                    </div>
                  )}
                </div>
              </div>

              {!event.is_joined && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs cursor-pointer"
                  onClick={() => router.push(`/product/events/${event.id}/join`)}
                  disabled={joining.has(event.id)}
                >
                  Join Event
                </Button>
              )}

              {event.is_joined && (
                <div className="text-xs text-green-600 font-medium">
                  ✓ Registered
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
