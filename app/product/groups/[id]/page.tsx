"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Calendar, Trophy, MapPin, Plus, Loader2, ArrowLeft, Smile, Paperclip, Send, Lock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { io, Socket } from "socket.io-client"

interface GroupMessage {
  id: string
  groupId: string
  senderId: string
  senderName: string
  senderAvatarUrl: string | null
  content: string
  timestamp: string
}

export default function GroupDetailsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [group, setGroup] = useState<{ id: string; name: string; description?: string; member_count: number } | null>(null)
  const [members, setMembers] = useState<Array<{ id: number; name: string; email: string }>>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [allUsers, setAllUsers] = useState<Array<{ id: number; name: string; email: string }>>([])
  const [allLoading, setAllLoading] = useState(false)

  // Events state
  const [events, setEvents] = useState<Array<any>>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [lastEventsUpdate, setLastEventsUpdate] = useState<Date | null>(null)

  // Chat state
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatCursor, setChatCursor] = useState<string | null>(null)
  const [newText, setNewText] = useState("")
  const listRef = useRef<HTMLDivElement | null>(null)

  // Optional WebSocket
  const GROUP_CHAT_HTTP_URL = process.env.NEXT_PUBLIC_CHAT_SOCKET_URL || 'http://localhost:4000'
  const GROUP_CHAT_WS_URL = GROUP_CHAT_HTTP_URL.replace(/^http/, 'ws')
  const socketRef = (globalThis as any).__groupSocketRef as { current: Socket | null } || { current: null }
  ;(globalThis as any).__groupSocketRef = socketRef
  const [connecting, setConnecting] = useState(true)

  // Load group meta and members
  useEffect(() => {
    if (!params?.id) return
    ;(async () => {
      try {
        const metaRes = await fetch('/api/admin/management/secret-groups', { credentials: 'include' })
        if (metaRes.ok) {
          const data = await metaRes.json()
          const found = (data?.groups || []).find((g: any) => String(g.id) === String(params.id))
          if (found) setGroup({ id: String(found.id), name: found.name, description: found.description, member_count: Number(found.member_count || 0) })
        }
      } catch {}
      try {
        setMembersLoading(true)
        const memRes = await fetch(`/api/admin/management/secret-groups/${params.id}/members`, { credentials: 'include' })
        if (memRes.ok) {
          const data = await memRes.json()
          setMembers(Array.isArray(data.members) ? data.members : [])
        }
      } finally { setMembersLoading(false) }
    })()
  }, [params?.id])

  // Load messages
  useEffect(() => {
    if (!params?.id || !user?.id) return
    ;(async () => {
      try {
        setChatLoading(true)
        const res = await fetch(`/api/secret-groups/${params.id}/messages?limit=50`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setMessages(Array.isArray(data.messages) ? data.messages : [])
          setChatCursor(data?.nextCursor || null)
          // scroll to bottom
          setTimeout(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }) }, 0)
        } else {
          setMessages([])
          setChatCursor(null)
        }
      } finally {
        setChatLoading(false)
      }
    })()
  }, [params?.id, user?.id])

  // Connect websocket (optional)
  useEffect(() => {
    if (!params?.id || !user?.id) return

    const init = async () => {
      try {
        const health = await fetch(`${GROUP_CHAT_HTTP_URL}/health`, { method: 'GET', signal: AbortSignal.timeout(3000) })
        if (!health.ok) { setConnecting(false); return }
      } catch { setConnecting(false); return }

      if (!socketRef.current) {
        const s = io(GROUP_CHAT_WS_URL, { autoConnect: true, withCredentials: true, timeout: 5000, reconnection: false, transports: ['polling','websocket'], upgrade: true, rememberUpgrade: true })
        socketRef.current = s
        s.off('connect').on('connect', () => {
          setConnecting(false)
          s.emit('group:join', { groupId: String(params.id), userId: String(user.id) }, (ack?: { ok: boolean; error?: string }) => {
            if (!ack?.ok) { console.error('group join failed', ack?.error) }
          })
        })
        s.off('group:newMessage').on('group:newMessage', (msg: GroupMessage) => {
          if (String(msg.groupId) === String(params.id)) {
            setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
          }
        })
        s.off('disconnect').on('disconnect', () => setConnecting(true))
        s.off('connect_error').on('connect_error', () => { setConnecting(false) })
      }
    }
    init()

    return () => {
      const s = socketRef.current
      if (s) {
        s.off('group:newMessage')
        s.off('connect')
        s.off('disconnect')
        s.off('connect_error')
      }
    }
  }, [params?.id, user?.id])

  const handleSend = async () => {
    const text = newText.trim()
    if (!text || !params?.id) return
    setNewText("")

    // optimistic add
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
    const optimistic: GroupMessage = {
      id: tempId,
      groupId: String(params.id),
      senderId: String(user?.id || ''),
      senderName: user?.name || 'You',
      senderAvatarUrl: null,
      content: text,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    const sendViaAPI = async () => {
      try {
        const res = await fetch(`/api/secret-groups/${params.id}/messages`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ content: text })
        })
        if (res.ok) {
          const data = await res.json()
          const saved: GroupMessage | undefined = data?.message
          if (saved) setMessages(prev => prev.map(m => m.id === tempId ? saved : m))
        } else {
          setMessages(prev => prev.filter(m => m.id !== tempId))
          toast.error('Failed to send message')
        }
      } catch {
        setMessages(prev => prev.filter(m => m.id !== tempId))
        toast.error('Failed to send message')
      }
    }

    try {
      const s = socketRef.current
      if (s?.connected) {
        s.emit('group:send', { id: tempId, groupId: String(params.id), senderId: String(user?.id || ''), content: text }, (ack?: { ok: boolean }) => {
          if (!ack?.ok) sendViaAPI()
        })
      } else {
        await sendViaAPI()
      }
    } catch {
      await sendViaAPI()
    }
  }

  // Load all users when add card opens
  useEffect(() => {
    if (!addOpen) return
    ;(async () => {
      try {
        setAllLoading(true)
        const res = await fetch('/api/users', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setAllUsers(Array.isArray(data.users) ? data.users : [])
        }
      } finally { setAllLoading(false) }
    })()
  }, [addOpen])

  // Fetch upcoming events
  const fetchUpcomingEvents = async (forceRefresh = false) => {
    if (eventsLoading && !forceRefresh) return
    setEventsLoading(true)
    try {
      const url = user?.id ? `/api/events?userId=${user.id}&limit=3` : `/api/events?limit=3`
      const res = await fetch(url, {
        credentials: 'include',
        headers: { 'Cache-Control': forceRefresh ? 'no-cache' : 'default' }
      })
      if (!res.ok) {
        setEvents([])
      } else {
        const data = await res.json()
        const now = new Date()
        const upcoming = (data || [])
          .filter((e: any) => {
            if (!e?.date) return false
            const d = new Date(e.date)
            return d >= now && e.status === 'approved'
          })
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 3)
          .map((e: any) => {
            const d = new Date(e.date)
            return {
              id: e.id,
              title: e.title,
              dateText: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              timeText: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
              attendees: Number(e.rsvp_count || 0) || 0,
              event_type: e.event_type,
              venue_address: e.venue_address,
              is_registered: Boolean(e.is_registered)
            }
          })
        setEvents(upcoming)
        setLastEventsUpdate(new Date())
      }
    } finally {
      setEventsLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchUpcomingEvents()
  }, [user?.id])

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(() => fetchUpcomingEvents(false), 120000)
    return () => clearInterval(interval)
  }, [])

  // Focus refresh
  useEffect(() => {
    const handler = () => { if (!document.hidden) fetchUpcomingEvents(false) }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 pb-16 sm:pb-20 lg:pb-6">
          <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base">Loading...</p>
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
            <p className="text-muted-foreground mb-4 text-sm sm:text-base">Please sign in to view this group.</p>
            <Button onClick={() => router.push('/product/auth')} className="text-sm sm:text-base">Sign In</Button>
          </div>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 pb-16 sm:pb-20 lg:pb-6">
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Group Not Found</h2>
            <Button onClick={() => router.push('/groups')} className="text-sm sm:text-base">Back to Groups</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 pb-16 sm:pb-20 lg:pb-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 space-y-3 sm:space-y-0">
            <div className="flex items-center min-w-0">
              <Button variant="ghost" size="sm" onClick={() => router.push('/product/groups')} className="mr-2 flex-shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">{group.name}</h1>
            </div>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm lg:text-base">{group.description || 'A private secret group'}</p>
          <p className="text-xs text-muted-foreground mt-1">A space for members to collaborate, share updates, and grow together.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
          {/* Chat */}
          <div className="flex-1">
            <Card className="h-[400px] sm:h-[calc(100vh-300px)] lg:h-[calc(100vh-280px)] flex flex-col">
              <div className="px-3 sm:px-4 py-2 sm:py-3 border-b flex items-center justify-between">
                <div className="font-semibold text-sm sm:text-base">Group Chat</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3 flex-shrink-0" /> 
                  <span className="hidden sm:inline">Private</span>
                </div>
              </div>
              <div ref={listRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 space-y-2 sm:space-y-3 bg-muted/20">
                {chatLoading ? (
                  <div className="text-xs text-muted-foreground">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No messages yet.</div>
                ) : (
                  messages.map(m => {
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
                  })
                )}
              </div>
              <div className="border-t p-2 sm:p-3">
                <div className="flex items-center gap-1.5 sm:gap-2 relative">
                  <Button type="button" variant="ghost" size="icon" className="shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                    <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                    <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                  <Input 
                    id="group-chat-input" 
                    value={newText} 
                    onChange={(e) => setNewText(e.target.value)} 
                    placeholder="Type your message..." 
                    className="flex-1 text-sm sm:text-base" 
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }} 
                  />
                  <Button type="button" className="shrink-0 h-8 px-2 sm:h-10 sm:px-3 text-xs sm:text-sm" onClick={handleSend}>
                    <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Send</span>
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="w-full lg:w-80 space-y-3 sm:space-y-4 lg:space-y-6 mt-2 lg:mt-0">
            <Card className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="font-semibold flex items-center text-xs sm:text-sm lg:text-base">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-2 flex-shrink-0" />
                  <span className="truncate">Group Members</span>
                  {membersLoading && <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 ml-2 animate-spin flex-shrink-0" />}
                </h3>
                <Button size="sm" variant="outline" className="h-6 sm:h-7 px-2 text-xs bg-transparent flex-shrink-0" onClick={() => setAddOpen(v => !v)}>+ Add</Button>
              </div>
              <div className="space-y-2 sm:space-y-3 max-h-48 sm:max-h-64 overflow-y-auto">
                {members.length === 0 ? (
                  <p className="text-xs sm:text-sm text-muted-foreground">No members found.</p>
                ) : (
                  members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium truncate">{m.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {addOpen && (
              <Card className="p-3 sm:p-4 lg:p-6">
                <h3 className="font-semibold mb-3 text-xs sm:text-sm lg:text-base">Add Members</h3>
                <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
                  {allLoading ? (
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin inline-block mr-2" /> 
                      Loading users...
                    </div>
                  ) : allUsers.length === 0 ? (
                    <div className="text-xs sm:text-sm text-muted-foreground">No users found.</div>
                  ) : (
                    allUsers.map(u => (
                      <div key={u.id} className="flex items-center justify-between border rounded p-2 gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-medium truncate">{u.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                        </div>
                        <Button size="sm" className="h-6 sm:h-7 px-2 text-xs flex-shrink-0">Send Request</Button>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            )}

            <Card className="p-3 sm:p-4 lg:p-6">
              <h3 className="font-semibold mb-3 sm:mb-4 flex items-center text-xs sm:text-sm lg:text-base">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-2 flex-shrink-0" />
                Upcoming Events
              </h3>
              <div className="space-y-3">
                {eventsLoading ? (
                  <div className="text-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Loading events...</p>
                  </div>
                ) : events.length === 0 ? (
                  <p className="text-xs sm:text-sm text-muted-foreground">No upcoming events found.</p>
                ) : (
                  events.map((ev) => (
                    <Card key={ev.id} className="p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base truncate">{ev.title}</p>
                          <p className="text-xs text-muted-foreground">{ev.dateText} • {ev.timeText}</p>
                          {ev.venue_address && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3 flex-shrink-0" /> 
                              <span className="truncate">{ev.venue_address}</span>
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground text-right flex-shrink-0">
                          <p>{ev.attendees} attending</p>
                          {ev.is_registered && (
                            <Badge variant="secondary" className="mt-1 text-xs">Registered</Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
              {events.length > 0 && (
                <Button variant="outline" className="w-full mt-3 sm:mt-4 bg-transparent text-xs sm:text-sm" onClick={() => router.push('/product/events')}>
                  View All Events
                </Button>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
