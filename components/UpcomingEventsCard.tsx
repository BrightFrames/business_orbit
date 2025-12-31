"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, MapPin, Users } from 'lucide-react'
import { safeApiCall } from '@/lib/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface Event {
  id: string
  title: string
  description?: string
  date: string
  time: string
  location: string
  host: string
  attendees_count: number
  max_attendees?: number
  is_joined: boolean
  event_type?: string
}

interface UpcomingEventsCardProps {
  className?: string
}

export default function UpcomingEventsCard({ className = "" }: UpcomingEventsCardProps) {
  const { user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        setError(null)

        const result = await safeApiCall(
          () => fetch(`/api/events${user ? `?userId=${user.id}` : ''}`, {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            }
          }),
          'Failed to fetch events'
        )

        if (result.success && result.data && Array.isArray(result.data)) {
          // The events API returns the events array directly
          const eventsData = result.data as any[]
          
          // Filter for upcoming events and limit to 3
          const upcomingEvents = eventsData
            .filter((event: any) => {
              try {
                const eventDate = new Date(event.date)
                const now = new Date()
                // Add some tolerance for events happening today
                now.setHours(0, 0, 0, 0)
                return eventDate >= now
              } catch (error) {
                console.error('Error parsing event date:', event.date, error)
                return false
              }
            })
            .slice(0, 3)
            .map((event: any) => ({
              id: event.id,
              title: event.title,
              description: event.description,
              date: event.date,
              time: event.time || '6:00 PM',
              location: event.venue_address || 'TBD',
              host: event.host || 'Business Orbit',
              attendees_count: event.rsvp_count || 0,
              max_attendees: event.max_attendees,
              is_joined: event.is_registered || false,
              event_type: event.event_type
            }))
          setEvents(upcomingEvents)
        } else {
          setError('Failed to load events')
        }
      } catch (error) {
        console.error('Error fetching events:', error)
        setError('Failed to load events')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [user])

  const handleJoinEvent = async (eventId: string, eventTitle: string) => {
    try {
      setJoining(prev => new Set(prev).add(eventId))
      
      const result = await safeApiCall(
        () => fetch(`/api/events/${eventId}/rsvp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ action: 'join' })
        }),
        'Failed to join event'
      )
      
      if (result.success) {
        // Update the event status
        setEvents(prev => prev.map(event => 
          event.id === eventId 
            ? { ...event, is_joined: true, attendees_count: event.attendees_count + 1 }
            : event
        ))
        toast.success(`Registered for ${eventTitle}`)
      } else {
        toast.error(result.error || 'Failed to join event')
      }
    } catch (error) {
      console.error('Error joining event:', error)
      toast.error('Failed to join event')
    } finally {
      setJoining(prev => {
        const newSet = new Set(prev)
        newSet.delete(eventId)
        return newSet
      })
    }
  }

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

  if (loading) {
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
      <h3 className="font-semibold text-sm mb-3">Upcoming Events</h3>
      <div className="space-y-3">
        {events.length === 0 ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-2">
              <Calendar className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">No upcoming events</p>
          </div>
        ) : (
          events.map((event) => (
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
                  onClick={() => handleJoinEvent(event.id, event.title)}
                  disabled={joining.has(event.id)}
                >
                  {joining.has(event.id) ? (
                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Join Event'
                  )}
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
