"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Lock, Users, Crown, Plus, Calendar, MapPin, RefreshCw, Search, X } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import toast from "react-hot-toast"
import React from "react"

type GroupItem = {
  id: string
  name: string
  members: number
  unread: number
  pattern: string
  admin_name?: string
}

export default function ProductGroupsPage() {
  const [activeGroup, setActiveGroup] = useState("")
  const { user } = useAuth()

  // Left: user's joined groups
  const [joinedGroups, setJoinedGroups] = React.useState<GroupItem[]>([])
  // Suggested: all groups minus joined
  const [suggestedGroups, setSuggestedGroups] = React.useState<GroupItem[]>([])

  // Create group modal state
  const [showCreateGroup, setShowCreateGroup] = React.useState(false)
  const [newGroupName, setNewGroupName] = React.useState("")
  const [inviteEmails, setInviteEmails] = React.useState("")
  const [searchConnection, setSearchConnection] = React.useState("")
  const [selectedConnections, setSelectedConnections] = React.useState<string[]>([])
  const [userConnections, setUserConnections] = React.useState<{ id: string; name: string }[]>([])
  const [connectionsLoading, setConnectionsLoading] = React.useState(false)

  const currentGroup = joinedGroups.find((g) => g.id === activeGroup) || joinedGroups[0]

  const mapRow = (row: { id: string | number; name: string; member_count?: number | string; admin_name?: string }): GroupItem => ({
    id: String(row.id),
    name: row.name,
    members: Number(row.member_count || 0),
    unread: 0,
    pattern: "data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fillOpacity='0.06'%3E%3Crect x='0' y='0' width='20' height='20'/%3E%3C/g%3E%3C/svg%3E",
    admin_name: row.admin_name || 'Unknown Admin',
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

  // Fetch actual community members when modal opens
  React.useEffect(() => {
    if (!showCreateGroup) return
    
    const fetchConnections = async () => {
      try {
        setConnectionsLoading(true)
        const res = await fetch('/api/members', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          const members: { id: string; name: string }[] = Array.isArray(data?.members)
            ? (data.members as any[]).map((m) => ({ id: String(m.id), name: String(m.name || 'Unknown') }))
            : []
          setUserConnections(members)
        } else {
          setUserConnections([])
        }
      } catch (error) {
        setUserConnections([])
      } finally {
        setConnectionsLoading(false)
      }
    }

    fetchConnections()
  }, [showCreateGroup])

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
      if (!createRes.ok) {
        toast.error('Failed to create group')
        return
      }
      const data = await createRes.json()
      const groupId = data?.group?.id
      // Collect recipients: selected connections (by user id) and optional emails
      const recipientUserIds = selectedConnections
        .map((id) => Number(id))
        .filter((n) => Number.isFinite(n))
      const recipientEmails = inviteEmails
        .split(',')
        .map(e => e.trim())
        .filter(Boolean)
      // Send invites only if we have at least one recipient (emails are optional)
      if (groupId && (recipientUserIds.length || recipientEmails.length)) {
        await fetch('/api/secret-groups/invites/send', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            group_id: groupId,
            recipient_user_ids: recipientUserIds,
            recipient_emails: recipientEmails
          })
        })
      }
      toast.success(`Group "${name}" created successfully!`)
      setShowCreateGroup(false)
      setNewGroupName("")
      setInviteEmails("")
      setSearchConnection("")
      setSelectedConnections([])
      await loadData()
    } catch (error) {
      toast.error('Failed to create group')
    }
  }

  // Events state for secret groups page
  const [events, setEvents] = useState<Array<any>>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [lastEventsUpdate, setLastEventsUpdate] = useState<Date | null>(null)

  // Secret group requests (invites) state
  const [groupRequests, setGroupRequests] = React.useState<Array<{
    id: number
    group_id: string
    group_name: string
    group_description?: string
    sender_name: string
    sender_email: string
    created_at: string
  }>>([])
  const [requestsLoading, setRequestsLoading] = React.useState(false)

  const fetchGroupRequests = React.useCallback(async () => {
    if (!user?.id) return
    setRequestsLoading(true)
    try {
      const res = await fetch('/api/secret-groups/invites/received', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setGroupRequests(Array.isArray(data?.invites) ? data.invites : [])
      } else {
        setGroupRequests([])
      }
    } catch {
      setGroupRequests([])
    } finally {
      setRequestsLoading(false)
    }
  }, [user?.id])

  React.useEffect(() => {
    fetchGroupRequests()
    const interval = setInterval(fetchGroupRequests, 30000)
    return () => clearInterval(interval)
  }, [fetchGroupRequests])

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

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 pb-16 sm:pb-20 lg:pb-6">
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-6">
          {/* Left Sidebar - Groups List (joined only) */}
          <div className="w-full lg:w-1/2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 lg:mb-4 space-y-2 sm:space-y-0">
              <h2 className="flex items-center gap-2 text-base sm:text-lg font-semibold">Secret Groups</h2>
              <Button size="sm" onClick={() => setShowCreateGroup(true)} className="w-full sm:w-auto text-xs sm:text-sm">
                + Create Group
              </Button>
            </div>
            <div className="p-0 mt-6 sm:mt-8 lg:mt-10">
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {(joinedGroups.length ? joinedGroups : []).slice(0, 3).map((group) => (
                  <div
                    key={group.id}
                    className={`w-full h-24 sm:h-28 md:h-32 border rounded-xl bg-white flex items-center justify-between px-3 sm:px-4 md:px-5 transition-colors hover:bg-accent/30`}
                  >
                    <div
                      className="flex items-center gap-3 sm:gap-4 cursor-pointer flex-1 min-w-0"
                      onClick={() => { window.location.href = `/product/groups/${encodeURIComponent(group.id)}` }}
                    >
                      <div
                        className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundImage: `url("${group.pattern}")` }}
                      >
                        <Lock className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-semibold leading-tight truncate">{group.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs sm:text-sm text-muted-foreground">{group.members} members</p>
                          <span className="text-xs text-muted-foreground">•</span>
                          <p className="text-xs sm:text-sm text-muted-foreground">Admin: {group.admin_name}</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 sm:h-7 px-2 sm:px-3 text-xs bg-transparent ml-2 sm:ml-4 whitespace-nowrap flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); openAddMembers({ id: group.id, name: group.name }) }}
                    >
                      <span className="hidden sm:inline">+ Add Member</span>
                      <span className="sm:hidden">+ Add</span>
                    </Button>
                  </div>
                ))}
                {joinedGroups.length === 0 && (
                  <Card className="p-6 text-center text-sm text-muted-foreground">No groups joined yet. Use Suggested Groups to join.</Card>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-full lg:w-1/2 space-y-3 sm:space-y-4 lg:space-y-6">
            {/* Upcoming Events (dynamic) */}
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <h3 className="flex items-center gap-2 text-xs sm:text-sm lg:text-base font-semibold">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" /> 
                    <span className="truncate">Upcoming Events</span>
                  </h3>
                  {lastEventsUpdate && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">Last updated: {lastEventsUpdate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={handleRefreshEvents} disabled={eventsLoading} className="text-xs px-2 flex-shrink-0">
                  <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${eventsLoading ? 'animate-spin' : ''}`} />
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
                <Button variant="outline" className="w-full mt-3 sm:mt-4 bg-transparent text-xs sm:text-sm" onClick={() => window.location.href = '/product/events'}>
                  View All Events
                </Button>
              )}
            </div>

            {/* Secret Group Requests */}
            <Card className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="font-semibold text-xs sm:text-sm lg:text-base">Secret Group Requests</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={fetchGroupRequests}
                  disabled={requestsLoading}
                  className="h-6 sm:h-7 px-2 sm:px-3 text-xs"
                >
                  {requestsLoading ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
              {requestsLoading ? (
                <div className="text-xs sm:text-sm text-muted-foreground">Loading requests...</div>
              ) : groupRequests.length === 0 ? (
                <div className="text-xs sm:text-sm text-muted-foreground">No pending requests.</div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {groupRequests.map((req) => (
                    <div key={req.id} className="border border-border/50 rounded-lg p-2 sm:p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-medium truncate">{req.group_name}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Invited by {req.sender_name}</p>
                          {req.group_description && (
                            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 line-clamp-2">
                              {req.group_description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="sm"
                          className="flex-1 h-6 sm:h-7 text-xs"
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/secret-groups/invites/${req.id}/accept`, { method: 'POST', credentials: 'include' })
                              if (res.ok) {
                                await fetchGroupRequests()
                                await loadData()
                                toast.success(`Joined "${req.group_name}"`)
                              } else {
                                const e = await res.json().catch(() => ({}))
                                toast.error(e.error || 'Failed to accept request')
                              }
                            } catch {
                              toast.error('Failed to accept request')
                            }
                          }}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-6 sm:h-7 text-xs bg-transparent"
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/secret-groups/invites/${req.id}/decline`, { method: 'POST', credentials: 'include' })
                              if (res.ok) {
                                await fetchGroupRequests()
                                toast.success('Request declined')
                              } else {
                                const e = await res.json().catch(() => ({}))
                                toast.error(e.error || 'Failed to decline')
                              }
                            } catch {
                              toast.error('Failed to decline')
                            }
                          }}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Group Admins */}
            <Card className="p-3 sm:p-4 lg:p-6">
              <h3 className="font-semibold mb-3 sm:mb-4 flex items-center text-xs sm:text-sm lg:text-base">
                <Crown className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-2 flex-shrink-0" />
                Group Admins
              </h3>
              <div className="space-y-3">
                {joinedGroups.length > 0 ? (
                  joinedGroups.map((group) => (
                    <div key={group.id} className="flex items-start gap-2 pb-2 border-b last:border-0 last:pb-0">
                      <Crown className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{group.name}</p>
                        <p className="text-xs text-muted-foreground">Admin: {group.admin_name || 'Unknown Admin'}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No groups joined yet
                  </div>
                )}
              </div>
            </Card>

            {/* Suggested Groups (from admin) */}
            <Card className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="font-semibold text-xs sm:text-sm lg:text-base">Suggested Groups</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  {suggestedGroups.length} groups
                </span>
              </div>
              <div className="space-y-3 sm:space-y-4 max-h-[300px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
                {suggestedGroups.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No suggestions available.</p>
                ) : (
                  suggestedGroups.map((group) => (
                    <div key={group.id} className="space-y-2 border-b pb-3 last:border-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-medium text-xs sm:text-sm truncate min-w-0 flex-1">{group.name}</h4>
                        <Button size="sm" variant="outline" className="h-6 px-2 text-xs bg-transparent flex-shrink-0" onClick={() => handleJoin(group.id)}>
                          Join
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">{group.members} members</p>
                        <span className="text-xs text-muted-foreground">•</span>
                        <p className="text-xs text-muted-foreground">Admin: {group.admin_name}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="p-4 sm:p-6 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <X className="w-4 h-4 sm:w-5 sm:h-5 absolute top-3 right-3 sm:top-4 sm:right-4 cursor-pointer" onClick={() => {
              setShowCreateGroup(false)
              setNewGroupName("")
              setInviteEmails("")
              setSearchConnection("")
              setSelectedConnections([])
            }} />
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Create Secret Group</h2>
            <div className="flex flex-col space-y-3 sm:space-y-4">
              <div>
                <label className="text-xs sm:text-sm font-medium">Group Name *</label>
                <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="border p-2 sm:p-3 rounded w-full text-sm sm:text-base" placeholder="Enter group name" required />
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium mb-1 block">Invite Connections</label>
                <div className="flex items-center border rounded mb-2 p-2">
                  <Search className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground mr-2 flex-shrink-0" />
                  <input type="text" placeholder="Search connections..." value={searchConnection} onChange={(e) => setSearchConnection(e.target.value)} className="flex-1 outline-none text-sm sm:text-base" />
                </div>
                <div className="max-h-24 sm:max-h-32 overflow-y-auto space-y-2">
                  {connectionsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-xs text-muted-foreground">Loading connections...</span>
                    </div>
                  ) : filteredConnections.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No connections found</p>
                  ) : (
                    filteredConnections.map(conn => (
                      <div key={conn.id} className="flex items-center space-x-2">
                        <input type="checkbox" checked={selectedConnections.includes(conn.id)} onChange={() => toggleConnection(conn.id)} className="flex-shrink-0" />
                        <span className="text-xs sm:text-sm truncate">{conn.name}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium">Invite by Email</label>
                <textarea value={inviteEmails} onChange={(e) => setInviteEmails(e.target.value)} className="border p-2 sm:p-3 rounded w-full text-sm sm:text-base" placeholder="Enter email addresses separated by commas" rows={3} />
              </div>
              <Button onClick={handleCreateGroup} className="mt-2 text-sm sm:text-base">Create Group</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Add Members Modal */}
      {showAddMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="p-4 sm:p-6 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <X className="w-4 h-4 sm:w-5 sm:h-5 absolute top-3 right-3 sm:top-4 sm:right-4 cursor-pointer" onClick={() => setShowAddMembers(false)} />
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Add Members{targetGroupName ? ` to ${targetGroupName}` : ''}</h2>
            <div className="flex flex-col space-y-3">
              <label className="text-xs sm:text-sm font-medium">Search Connections</label>
              <input
                type="text"
                value={inviteSearch}
                onChange={(e) => setInviteSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="border p-2 sm:p-3 rounded w-full text-sm sm:text-base"
              />
              <div className="border rounded p-2 h-48 sm:h-64 overflow-y-auto space-y-2">
                {usersLoading ? (
                  <div className="text-xs sm:text-sm text-muted-foreground">Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-xs sm:text-sm text-muted-foreground">No users found.</div>
                ) : (
                  filteredUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-2 rounded hover:bg-accent/40 gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <Button
                        size="sm"
                        className="h-6 sm:h-7 px-2 sm:px-3 text-xs flex-shrink-0"
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
