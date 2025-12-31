"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DisplayPostCard } from "@/components/PostCard"
import { Lock, Users, Crown, Plus, Hash, Settings, Calendar, MapPin, RefreshCw, Search, X } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import React from "react"

type GroupItem = {
  id: string
  name: string
  members: number
  unread: number
  pattern: string
}

// Default placeholders
const userGroupsDefault: GroupItem[] = [
  {
    id: "ai-ml",
    name: "AI/ML Enthusiasts",
    members: 89,
    unread: 3,
    pattern:
      "data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fillOpacity='0.1'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z'/%3E%3C/g%3E%3C/svg%3E",
  },
  {
    id: "startup-founders",
    name: "Startup Founders",
    members: 156,
    unread: 0,
    pattern:
      "data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fillOpacity='0.1'%3E%3Cpath d='M0 0h20v20H0V0zm20 20h20v20H20V20z'/%3E%3C/g%3E%3C/svg%3E",
  },
  {
    id: "women-tech",
    name: "Women in Tech",
    members: 234,
    unread: 1,
    pattern:
      "data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fillOpacity='0.1'%3E%3Cpath d='M20 0l20 20-20 20L0 20z'/%3E%3C/g%3E%3C/svg%3E",
  },
  {
    id: "dl-research",
    name: "Deep Learning Research",
    members: 67,
    unread: 0,
    pattern:
      "data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fillOpacity='0.1'%3E%3Ccircle cx='10' cy='10' r='8'/%3E%3Ccircle cx='30' cy='30' r='8'/%3E%3C/g%3E%3C/svg%3E",
  },
  {
    id: "nlp-community",
    name: "NLP Community",
    members: 98,
    unread: 2,
    pattern:
      "data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fillOpacity='0.1'%3E%3Crect x='5' y='5' width='12' height='12'/%3E%3Crect x='23' y='23' width='12' height='12'/%3E%3C/g%3E%3C/svg%3E",
  },
]

const activeGroupData = {
  id: "ai-ml",
  name: "AI/ML Enthusiasts",
  description: "Discussing the latest in artificial intelligence and machine learning",
  members: 89,
  admins: ["Sarah Chen", "Michael Rodriguez"],
}
const groupPosts = [
  {
    author: {
      name: "David Kim",
      role: "ML Engineer",
      avatar: "DK",
      rewardScore: 91,
    },
    content:
      "Just published a paper on transformer architectures for time series forecasting. The results are promising - 15% improvement over traditional LSTM approaches. Would love to get feedback from the community!",
    timestamp: "2h ago",
    engagement: {
      likes: 28,
      comments: 12,
      shares: 5,
    },
  },
  {
    author: {
      name: "Lisa Zhang",
      role: "Data Scientist",
      avatar: "LZ",
      rewardScore: 87,
    },
    content:
      "Question for the group: What's your preferred approach for handling imbalanced datasets in production? I've been experimenting with SMOTE vs focal loss and curious about your experiences.",
    timestamp: "5h ago",
    engagement: {
      likes: 19,
      comments: 8,
      shares: 2,
    },
  },
]

export default function GroupsPage() {
  const [activeGroup, setActiveGroup] = useState("ai-ml")
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const { user } = useAuth()

  // Left: user’s joined groups
  const [joinedGroups, setJoinedGroups] = React.useState<GroupItem[]>([])
  // Suggested: all groups minus joined
  const [suggestedGroups, setSuggestedGroups] = React.useState<GroupItem[]>([])

  // Create group modal state
  const [showCreateGroup, setShowCreateGroup] = React.useState(false)
  const [newGroupName, setNewGroupName] = React.useState("")
  const [inviteEmails, setInviteEmails] = React.useState("")
  const [searchConnection, setSearchConnection] = React.useState("")
  const [selectedConnections, setSelectedConnections] = React.useState<string[]>([])
  const userConnections = React.useMemo(() => [
    { id: "1", name: "Alice Johnson" },
    { id: "2", name: "Mark Thompson" },
    { id: "3", name: "Ravi Sharma" },
    { id: "4", name: "Sophia Lee" },
    { id: "5", name: "Daniel Martinez" },
  ], [])

  const currentGroup = joinedGroups.find((g) => g.id === activeGroup) || joinedGroups[0] || userGroupsDefault[0]

  const mapRow = (row: { id: string | number; name: string; member_count?: number | string }): GroupItem => ({
    id: String(row.id),
    name: row.name,
    members: Number(row.member_count || 0),
    unread: 0,
    pattern: "data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fillOpacity='0.06'%3E%3Crect x='0' y='0' width='20' height='20'/%3E%3C/g%3E%3C/svg%3E",
  })

  // Add Members modal state (top-level)
  type SimpleUser = { id: number; name: string; email: string }
  const [showAddMembers, setShowAddMembers] = React.useState(false)
  const [targetGroupId, setTargetGroupId] = React.useState<string | null>(null)
  const [targetGroupName, setTargetGroupName] = React.useState<string>("")
  const [allUsers, setAllUsers] = React.useState<SimpleUser[]>([])
  const [usersLoading, setUsersLoading] = React.useState(false)
  const [inviteSearch, setInviteSearch] = React.useState("")
  const [invitedEmails, setInvitedEmails] = React.useState<Set<string>>(new Set())
  const [currentMemberIds, setCurrentMemberIds] = React.useState<Set<number>>(new Set())

  const openAddMembers = (group: { id: string; name: string }) => {
    setTargetGroupId(group.id)
    setTargetGroupName(group.name)
    setInviteSearch("")
    setInvitedEmails(new Set())
    setShowAddMembers(true)
  }

  React.useEffect(() => {
    if (!showAddMembers) return
    ;(async () => {
      try {
        setUsersLoading(true)
        // Load all possible connections
        const res = await fetch('/api/members', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          const members: SimpleUser[] = Array.isArray(data?.members)
            ? (data.members as any[]).map((m) => ({ id: Number(m.id), name: String(m.name || ''), email: String(m.email || '') }))
            : []
          setAllUsers(members)
        } else {
          setAllUsers([])
        }

        // Load current members of the target group to mark as Added
        if (targetGroupId) {
          try {
            const res2 = await fetch(`/api/admin/management/secret-groups/${encodeURIComponent(targetGroupId)}/members`, { credentials: 'include' })
            if (res2.ok) {
              const data2 = await res2.json()
              const ids = new Set<number>(
                Array.isArray(data2?.members) ? data2.members.map((u: any) => Number(u.id)) : []
              )
              setCurrentMemberIds(ids)
            } else {
              setCurrentMemberIds(new Set())
            }
          } catch {
            setCurrentMemberIds(new Set())
          }
        } else {
          setCurrentMemberIds(new Set())
        }
      } finally {
        setUsersLoading(false)
      }
    })()
  }, [showAddMembers, targetGroupId])

  const filteredUsers = React.useMemo(() => {
    const q = inviteSearch.trim().toLowerCase()
    if (!q) return allUsers
    return allUsers.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }, [allUsers, inviteSearch])

  const inviteUserToGroup = async (email: string) => {
    if (!targetGroupId) return
    try {
      await fetch(`/api/groups/${encodeURIComponent(targetGroupId)}/invite`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: [email] })
      })
      setInvitedEmails(prev => new Set(prev).add(email))
    } catch {
      // keep UI responsive
    }
  }

  const loadData = React.useCallback(async () => {
    try {
      // All groups (for suggestions)
      const allRes = await fetch('/api/admin/management/secret-groups', { credentials: 'include' })
      const allData = allRes.ok ? await allRes.json() : { groups: [] }
      const all = Array.isArray(allData.groups) ? allData.groups.map(mapRow) : []

      // Joined groups for user
      let joined: GroupItem[] = []
      if (user?.id) {
        const myRes = await fetch(`/api/users/${user.id}/secret-groups`, { credentials: 'include' })
        const myData = myRes.ok ? await myRes.json() : { groups: [] }
        joined = Array.isArray(myData.groups) ? myData.groups.map(mapRow) : []
      }

      const joinedIds = new Set(joined.map((g: GroupItem) => g.id))
      const suggested = all.filter((g: GroupItem) => !joinedIds.has(g.id))

      setJoinedGroups(joined.length ? joined : [])
      setSuggestedGroups(suggested)
      if (joined.length) setActiveGroup(joined[0].id)
    } catch {}
  }, [user?.id])

  React.useEffect(() => { loadData() }, [loadData])

  const handleJoin = async (groupId: string) => {
    try {
      const res = await fetch(`/api/secret-groups/${encodeURIComponent(groupId)}/membership`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        await loadData()
      }
    } catch {}
  }

  const toggleConnection = (id: string) => {
    setSelectedConnections(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const filteredConnections = React.useMemo(() => userConnections.filter(c => c.name.toLowerCase().includes(searchConnection.toLowerCase())), [userConnections, searchConnection])

  const handleCreateGroup = async () => {
    const name = newGroupName.trim()
    if (!name) return
    try {
      const createRes = await fetch('/api/groups', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: null })
      })
      if (!createRes.ok) return
      const data = await createRes.json()
      const groupId = data?.group?.id
      const emails = inviteEmails.split(',').map(e => e.trim()).filter(Boolean)
      if (groupId && emails.length) {
        await fetch(`/api/groups/${encodeURIComponent(groupId)}/invite`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emails })
        })
      }
      setShowCreateGroup(false)
      setNewGroupName("")
      setInviteEmails("")
      setSelectedConnections([])
      await loadData()
    } catch {}
  }

  // Events state for secret groups page
  const [events, setEvents] = useState<Array<any>>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [lastEventsUpdate, setLastEventsUpdate] = useState<Date | null>(null)

  const fetchUpcomingEvents = async (forceRefresh = false) => {
    if (eventsLoading && !forceRefresh) return
    setEventsLoading(true)
    try {
      const url = user?.id ? `/api/events?userId=${user.id}&limit=6` : `/api/events?limit=6`
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

  const handleRefreshEvents = () => fetchUpcomingEvents(true)

  // initial load
  React.useEffect(() => {
    fetchUpcomingEvents()
  }, [user?.id])

  // periodic refresh
  React.useEffect(() => {
    const interval = setInterval(() => fetchUpcomingEvents(false), 120000)
    return () => clearInterval(interval)
  }, [])

  // focus refresh
  React.useEffect(() => {
    const handler = () => { if (!document.hidden) fetchUpcomingEvents(false) }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6 pb-20 lg:pb-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Left Sidebar - Groups List (joined only) */}
          <div className="w-full lg:w-1/2">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold">Secret Groups</h2>
              <Button size="sm" onClick={() => setShowCreateGroup(true)}>+ Create Group</Button>
            </div>
            <div className="p-0 mt-10">
              <div className="grid grid-cols-1 md:grid-cols-1 gap-3 lg:gap-4">
                {(joinedGroups.length ? joinedGroups : []).slice(0, 3).map((group) => (
                  <div
                    key={group.id}
                    className={`w-full h-28 md:h-32 border rounded-xl bg-white flex items-center justify-between px-5 transition-colors hover:bg-accent/30`}
                  >
                    <div
                      className="flex items-center gap-4 cursor-pointer flex-1"
                      onClick={() => { window.location.href = `/product/groups/${encodeURIComponent(group.id)}` }}
                    >
                      <div
                        className="w-12 h-12 lg:w-14 lg:h-14 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundImage: `url("${group.pattern}")` }}
                      >
                        <Lock className="w-6 h-6 lg:w-7 lg:h-7" />
                      </div>
                      <div className="text-left">
                        <p className="text-2xl lg:text-3xl font-semibold leading-tight">{group.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">{group.members} members</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 text-xs bg-transparent ml-4 whitespace-nowrap"
                      onClick={(e) => { e.stopPropagation(); openAddMembers({ id: group.id, name: group.name }) }}
                    >
                      + Add Member
                    </Button>
                  </div>
                ))}
                {joinedGroups.length === 0 && (
                  <Card className="p-6 text-center text-sm text-muted-foreground">No groups joined yet. Use Suggested Groups to join.</Card>
                )}
              </div>
            </div>
          </div>

          {/* Middle content removed to keep page in two parts only */}

          {/* Right Sidebar */}
          <div className="w-full lg:w-1/2 space-y-4 lg:space-y-6">
            {/* Upcoming Events (dynamic) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="flex items-center gap-2 text-sm lg:text-base font-semibold">
                    <Calendar className="w-4 h-4" /> Upcoming Events
                  </h3>
                  {lastEventsUpdate && (
                    <p className="text-xs text-muted-foreground mt-1">Last updated: {lastEventsUpdate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={handleRefreshEvents} disabled={eventsLoading} className="text-xs px-2">
                  <RefreshCw className={`w-4 h-4 ${eventsLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <div className="space-y-3">
                {eventsLoading ? (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading events...</p>
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center py-6">
                    <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No upcoming events found.</p>
                  </div>
                ) : (
                  events.map((ev) => (
                    <Card key={ev.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">{ev.title}</p>
                          <p className="text-xs text-muted-foreground">{ev.dateText} • {ev.timeText}</p>
                          {ev.venue_address && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {ev.venue_address}</p>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground text-right">
                          <p>{ev.attendees} attending</p>
                          {ev.is_registered && (
                            <Badge variant="secondary" className="mt-1">Registered</Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
              {events.length > 0 && (
                <Button variant="outline" className="w-full mt-4 bg-transparent text-sm" onClick={() => window.location.href = '/events'}>
                  View All Events
                </Button>
              )}
            </div>

            {/* Group Admins */}
            <Card className="p-4 lg:p-6">
              <h3 className="font-semibold mb-4 flex items-center text-sm lg:text-base">
                <Crown className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                Group Admins
              </h3>
              <div className="space-y-3">
                {activeGroupData.admins.map((admin, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs font-semibold">
                      {admin
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{admin}</p>
                      <p className="text-xs text-muted-foreground">Admin</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Suggested Groups (from admin) */}
            <Card className="p-4 lg:p-6">
              <h3 className="font-semibold mb-4 text-sm lg:text-base">Suggested Groups</h3>
              <div className="space-y-4">
                {suggestedGroups.map((group) => (
                  <div key={group.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{group.name}</h4>
                      <Button size="sm" variant="outline" className="h-6 px-2 text-xs bg-transparent" onClick={() => handleJoin(group.id)}>
                        Join
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{group.members} members</p>
                  </div>
                ))}
                {suggestedGroups.length === 0 && (
                  <p className="text-xs text-muted-foreground">No suggestions available.</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="p-6 w-full max-w-md relative">
            <X className="w-5 h-5 absolute top-4 right-4 cursor-pointer" onClick={() => setShowCreateGroup(false)} />
            <h2 className="text-xl font-bold mb-4">Create Secret Group</h2>
            <div className="flex flex-col space-y-4">
              <div>
                <label className="text-sm font-medium">Group Name *</label>
                <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="border p-2 rounded w-full" placeholder="Enter group name" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Invite Connections</label>
                <div className="flex items-center border rounded mb-2 p-2">
                  <Search className="w-4 h-4 text-muted-foreground mr-2" />
                  <input type="text" placeholder="Search connections..." value={searchConnection} onChange={(e) => setSearchConnection(e.target.value)} className="flex-1 outline-none" />
                </div>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {filteredConnections.map(conn => (
                    <div key={conn.id} className="flex items-center space-x-2">
                      <input type="checkbox" checked={selectedConnections.includes(conn.id)} onChange={() => toggleConnection(conn.id)} />
                      <span className="text-sm">{conn.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Invite by Email</label>
                <textarea value={inviteEmails} onChange={(e) => setInviteEmails(e.target.value)} className="border p-2 rounded w-full" placeholder="Enter email addresses separated by commas" />
              </div>
              <Button onClick={handleCreateGroup} className="mt-2">Create Group</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Add Members Modal */}
      {showAddMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="p-6 w-full max-w-md relative">
            <X className="w-5 h-5 absolute top-4 right-4 cursor-pointer" onClick={() => setShowAddMembers(false)} />
            <h2 className="text-xl font-bold mb-4">Add Members{targetGroupName ? ` to ${targetGroupName}` : ''}</h2>
            <div className="flex flex-col space-y-3">
              <label className="text-sm font-medium">Search Connections</label>
              <input
                type="text"
                value={inviteSearch}
                onChange={(e) => setInviteSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="border p-2 rounded w-full"
              />
              <div className="border rounded p-2 h-64 overflow-y-auto space-y-2">
                {usersLoading ? (
                  <div className="text-sm text-muted-foreground">Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No users found.</div>
                ) : (
                  filteredUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-2 rounded hover:bg-accent/40">
                      <div>
                        <p className="text-sm font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      <Button
                        size="sm"
                        className="h-7 px-3 text-xs"
                        disabled={invitedEmails.has(u.email) || currentMemberIds.has(u.id)}
                        onClick={() => inviteUserToGroup(u.email)}
                      >
                        {currentMemberIds.has(u.id) || invitedEmails.has(u.email) ? 'Added' : '+ Add'}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}


