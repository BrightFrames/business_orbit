"use client"

import { useState, useEffect } from 'react'
import { EventCard } from '@/components/PostCard'
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

interface DynamicEventsFeedProps {
  className?: string
}

export default function DynamicEventsFeed({ className = "" }: DynamicEventsFeedProps) {
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
          
          // Get upcoming events and limit to 2 for the feed
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
            .slice(0, 2)
            .map((event: any) => ({
              id: event.id,
              title: event.title,
              description: event.description,
              date: event.date,
              time: event.time || '6:00 PM', // Default time if not provided
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
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className={`space-y-4 lg:space-y-6 ${className}`}>
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="p-6 border border-border/50 rounded-lg bg-card/50">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-muted rounded-full"></div>
                  <div className="h-6 bg-muted rounded w-24"></div>
                </div>
                <div className="h-8 bg-muted rounded w-20"></div>
              </div>
              <div className="space-y-2">
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-4 lg:space-y-6 ${className}`}>
        <div className="p-6 border border-border/50 rounded-lg bg-card/50 text-center">
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return null // Don't show anything if no events
  }

  return (
    <div className={`space-y-4 lg:space-y-6 ${className}`}>
      {events.map((event) => (
        <EventCard
          key={event.id}
          title={event.title}
          host={event.host}
          date={formatEventDate(event.date)}
          time={event.time}
          location={event.location}
          attendees={event.attendees_count}
          isJoined={event.is_joined}
        />
      ))}
    </div>
  )
}
