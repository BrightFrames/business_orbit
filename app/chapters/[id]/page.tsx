"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DisplayPostCard } from "@/components/PostCard"
import { Users, Calendar, Trophy, MapPin, Plus, Loader2, ArrowLeft, Smile, Paperclip, Send, Copy, Trash2, UserPlus, Lock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { io, Socket } from "socket.io-client"
import { useAuth } from "@/contexts/AuthContext"
import { safeApiCall } from "@/lib/utils/api"
import { toast } from "sonner"

interface ChapterData {
  id: string
  name: string
  location_city: string
  member_count: number
  description?: string
  joined_at?: string
}

interface ChapterMember {
  id: number
  name: string
  email: string
  profile_photo_url?: string
}

interface ChapterPost {
  author: {
    name: string
    role: string
    avatar: string
    rewardScore: number
  }
  content: string
  timestamp: string
  engagement: {
    likes: number
    comments: number
    shares: number
  }
}

interface ChapterEvent {
  id: number
  title: string
  description?: string
  date: string
  time: string
  attendees: number
  is_registered: boolean
  event_type: string
  venue_address?: string
}

interface TopContributor {
  name: string
  role: string
  score: number
  avatar: string
}

export default function ChapterPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [chapterData, setChapterData] = useState<ChapterData | null>(null)
  const [chapterMembers, setChapterMembers] = useState<ChapterMember[]>([])
  const [loading, setLoading] = useState(true)
  const [membersLoading, setMembersLoading] = useState(false)
  // Chat state
  type ChatMessage = {
    id: string
    chapterId: string
    senderId: string
    senderName: string
    senderAvatarUrl?: string | null
    content: string
    timestamp: string
  }
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState<boolean>(false)
  const messagesContainerRef = (globalThis as any).__messagesContainerRef as { current: HTMLDivElement | null } || { current: null }
  ;(globalThis as any).__messagesContainerRef = messagesContainerRef
  const [input, setInput] = useState<string>("")
  const [connecting, setConnecting] = useState<boolean>(true)
  const [connectionError, setConnectionError] = useState<string>("")
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false)
  const fileInputRef = (globalThis as any).__chapterFileInputRef as { current: HTMLInputElement | null } || { current: null }
  ;(globalThis as any).__chapterFileInputRef = fileInputRef
  const socketRef = (globalThis as any).__chapterSocketRef as { current: Socket | null } || { current: null }
  ;(globalThis as any).__chapterSocketRef = socketRef
  
  const fetchingMembersRef = (globalThis as any).__fetchingMembersRef as { current: boolean } || { current: false }
  ;(globalThis as any).__fetchingMembersRef = fetchingMembersRef
  // Chat server endpoints: separate HTTP base and WS base
  const CHAT_HTTP_URL = process.env.NEXT_PUBLIC_CHAT_SOCKET_URL || 'http://localhost:4000'
  const CHAT_WS_URL = CHAT_HTTP_URL.replace(/^http/, 'ws')
  const [onlineCount, setOnlineCount] = useState<number>(0)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  
  // Follow functionality state
  const [followStatus, setFollowStatus] = useState<Record<number, 'following' | 'pending' | 'not-following'>>({})
  const [followLoading, setFollowLoading] = useState<Record<number, boolean>>({})
  
  // Events state
  const [upcomingEvents, setUpcomingEvents] = useState<ChapterEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [lastEventsUpdate, setLastEventsUpdate] = useState<Date | null>(null)

  // Mock data for posts, events, and contributors (can be replaced with real APIs later)
  const chapterPosts: ChapterPost[] = [
  {
    author: {
      name: "Rajesh Kumar",
      role: "Tech Lead",
      avatar: "RK",
      rewardScore: 88,
    },
      content: "Excited to announce our upcoming AI workshop next week! We'll be covering practical applications of machine learning in product development. Who's interested in joining?",
    timestamp: "3h ago",
    engagement: {
      likes: 15,
      comments: 8,
      shares: 2,
    },
  },
  {
    author: {
      name: "Priya Sharma",
      role: "Product Manager",
      avatar: "PS",
      rewardScore: 92,
    },
      content: "Great networking session yesterday! Connected with some amazing founders working on fintech solutions. The startup ecosystem is truly thriving.",
    timestamp: "1d ago",
    engagement: {
      likes: 23,
      comments: 6,
      shares: 4,
    },
  },
]


  const topContributors: TopContributor[] = [
  { name: "Sarah Chen", role: "Product Manager", score: 95, avatar: "SC" },
  { name: "Michael Rodriguez", role: "Tech Lead", score: 88, avatar: "MR" },
  { name: "Priya Sharma", role: "Marketing Director", score: 92, avatar: "PS" },
  { name: "Alex Thompson", role: "UX Designer", score: 85, avatar: "AT" },
]

  // Helper function to format membership date
  const formatMembershipDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "Member"
    
    try {
      const date = new Date(dateString)
      const month = date.toLocaleString('default', { month: 'short' })
      const year = date.getFullYear()
      return `Member since ${month} ${year}`
    } catch (error) {
      return "Member"
    }
  }

  // Fetch chapter data
  const fetchChapterData = async () => {
    if (!params.id || !user) return

    setLoading(true)
    try {
      // First, get all chapters to find the one with matching ID
      const chaptersResult = await safeApiCall(
        () => fetch('/api/chapters', { credentials: 'include' }),
        'Failed to fetch chapters'
      )

      if (chaptersResult.success && chaptersResult.data && typeof chaptersResult.data === 'object' && chaptersResult.data !== null) {
        const data = chaptersResult.data as any
        const chapters = data.chapters || []
        const chapter = chapters.find((c: any) => c.id === params.id)
        
        if (chapter) {
          // Fetch user's membership date for this chapter
          let joinedAt = "Member"
          try {
            const membershipResult = await safeApiCall(
              () => fetch(`/api/chapters/${params.id}/membership`, { credentials: 'include' }),
              'Failed to fetch membership date'
            )
            
            if (membershipResult.success && membershipResult.data && typeof membershipResult.data === 'object' && membershipResult.data !== null) {
              const membershipData = membershipResult.data as any
              if (membershipData.joined_at) {
                joinedAt = formatMembershipDate(membershipData.joined_at)
              }
            } else if (membershipResult.error && membershipResult.error.includes('404')) {
              // User is not a member, show default
              joinedAt = "Member"
            }
          } catch (error) {
            // If membership fetch fails, just use default
            console.error('Error fetching membership date:', error)
          }

          setChapterData({
            id: chapter.id,
            name: chapter.name,
            location_city: chapter.location_city,
            member_count: 0, // Will be updated when we fetch members
            description: `A community of professionals and innovators in ${chapter.location_city}`,
            joined_at: joinedAt
          })
        } else {
          toast.error('Chapter not found')
          router.push('/product/chapters')
          return
        }
      } else {
        toast.error('Failed to load chapter data')
        router.push('/product/chapters')
        return
      }
    } catch (error) {
      console.error('Error fetching chapter data:', error)
      toast.error('Failed to load chapter data')
      router.push('/product/chapters')
    } finally {
      setLoading(false)
    }
  }

  // Fetch chapter members
  const fetchChapterMembers = async () => {
    if (!params.id || membersLoading || fetchingMembersRef.current) return

    fetchingMembersRef.current = true
    setMembersLoading(true)
    try {
      const result = await safeApiCall(
        () => fetch(`/api/chapters/${params.id}/members`, { credentials: 'include' }),
        'Failed to fetch chapter members'
      )

      if (result.success && result.data && typeof result.data === 'object' && result.data !== null) {
        const data = result.data as any
        const members = data.members || []
        setChapterMembers(members)
        
        // Update member count in chapterData to reflect actual number of members
        setChapterData(prev => {
          if (prev) {
            return {
              ...prev,
              member_count: members.length
            }
          }
          return prev
        })
      } else {
        console.error('API call failed or returned no data:', result)
        if (result.error) {
          console.error('Error fetching chapter members:', result.error)
          toast.error('Failed to load chapter members')
        }
      }
    } catch (error) {
      console.error('Exception in fetchChapterMembers:', error)
      toast.error('Failed to load chapter members')
    } finally {
      setMembersLoading(false)
      fetchingMembersRef.current = false
    }
  }

  // Follow functionality
  const handleFollow = async (memberId: number, memberName: string) => {
    if (!user || user.id === memberId) return
    
    setFollowLoading(prev => ({ ...prev, [memberId]: true }))
    
    try {
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          targetUserId: memberId,
          action: 'follow'
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setFollowStatus(prev => ({ ...prev, [memberId]: 'pending' }))
        toast.success(data.message || `Follow request sent to ${memberName}`)
      } else {
        toast.error(data.error || 'Failed to send follow request')
      }
    } catch (error) {
      console.error('Error sending follow request:', error)
      toast.error('Failed to send follow request')
    } finally {
      setFollowLoading(prev => ({ ...prev, [memberId]: false }))
    }
  }

  const handleUnfollow = async (memberId: number, memberName: string) => {
    if (!user || user.id === memberId) return
    
    setFollowLoading(prev => ({ ...prev, [memberId]: true }))
    
    try {
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          targetUserId: memberId,
          action: 'unfollow'
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setFollowStatus(prev => ({ ...prev, [memberId]: 'not-following' }))
        toast.success(data.message || `Unfollowed ${memberName}`)
      } else {
        toast.error(data.error || 'Failed to unfollow')
      }
    } catch (error) {
      console.error('Error unfollowing:', error)
      toast.error('Failed to unfollow')
    } finally {
      setFollowLoading(prev => ({ ...prev, [memberId]: false }))
    }
  }

  const handleCreateSecretGroup = (memberId: number, memberName: string) => {
    // Placeholder functionality - can be implemented later
    toast.info(`Create Secret Group with ${memberName} - Feature coming soon!`)
  }

  // Check follow status for all members
  const checkFollowStatus = async () => {
    if (!user || chapterMembers.length === 0) return

    try {
      const memberIds = chapterMembers
        .filter(member => member.id !== user.id)
        .map(member => member.id)
        .join(',')

      if (memberIds) {
        const response = await fetch(`/api/follow?checkStatus=true&userIds=${memberIds}`, {
          credentials: 'include'
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.followStatus) {
            setFollowStatus(data.followStatus)
          }
        }
      }
    } catch (error) {
      console.error('Error checking follow status:', error)
    }
  }

  // Fetch upcoming events with enhanced filtering and caching
  const fetchUpcomingEvents = async (forceRefresh = false) => {
    // Skip refresh if already loading and not forced
    if (eventsLoading && !forceRefresh) return
    
      setEventsLoading(true)
    try {
      // Include user ID in query for better filtering (RSVP status)
      const url = user?.id ? `/api/events?userId=${user.id}&limit=8` : '/api/events?limit=8'
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Cache-Control': forceRefresh ? 'no-cache' : 'default'
        }
      })
      
      if (response.ok) {
        const events = await response.json()
        
        // Filter upcoming events, sort by date, and limit to 5 (showing more relevant events)
        const now = new Date()
        const upcoming = events
          .filter((event: any) => {
            if (!event.date) return false
            try {
              const eventDate = new Date(event.date)
              // Include events starting from now onwards (including today)
              return eventDate >= now && event.status === 'approved'
            } catch (error) {
              console.error('Error parsing event date:', event.date, error)
              return false
            }
          })
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 5) // Show top 5 upcoming events instead of just 3
          .map((event: any) => {
            const eventDate = new Date(event.date)
            return {
              id: event.id,
              title: event.title,
              description: event.description,
              date: eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              time: eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
              attendees: event.rsvp_count || 0,
              is_registered: event.is_registered || false,
              event_type: event.event_type,
              venue_address: event.venue_address
            }
          })
        
        setUpcomingEvents(upcoming)
        setLastEventsUpdate(new Date())
        
        // Show a subtle success message only for manual refreshes
        if (forceRefresh) {
          toast.success(`Events updated - ${upcoming.length} upcoming event${upcoming.length === 1 ? '' : 's'} found`)
        }
      } else {
        const errorData = await response.json()
        console.error('Events API error:', errorData)
        toast.error('Failed to load events: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error fetching events:', error)
      toast.error('Failed to load events')
    } finally {
      setEventsLoading(false)
    }
  }

  // Manual refresh function for events
  const handleRefreshEvents = () => {
    fetchUpcomingEvents(true)
  }

  useEffect(() => {
    if (!authLoading && user) {
      fetchChapterData()
    }
  }, [params.id, authLoading, user])

  useEffect(() => {
    if (chapterData && params.id) {
      // Add a small delay to prevent rapid successive calls
      const timeoutId = setTimeout(() => {
        fetchChapterMembers()
      }, 100)
      
      return () => clearTimeout(timeoutId)
    }
  }, [chapterData?.id]) // Only depend on chapterData.id to avoid infinite loops

  // Check follow status when members are loaded
  useEffect(() => {
    if (chapterMembers.length > 0 && user) {
      checkFollowStatus()
    }
  }, [chapterMembers, user])

  // Periodic refresh of follow status (every 30 seconds)
  useEffect(() => {
    if (!user || chapterMembers.length === 0) return

    const interval = setInterval(() => {
      checkFollowStatus()
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [user, chapterMembers])

  // Fetch events when page loads
  useEffect(() => {
    if (!authLoading && user) {
      fetchUpcomingEvents()
    }
  }, [authLoading, user])

  // Auto-refresh events every 2 minutes for better real-time updates
  useEffect(() => {
    if (!user || authLoading) return

    const interval = setInterval(() => {
      fetchUpcomingEvents(false) // Silent refresh, no toast notification
    }, 120000) // Refresh every 2 minutes

    return () => clearInterval(interval)
  }, [user, authLoading])

  // Refresh events when page regains focus (when user comes back to tab)
  useEffect(() => {
    if (!user || authLoading) return

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchUpcomingEvents(false) // Silent refresh when tab regains focus
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user, authLoading])

  // Handle event RSVP functionality
  const handleEventRSVP = async (eventId: number, eventTitle: string) => {
    if (!user) {
      toast.error('Please sign in to RSVP to events')
      return
    }

    try {
      const response = await fetch(`/api/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          userName: user.name
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success(`Successfully RSVP'd to ${eventTitle}`)
        // Refresh events to update RSVP status
        setTimeout(() => fetchUpcomingEvents(true), 1000)
      } else {
        toast.error(data.message || 'Failed to RSVP to event')
      }
    } catch (error) {
      console.error('Error RSVPing to event:', error)
      toast.error('Failed to RSVP to event')
    }
  }

  // Load initial messages
  useEffect(() => {
    async function load() {
      if (!params.id) return
      try {
        // Use app API only (auth-protected, membership aware)
        const res = await fetch(`/api/chat/${params.id}/messages?limit=50`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json() as { success: boolean; messages: ChatMessage[]; nextCursor?: string | null }
          if (data.success) {
            setMessages(data.messages || [])
            setNextCursor(data.nextCursor || null)
            return
          }
        }
        // If no messages found, initialize with empty array
        setMessages([])
        setNextCursor(null)
      } catch (e) {
        console.error('Load chat messages error', e)
        // Initialize with empty array on error
        setMessages([])
        setNextCursor(null)
      }
    }
    load()
    // Also refresh when tab regains focus to ensure latest persisted messages
    const onFocus = () => load()
    window.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('focus', onFocus)
    }
  }, [params.id])

  // Connect websocket (optional - only if chat server is available)
  useEffect(() => {
    if (!params.id || authLoading) return
    
    // Check if chat server is available first
    const checkChatServer = async () => {
      try {
        const response = await fetch(`${CHAT_HTTP_URL}/health`, { 
          method: 'GET',
          signal: AbortSignal.timeout(3000) // 3 second timeout
        })
        if (response.ok) {
          return true
        }
      } catch (error) {
        setConnecting(false)
        setConnectionError('')
        return false
      }
      return false
    }

    const initWebSocket = async () => {
      const isAvailable = await checkChatServer()
      if (!isAvailable) return

      if (!socketRef.current) {
        const s = io(CHAT_WS_URL, {
          autoConnect: true,
          withCredentials: true,
          timeout: 5000,
          reconnection: false, // Disable reconnection to avoid errors
          transports: ['polling', 'websocket'],
          upgrade: true,
          rememberUpgrade: true
        })
        socketRef.current = s
        
        s.off('connect').on('connect', () => { 
          setConnecting(false)
          setConnectionError("")
          // Join room on successful connect
          const uid = user?.id ? String(user.id) : ''
          if (uid && params.id) {
            s.emit('joinRoom', { chapterId: String(params.id), userId: uid }, (res: any) => {
              if (!res?.ok) {
                console.error('joinRoom denied on connect:', res?.error)
                setConnectionError(res?.error || 'Join denied')
              } else {
                setConnectionError("")
              }
            })
          }
        })
        
        s.off('disconnect').on('disconnect', () => {
          setConnecting(true)
        })
        
        s.off('connect_error').on('connect_error', (error: any) => {
          setConnectionError('')
          setConnecting(false)
        })
        
        // Message handling
        s.off('newMessage').on('newMessage', (msg: ChatMessage) => {
          if (String(msg.chapterId) === String(params.id)) {
            setMessages(prev => {
              const exists = prev.some(m => m.id === msg.id)
              if (exists) return prev
              const optimisticIndex = prev.findIndex(m => 
                m.content === msg.content && 
                m.senderId === msg.senderId && 
                m.id.startsWith('tmp-')
              )
              if (optimisticIndex !== -1) {
                const updated = [...prev]
                updated[optimisticIndex] = msg
                return updated
              }
              return [...prev, msg]
            })
          }
        })
        
        s.off('presence').on('presence', (p: { count: number }) => {
          setOnlineCount(p?.count || 0)
        })
        
        s.off('typing').on('typing', ({ userId }: { userId: string }) => {
          if (String(userId) === String(user?.id)) return
          setTypingUsers(prev => new Set([...prev, String(userId)]))
        })
        
        s.off('stopTyping').on('stopTyping', ({ userId }: { userId: string }) => {
          setTypingUsers(prev => {
            const newSet = new Set(prev)
            newSet.delete(String(userId))
            return newSet
          })
        })
      }
    }

    initWebSocket()

    // Cleanup
    return () => {
      const s = socketRef.current
      if (s) {
        s.off('newMessage')
        s.off('presence')
        s.off('typing')
        s.off('stopTyping')
        s.off('connect')
        s.off('disconnect')
        s.off('connect_error')
      }
    }
  }, [params.id, user?.id, authLoading])

  // Auto-refresh messages in HTTP-only mode
  useEffect(() => {
    if (socketRef.current?.connected) return // Don't auto-refresh if WebSocket is connected
    
    const interval = setInterval(() => {
      // Only refresh if we're not currently loading and have messages
      if (!loadingMore && messages.length > 0) {
        loadMessages()
      }
    }, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [socketRef.current?.connected, loadingMore, messages.length])

  const loadMessages = async () => {
    if (!params.id) return
    try {
      const res = await fetch(`/api/chat/${params.id}/messages?limit=50`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json() as { success: boolean; messages: ChatMessage[]; nextCursor?: string | null }
        if (data.success) {
          setMessages(data.messages || [])
          setNextCursor(data.nextCursor || null)
        }
      }
    } catch (e) {
      console.error('Auto-refresh messages error', e)
    }
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || !user?.id || !params.id) return
    
    // Generate a unique ID for this message
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    
    const msg: ChatMessage = {
      id: tempId,
      chapterId: String(params.id),
      senderId: String(user.id),
      senderName: user.name || 'You',
      senderAvatarUrl: (user as any)?.avatar_url || null,
      content: text,
      timestamp: new Date().toISOString()
    }
    
    setInput("")
    
    // Optimistic update
    setMessages(prev => [...prev, msg])
    // Use app API by default, WebSocket if available
    try {
      if (socketRef.current?.connected) {
        // WebSocket is available, use it for real-time delivery
        socketRef.current!.emit('sendMessage', msg, (ack?: { ok: boolean; message?: ChatMessage; error?: string }) => {
          if (!ack?.ok || !ack.message) {
            console.error('WS send ack error:', ack?.error)
            // Fallback to app API
            sendViaAppAPI()
            return
          }
          setMessages(prev => prev.map(m => (m.id === tempId ? ack.message! : m)))
        })
      } else {
        // WebSocket not available, use app API
        sendViaAppAPI()
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => prev.filter(m => m.id !== tempId))
      toast.error('Failed to send message')
    }

    async function sendViaAppAPI() {
      try {
        const appResponse = await fetch(`/api/chat/${params.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ content: text })
        })
        if (appResponse.ok) {
          const data = await appResponse.json()
          if (data?.success && data?.message) {
            setMessages(prev => prev.map((m: any) => (m.id === tempId ? data.message : m)))
          }
        } else {
          setMessages(prev => prev.filter(m => m.id !== tempId))
          toast.error('Failed to send message')
        }
      } catch (error) {
        console.error('App API send error:', error)
        setMessages(prev => prev.filter(m => m.id !== tempId))
        toast.error('Failed to send message')
      }
    }
  }

  // Typing emit (throttled)
  useEffect(() => {
    if (!socketRef.current) return
    let lastEmit = 0
    let typing = false
    const inputEl = document.getElementById('chapter-chat-input') as HTMLInputElement | null
    if (!inputEl) return
    const onInput = () => {
      const now = Date.now()
      if (!typing) {
        typing = true
        socketRef.current?.emit('typing')
      }
      if (now - lastEmit > 1500) {
        lastEmit = now
        socketRef.current?.emit('typing')
      }
      // Stop typing after idle
      clearTimeout((onInput as any)._t)
      ;(onInput as any)._t = setTimeout(() => {
        typing = false
        socketRef.current?.emit('stopTyping')
      }, 2000)
    }
    inputEl.addEventListener('input', onInput)
    return () => {
      inputEl.removeEventListener('input', onInput)
      clearTimeout((onInput as any)._t)
    }
  }, [socketRef.current, user?.id])

  // Infinite scroll: load older when reaching top
  useEffect(() => {
    const container = document.querySelector('.flex-1.overflow-y-auto.px-4.py-4.space-y-3.bg-muted\\/20') as HTMLDivElement | null
    messagesContainerRef.current = container
    if (!container) return
    const handler = async () => {
      if (container.scrollTop <= 0 && !loadingMore && nextCursor && params.id) {
        setLoadingMore(true)
        const prevHeight = container.scrollHeight
        try {
          const res = await fetch(`/api/chat/${params.id}/messages?limit=50&cursor=${encodeURIComponent(nextCursor)}`, { credentials: 'include' })
          if (res.ok) {
            const data = await res.json() as { success: boolean; messages: ChatMessage[]; nextCursor?: string | null }
            if (data.success && data.messages.length) {
              setMessages(prev => [...data.messages, ...prev])
              setNextCursor(data.nextCursor || null)
              // Maintain scroll position after prepending
              setTimeout(() => {
                const newHeight = container.scrollHeight
                container.scrollTop = newHeight - prevHeight
              }, 0)
            } else if (data.success) {
              setNextCursor(null)
            }
          }
        } catch (e) {
          console.error('Load older messages failed', e)
        } finally {
          setLoadingMore(false)
        }
      }
    }
    container.addEventListener('scroll', handler, { passive: true })
    return () => container.removeEventListener('scroll', handler)
  }, [nextCursor, loadingMore, params.id])

  const appendEmoji = (emoji: string) => {
    setInput((prev) => `${prev}${emoji}`)
  }

  const handleAttachClick = () => {
    // Placeholder behavior: open file picker and send a message with file name
    if (!fileInputRef.current) {
      const inputEl = document.createElement('input')
      inputEl.type = 'file'
      inputEl.accept = '*/*'
      inputEl.style.display = 'none'
      document.body.appendChild(inputEl)
      fileInputRef.current = inputEl
      inputEl.addEventListener('change', () => {
        const file = inputEl.files?.[0]
        if (file && user?.id && params.id) {
          const msgText = `📎 ${file.name}`
          const msg: ChatMessage = {
            id: `tmp-${Date.now()}`,
            chapterId: String(params.id),
            senderId: String(user.id),
            senderName: user.name || 'You',
            senderAvatarUrl: (user as any)?.avatar_url || null,
            content: msgText,
            timestamp: new Date().toISOString()
          }
          setMessages(prev => [...prev, msg])
          try { socketRef.current?.emit('sendMessage', msg) } catch (e) { console.error(e) }
        }
        inputEl.value = ''
      })
    }
    fileInputRef.current?.click()
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 pb-16 sm:pb-20 lg:pb-6">
          <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base">Loading chapter...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 pb-16 sm:pb-20 lg:pb-6">
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground mb-4 text-sm sm:text-base">Please sign in to view this chapter.</p>
            <Button onClick={() => router.push('/product/auth')} className="text-sm sm:text-base">
              Sign In
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!chapterData) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 pb-16 sm:pb-20 lg:pb-6">
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Chapter Not Found</h2>
            <p className="text-muted-foreground mb-4 text-sm sm:text-base">The chapter you're looking for doesn't exist.</p>
            <Button onClick={() => router.push('/product/chapters')} className="text-sm sm:text-base">
              <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              Back to Chapters
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 pb-16 sm:pb-20 lg:pb-6">
        {/* Chapter Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-3 sm:mb-4 space-y-3 sm:space-y-4 lg:space-y-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center mb-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => router.push('/product/chapters')}
                  className="mr-2 flex-shrink-0"
                >
                  <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">{chapterData.name}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:gap-4 text-muted-foreground text-xs sm:text-sm lg:text-base">
                <div className="flex items-center">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                  <span className="truncate">{chapterData.member_count} members</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                  <span className="truncate">{chapterData.location_city}</span>
                </div>
                <Badge variant="secondary" className="text-xs lg:text-sm flex-shrink-0">
                  {chapterData.joined_at}
                </Badge>
              </div>
            </div>
            <Button className="w-full lg:w-auto text-xs sm:text-sm">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Create Post</span>
              <span className="sm:hidden">Post</span>
            </Button>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm lg:text-base">{chapterData.description}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-6">
          {/* Left: Chat Interface (70%) */}
          <div className="flex-1">
            <Card className="h-[400px] sm:h-[calc(100vh-300px)] lg:h-[calc(100vh-280px)] flex flex-col">
              <div className="px-3 sm:px-4 py-2 sm:py-3 border-b flex items-center justify-between">
                <div className="font-semibold text-sm sm:text-base">Chapter Chat</div>
                <div className="text-xs flex items-center gap-1 sm:gap-2">
                  <span className={`${connecting ? 'text-muted-foreground' : 'text-green-600'}`}>
                    {connecting ? 'Connecting...' : (socketRef.current?.connected ? 'Live' : 'HTTP Mode')}
                  </span>
                  {socketRef.current?.connected && (
                    <span className="text-muted-foreground hidden sm:inline">· {onlineCount} online</span>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 space-y-2 sm:space-y-3 bg-muted/20">
                {typingUsers.size > 0 && (
                  <div className="text-xs text-muted-foreground">Someone is typing…</div>
                )}
                {messages.map(m => {
                  const own = String(m.senderId) === String(user?.id || '')
                  return (
                    <div key={m.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] sm:max-w-[80%] flex items-end gap-1.5 sm:gap-2 ${own ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {(m.senderName || 'U').slice(0,2).toUpperCase()}
                        </div>
                        <div className={`rounded-2xl px-2 sm:px-3 py-1.5 sm:py-2 shadow-sm ${own ? 'bg-primary text-primary-foreground' : 'bg-white'}`}>
                          <div className="text-[10px] sm:text-[11px] opacity-80 mb-0.5">{own ? 'You' : m.senderName}</div>
                          <div className="whitespace-pre-wrap break-words text-xs sm:text-sm">{m.content}</div>
                          <div className="flex items-center justify-between mt-1">
                            <div className="text-[9px] sm:text-[10px] opacity-70">{new Date(m.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                            
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="border-t p-2 sm:p-3">
                <div className="flex items-center gap-1.5 sm:gap-2 relative">
                  {/* Emoji button + lightweight picker */}
                  <Button type="button" variant="ghost" size="icon" className="shrink-0 h-8 w-8 sm:h-10 sm:w-10" onClick={() => setShowEmojiPicker(v => !v)}>
                    <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-12 left-0 z-20 bg-white border rounded-lg shadow-md p-2 w-48 sm:w-56 grid grid-cols-8 gap-1">
                      {['😀','😁','😂','🤣','😊','😍','😎','😇','😉','🙃','🤔','🤩','😢','😭','😡','👍','🙏','👏','🎉','🔥','💡','✨','✅','❌','❤️','💪','🤝','🚀','🌟','📎','📣'].map(e => (
                        <button key={e} className="text-lg sm:text-xl hover:scale-110 transition" onClick={() => { appendEmoji(e); setShowEmojiPicker(false) }} aria-label={`emoji ${e}`}>
                          {e}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Attachment button (placeholder send filename) */}
                  <Button type="button" variant="ghost" size="icon" className="shrink-0 h-8 w-8 sm:h-10 sm:w-10" onClick={handleAttachClick}>
                    <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                <Input
                  id="chapter-chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 text-sm sm:text-base"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                />
                  <Button type="button" onClick={sendMessage} disabled={!input.trim()} className="shrink-0 h-8 px-2 sm:h-10 sm:px-3 text-xs sm:text-sm">
                    <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Send</span>
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Sidebar - Stack below main content on mobile */}
          <div className="w-full lg:w-80 space-y-3 sm:space-y-4 lg:space-y-6 mt-2 lg:mt-0">
            {/* Chapter Members */}
            <Card className="p-3 sm:p-4 lg:p-6">
              <h3 className="font-semibold mb-3 sm:mb-4 flex items-center text-xs sm:text-sm lg:text-base">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-2 flex-shrink-0" />
                <span className="truncate">Chapter Members</span>
                {membersLoading && <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 ml-2 animate-spin flex-shrink-0" />}
              </h3>
              <div className="space-y-2 sm:space-y-3 max-h-48 sm:max-h-64 overflow-y-auto">
                {chapterMembers.length === 0 ? (
                  <p className="text-xs sm:text-sm text-muted-foreground">No members found.</p>
                ) : (
                  chapterMembers.map((member) => (
                    <div key={member.id} className="flex items-center space-x-2 sm:space-x-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-muted rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {member.profile_photo_url ? (
                          <img 
                            src={member.profile_photo_url} 
                            alt={member.name}
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover"
                          />
                        ) : (
                          member.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                      {/* Action buttons - only show if not current user */}
                      {user && user.id !== member.id && (
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          {/* Follow/Unfollow button */}
                          {followStatus[member.id] === 'following' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs px-1.5 sm:px-2 py-1 h-6 sm:h-7"
                              onClick={() => handleUnfollow(member.id, member.name)}
                              disabled={followLoading[member.id]}
                            >
                              {followLoading[member.id] ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <span className="hidden sm:inline">Following</span>
                                  <span className="sm:hidden">✓</span>
                                </>
                              )}
                            </Button>
                          ) : followStatus[member.id] === 'pending' ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs px-1.5 sm:px-2 py-1 h-6 sm:h-7"
                              disabled={true}
                            >
                              <>
                                <span className="hidden sm:inline">Pending</span>
                                <span className="sm:hidden">⏳</span>
                              </>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="default"
                              className="text-xs px-1.5 sm:px-2 py-1 h-6 sm:h-7"
                              onClick={() => handleFollow(member.id, member.name)}
                              disabled={followLoading[member.id]}
                            >
                              {followLoading[member.id] ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <UserPlus className="w-3 h-3 mr-1" />
                                  <span className="hidden sm:inline">Follow</span>
                                </>
                              )}
                            </Button>
                          )}
                          
                          {/* Create Secret Group button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs px-1.5 sm:px-2 py-1 h-6 sm:h-7"
                            onClick={() => handleCreateSecretGroup(member.id, member.name)}
                          >
                            <Lock className="w-3 h-3 mr-1" />
                            <span className="hidden sm:inline">Secret Group</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Upcoming Events */}
            <Card className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                <div className="flex flex-col min-w-0 flex-1">
                  <h3 className="font-semibold flex items-center text-xs sm:text-sm lg:text-base">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-2 flex-shrink-0" />
                    <span className="truncate">Upcoming Events</span>
                    {eventsLoading && <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 ml-2 animate-spin flex-shrink-0" />}
                  </h3>
                  {lastEventsUpdate && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      Last updated: {lastEventsUpdate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshEvents}
                  disabled={eventsLoading}
                  className="text-xs p-1 flex-shrink-0"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </Button>
              </div>
              <div className="space-y-2 sm:space-y-3 lg:space-y-4">
                {eventsLoading ? (
                  <div className="text-center py-4">
                    <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin mx-auto mb-2" />
                    <p className="text-xs sm:text-sm text-muted-foreground">Loading events...</p>
                  </div>
                ) : upcomingEvents.length === 0 ? (
                  <div className="text-center py-4">
                    <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs sm:text-sm text-muted-foreground">No upcoming events found.</p>
                    <p className="text-xs text-muted-foreground mt-1">Check back later for new events!</p>
                  </div>
                ) : (
                  upcomingEvents.map((event) => (
                    <div key={event.id} className="border-l-2 border-primary/20 pl-2 sm:pl-3 lg:pl-4 pb-2 sm:pb-3 border-b border-muted/30 last:border-b-0">
                      <div className="space-y-1.5 sm:space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-xs sm:text-sm lg:text-base pr-2 truncate min-w-0 flex-1">{event.title}</h4>
                          {event.is_registered && (
                            <Badge variant="secondary" className="text-xs flex-shrink-0">
                              Registered
                            </Badge>
                          )}
                        </div>
                        
                        {event.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {event.description}
                          </p>
                        )}
                        
                        <div className="flex flex-col space-y-1">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground gap-1 sm:gap-0">
                            <span className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{event.date} • {event.time}</span>
                            </span>
                            <span className="flex items-center">
                              <Users className="w-3 h-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{event.attendees} attending</span>
                            </span>
                          </div>
                          
                          {event.venue_address && event.event_type === 'physical' && (
                            <div className="flex items-start text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2">{event.venue_address}</span>
                            </div>
                          )}
                          
                          {event.event_type === 'online' && (
                            <span className="text-xs text-blue-600 font-medium">
                              Online Event
                            </span>
                          )}
                          
                          {event.event_type === 'physical' && (
                            <span className="text-xs text-green-600 font-medium">
                              Physical Event
                            </span>
                          )}
                        </div>
                        
                        {user && !event.is_registered && (
                          <Button
                            size="sm"
                            className="text-xs h-6 sm:h-7 mt-2 w-full"
                            onClick={() => handleEventRSVP(event.id, event.title)}
                          >
                            RSVP Now
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-3 sm:mt-4">
                <Button 
                  variant="outline" 
                  className="flex-1 bg-transparent text-xs sm:text-sm lg:text-base"
                  onClick={() => router.push('/events')}
                >
                  View All Events
                </Button>
                {upcomingEvents.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefreshEvents}
                    disabled={eventsLoading}
                    className="px-2 text-xs sm:text-sm"
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </Button>
                )}
              </div>
            </Card>

            {/* Top Contributors */}
            <Card className="p-3 sm:p-4 lg:p-6">
              <h3 className="font-semibold mb-3 sm:mb-4 flex items-center text-xs sm:text-sm lg:text-base">
                <Trophy className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-2 flex-shrink-0" />
                <span className="truncate">Top Contributors</span>
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {topContributors.map((contributor, index) => (
                  <div key={index} className="flex items-center space-x-2 sm:space-x-3">
                    <Badge variant="outline" className="w-5 h-5 sm:w-6 sm:h-6 p-0 flex items-center justify-center text-xs flex-shrink-0">
                      {index + 1}
                    </Badge>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-muted rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {contributor.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate">{contributor.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{contributor.role}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      {contributor.score}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}