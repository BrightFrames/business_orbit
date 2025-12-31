"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DisplayPostCard } from "@/components/PostCard"
import { Lock, Users, Crown, Plus, X, Calendar, MapPin } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import React from "react"

interface SecretGroupMeta {
  id: string
  name: string
  description?: string | null
  created_at?: string
  member_count: number
}

interface SimpleUser { id: number; name: string; email: string }

export default function GroupsSecretPage() {
  const router = useRouter()
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")
  const [inviteEmails, setInviteEmails] = useState("")
  const [chatMessages, setChatMessages] = useState<{ user: string; text: string }[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const { user } = useAuth()

  // Server data
  const [allGroups, setAllGroups] = useState<SecretGroupMeta[]>([])
  const [myGroups, setMyGroups] = useState<SecretGroupMeta[]>([])
  // Suggested groups feature commented out - will be added later
  // const [suggested, setSuggested] = useState<SecretGroupMeta[]>([])

  // Invite connections data (only real users from DB)
  const [allUsers, setAllUsers] = useState<SimpleUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [inviteSearch, setInviteSearch] = useState("")
  const [selectedInviteeIds, setSelectedInviteeIds] = useState<Set<number>>(new Set())

  // Add Members modal state
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [targetGroup, setTargetGroup] = useState<SecretGroupMeta | null>(null)
  const [inviteSearchAdd, setInviteSearchAdd] = useState("")
  const [selectedInviteeIdsAdd, setSelectedInviteeIdsAdd] = useState<Set<number>>(new Set())
  const [inviteEmailsAdd, setInviteEmailsAdd] = useState("")

  // Events state (single-load, no loader/refresh)
  const [events, setEvents] = useState<Array<any>>([])

  // Secret group requests state
  const [groupRequests, setGroupRequests] = useState<Array<{
    id: number
    group_id: string
    group_name: string
    group_description?: string
    sender_name: string
    sender_email: string
    created_at: string
  }>>([])
  const [requestsLoading, setRequestsLoading] = useState(false)

  // Load groups and user's memberships
  // Note: allGroups is only used for internal tracking, myGroups is what's displayed
  // The API now filters to only show groups user is member of or admin of
  useEffect(() => {
    ;(async () => {
      try {
        // Fetch groups (API now filters to only show groups user can see)
        const res = await fetch('/api/admin/management/secret-groups', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          const groups: SecretGroupMeta[] = Array.isArray(data?.groups) ? data.groups.map((g: any) => ({
            id: String(g.id),
            name: g.name,
            description: g.description,
            created_at: g.created_at,
            member_count: Number(g.member_count || 0)
          })) : []
          setAllGroups(groups)
          // Also set as myGroups since API only returns groups user is member/admin of
          setMyGroups(groups)
        } else {
          setAllGroups([])
          setMyGroups([])
        }
      } catch {
        setAllGroups([])
        setMyGroups([])
      }

      // Also fetch from user endpoint for consistency
      try {
        if (user?.id) {
          const res2 = await fetch(`/api/users/${user.id}/secret-groups`, { credentials: 'include' })
          if (res2.ok) {
            const data2 = await res2.json()
            const mine: SecretGroupMeta[] = Array.isArray(data2?.groups) ? data2.groups.map((g: any) => ({
              id: String(g.id),
              name: g.name,
              description: g.description,
              created_at: g.created_at,
              member_count: Number(g.member_count || 0)
            })) : []
            setMyGroups(mine)
          }
        }
      } catch {
        // Keep existing myGroups if fetch fails
      }
    })()
  }, [user?.id])

  // Fetch real users when Create Group or Add Members modal opens
  useEffect(() => {
    if (!showCreateGroup && !showAddMembers) return
    ;(async () => {
      try {
        setUsersLoading(true)
        const res = await fetch('/api/members', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          const members = Array.isArray(data?.members) ? (data.members as any[]).map((m) => ({ id: Number(m.id), name: String(m.name || ''), email: String(m.email || '') })) : []
          setAllUsers(members)
        } else {
          setAllUsers([])
        }
      } finally {
        setUsersLoading(false)
      }
    })()
  }, [showCreateGroup, showAddMembers])

  // Suggested groups feature commented out - will be added later
  // Compute suggested when allGroups/myGroups change
  // useEffect(() => {
  //   const mySet = new Set(myGroups.map(g => g.id))
  //   setSuggested(allGroups.filter(g => !mySet.has(g.id)))
  // }, [allGroups, myGroups])

  const fetchUpcomingEvents = async () => {
    try {
      const url = user?.id ? `/api/events?userId=${user.id}&limit=6` : `/api/events?limit=6`
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) { setEvents([]); return }
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
            is_registered: Boolean(e.is_registered),
          }
        })
      setEvents(upcoming)
    } catch (_) {
      setEvents([])
    }
  }

  React.useEffect(() => { fetchUpcomingEvents() }, [user?.id])

  // Fetch secret group requests
  const fetchGroupRequests = async () => {
    if (!user?.id) return
    setRequestsLoading(true)
    try {
      const res = await fetch('/api/secret-groups/invites/received', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        console.log('Fetched group requests:', data)
        setGroupRequests(data.invites || [])
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error('Failed to fetch group requests:', errorData)
      }
    } catch (error) {
      console.error('Error fetching group requests:', error)
    } finally {
      setRequestsLoading(false)
    }
  }

  React.useEffect(() => {
    fetchGroupRequests()
    // Refresh requests every 30 seconds
    const interval = setInterval(fetchGroupRequests, 30000)
    return () => clearInterval(interval)
  }, [user?.id])

  // Actions
  const handleCreateGroup = async () => {
    const name = newGroupName.trim()
    if (!name) return
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, description: groupDescription || undefined })
      })
      if (res.ok) {
        const data = await res.json()
        const created: SecretGroupMeta | undefined = data?.group ? {
          id: String(data.group.id),
          name: data.group.name,
          description: data.group.description,
          created_at: data.group.created_at,
          member_count: Number(data.group.member_count || 0)
        } : undefined
        if (created) {
          setAllGroups(prev => [created, ...prev])
          
          // Send secret group invites to selected users and emails
          const recipientUserIds: number[] = []
          const recipientEmails: string[] = []

          // Collect user IDs from selected connections
          if (selectedInviteeIds.size > 0 && allUsers.length > 0) {
            const idSet = new Set(selectedInviteeIds)
            const toInvite = allUsers.filter(u => idSet.has(u.id))
            recipientUserIds.push(...toInvite.map(u => u.id))
          }

          // Collect emails from inviteEmails field (comma-separated)
          if (inviteEmails.trim()) {
            const emails = inviteEmails.split(',').map(e => e.trim()).filter(e => e.length > 0)
            recipientEmails.push(...emails)
          }

          // Send invites via secret group invite API
          // Note: Creator is already added as member in the group creation API
          if (recipientUserIds.length > 0 || recipientEmails.length > 0) {
            try {
              console.log('Sending invites:', { group_id: created.id, recipientUserIds, recipientEmails })
              const inviteRes = await fetch('/api/secret-groups/invites/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                body: JSON.stringify({
                  group_id: created.id,
                  recipient_user_ids: recipientUserIds,
                  recipient_emails: recipientEmails
                })
              })
              
              if (inviteRes.ok) {
                const inviteData = await inviteRes.json()
                console.log('Invites sent successfully:', inviteData)
                alert(`Group created! ${inviteData.message || 'Invites sent successfully.'}`)
              } else {
                const errorData = await inviteRes.json().catch(() => ({}))
                console.error('Failed to send invites:', errorData)
                alert(`Group created, but failed to send some invites: ${errorData.error || 'Unknown error'}`)
              }
            } catch (error) {
              console.error('Error sending secret group invites:', error)
              alert('Group created, but failed to send invites. Please try inviting members manually.')
            }
          } else {
            alert('Group created successfully!')
          }
          
          // Auto-join creator if logged in (group creation already adds creator as member, but ensure it's done)
          if (created.id) {
            try { 
              await fetch(`/api/secret-groups/${created.id}/membership`, { method: 'POST', credentials: 'include' }) 
            } catch {}
          }

          // refresh my groups
          if (user?.id) {
            try {
              const res2 = await fetch(`/api/users/${user.id}/secret-groups`, { credentials: 'include' })
              const data2 = await res2.json()
              const mine: SecretGroupMeta[] = Array.isArray(data2?.groups) ? data2.groups.map((g: any) => ({
                id: String(g.id), name: g.name, description: g.description, created_at: g.created_at, member_count: Number(g.member_count || 0)
              })) : []
              setMyGroups(mine)
            } catch {}
          }
        }
      }
    } finally {
    setNewGroupName("")
      setGroupDescription("")
      setInviteEmails("")
      setSelectedInviteeIds(new Set())
      setInviteSearch("")
    setShowCreateGroup(false)
    }
  }

  const joinGroup = async (groupId: string) => {
    try {
      await fetch(`/api/secret-groups/${groupId}/membership`, { method: 'POST', credentials: 'include' })
      // move from suggested to myGroups (suggested groups feature commented out)
      const g = allGroups.find(g => g.id === groupId)
      if (g) {
        setMyGroups(prev => [{ ...g, member_count: (g.member_count || 0) + 1 }, ...prev.filter(x => x.id !== groupId)])
        // setSuggested(prev => prev.filter(x => x.id !== groupId))
      }
    } catch {}
  }

  // Add Members modal helpers
  const filteredUsersAdd = allUsers.filter(u => {
    const q = inviteSearchAdd.trim().toLowerCase()
    if (!q) return true
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  const toggleInviteeAdd = (id: number) => {
    setSelectedInviteeIdsAdd(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openAddMembers = (group: SecretGroupMeta) => {
    setTargetGroup(group)
    setInviteSearchAdd("")
    setSelectedInviteeIdsAdd(new Set())
    setInviteEmailsAdd("")
    setShowAddMembers(true)
  }

  const sendAddMembersInvites = async () => {
    if (!targetGroup) return
    // selected existing users
    if (selectedInviteeIdsAdd.size > 0 && allUsers.length > 0) {
      const idSet = new Set(selectedInviteeIdsAdd)
      const toInvite = allUsers.filter(u => idSet.has(u.id))
      for (const u of toInvite) {
        try {
          await fetch('/api/invites/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ recipient_email: u.email, message: `You are invited to join secret group "${targetGroup.name}".` })
          })
        } catch {}
      }
    }
    // arbitrary emails
    if (inviteEmailsAdd.trim()) {
      const emails = inviteEmailsAdd.split(',')
      for (const em of emails) {
        const email = em.trim()
        if (!email) continue
        try {
          await fetch('/api/invites/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ recipient_email: email, message: `You are invited to join secret group "${targetGroup.name}".` })
          })
        } catch {}
      }
    }
    setShowAddMembers(false)
  }

  const handleSendMessage = () => {
    if (!newMessage.trim()) return
    setChatMessages([...chatMessages, { user: "You", text: newMessage }])
    setNewMessage("")
  }

  const handleInviteMember = () => {
    if (!inviteEmail.trim()) return
    alert(`Invite sent to: ${inviteEmail}`)
    setInviteEmail("")
  }

  const filteredUsers = allUsers.filter(u => {
    const q = inviteSearch.trim().toLowerCase()
    if (!q) return true
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  const toggleInvitee = (id: number) => {
    setSelectedInviteeIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6 pb-20 lg:pb-6 flex flex-col lg:flex-row gap-4">

        {/* Left Sidebar */}
        <div className="w-full lg:w-1/2 space-y-4 flex flex-col">
          {/* Groups List */}
          <Card className="p-3 lg:p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm lg:text-base">Secret Groups</h3>
              <Button size="sm" variant="ghost" onClick={() => setShowCreateGroup(true)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex lg:flex-col space-x-2 lg:space-x-0 lg:space-y-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
              {myGroups.length === 0 ? (
                <div className="text-xs text-muted-foreground px-1">You haven't joined any secret groups yet.</div>
              ) : (
                myGroups.map((group) => (
                  <div key={group.id} className={`flex-shrink-0 lg:flex-shrink lg:w-full flex items-center space-x-3 p-2 lg:p-3 rounded-lg transition-colors min-w-[260px] lg:min-w-0 hover:bg-accent/50`}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-accent">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-left cursor-pointer" onClick={() => router.push(`/product/groups/${group.id}`)}>
                      <p className="text-sm font-medium">{group.name}</p>
                      <p className="text-xs text-muted-foreground">{group.member_count} members</p>
                  </div>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs bg-transparent" onClick={() => openAddMembers(group)}>+ Add Members</Button>
                  </div>
                ))
                  )}
            </div>
          </Card>

          {/* Chat + Invite stacked */}
          <div className="space-y-4">
            {/* Chat */}
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Chat</h3>
              <div className="border border-muted rounded p-2 h-48 overflow-y-auto mb-2">
                {chatMessages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
                {chatMessages.map((msg, idx) => (
                  <p key={idx}><strong>{msg.user}:</strong> {msg.text}</p>
                ))}
              </div>
              <div className="flex flex-col space-y-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full border p-2 rounded"
                />
                <Button className="w-full" onClick={handleSendMessage}>Send</Button>
              </div>
            </Card>

            {/* Invite Members */}
            <Card className="p-3">
              <h4 className="font-semibold mb-1">Invite Members</h4>
              <div className="flex flex-col space-y-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email..."
                  className="w-full border p-2 rounded"
                />
                <Button className="w-full" onClick={handleInviteMember}>Invite</Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-full lg:w-1/2 space-y-4 lg:space-y-6">
          {/* Upcoming Events - single-load, no loader/refresh */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Calendar className="h-5 w-5 text-primary" /> 
              Upcoming Events
            </div>
            <div className="space-y-3">
              {events.length === 0 ? (
                <Card className="p-6 text-center">
                  <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No upcoming events found.</p>
                  <p className="text-xs text-muted-foreground mt-1">Check back later for new events!</p>
                </Card>
              ) : (
                events.map((ev) => (
                  <Card key={ev.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h3 className="font-medium text-sm">{ev.title}</h3>
                        <div className="flex items-center gap-1">
                          {ev.is_registered && (
                            <Badge variant="secondary" className="text-xs">
                              Registered
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {ev.dateText} • {ev.timeText}
                          </span>
                          <span className="flex items-center">
                            <Users className="w-3 h-3 mr-1" />
                            {ev.attendees} attending
                          </span>
                        </div>
                        {ev.venue_address && (
                          <div className="flex items-start text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{ev.venue_address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
            {events.length > 0 && (
              <Button 
                variant="outline" 
                className="w-full text-sm"
                onClick={() => window.location.href = '/events'}
              >
                View All Events
              </Button>
            )}
          </section>

          {/* Secret Group Requests */}
          <Card className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm lg:text-base">Secret Group Requests</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={fetchGroupRequests}
                disabled={requestsLoading}
                className="h-7 text-xs"
              >
                {requestsLoading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
            {requestsLoading ? (
              <div className="text-sm text-muted-foreground">Loading requests...</div>
            ) : groupRequests.length === 0 ? (
              <div className="text-sm text-muted-foreground">No pending requests.</div>
            ) : (
              <div className="space-y-3">
                {groupRequests.map((request) => (
                  <div key={request.id} className="border border-border/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{request.group_name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Invited by {request.sender_name}
                        </p>
                        {request.group_description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {request.group_description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="flex-1 h-7 text-xs"
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/secret-groups/invites/${request.id}/accept`, {
                              method: 'POST',
                              credentials: 'include'
                            })
                            if (res.ok) {
                              // Refresh groups and requests
                              await fetchGroupRequests()
                              if (user?.id) {
                                try {
                                  const res2 = await fetch(`/api/users/${user.id}/secret-groups`, { credentials: 'include' })
                                  const data2 = await res2.json()
                                  const mine: SecretGroupMeta[] = Array.isArray(data2?.groups) ? data2.groups.map((g: any) => ({
                                    id: String(g.id), name: g.name, description: g.description, created_at: g.created_at, member_count: Number(g.member_count || 0)
                                  })) : []
                                  setMyGroups(mine)
                                  // Show success message
                                  alert(`Successfully joined "${request.group_name}"!`)
                                } catch {}
                              }
                            } else {
                              const errorData = await res.json().catch(() => ({}))
                              alert(errorData.error || 'Failed to accept request')
                            }
                          } catch (error) {
                            console.error('Error accepting request:', error)
                            alert('Failed to accept request. Please try again.')
                          }
                        }}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs bg-transparent"
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/secret-groups/invites/${request.id}/decline`, {
                              method: 'POST',
                              credentials: 'include'
                            })
                            if (res.ok) {
                              await fetchGroupRequests()
                            } else {
                              const errorData = await res.json().catch(() => ({}))
                              alert(errorData.error || 'Failed to decline request')
                            }
                          } catch (error) {
                            console.error('Error declining request:', error)
                            alert('Failed to decline request. Please try again.')
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

          {/* Suggested Groups - Feature commented out, will be added later */}
          {/* <Card className="p-4 lg:p-6">
            <h3 className="font-semibold mb-4 text-sm lg:text-base">Suggested Groups</h3>
            <div className="space-y-4">
              {suggested.length === 0 ? (
                <div className="text-sm text-muted-foreground">No suggestions right now.</div>
              ) : (
                suggested.map((group) => (
                  <div key={group.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{group.name}</h4>
                      <Button size="sm" variant="outline" className="h-6 px-2 text-xs bg-transparent" onClick={() => joinGroup(group.id)}>Join</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{group.description || 'Private secret group'}</p>
                    <p className="text-xs text-muted-foreground">{group.member_count} members</p>
                  </div>
                ))
              )}
            </div>
          </Card> */}
        </div>

      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="p-6 w-full max-w-md relative">
            <X
              className="w-5 h-5 absolute top-4 right-4 cursor-pointer"
              onClick={() => setShowCreateGroup(false)}
            />
            <h2 className="text-xl font-bold mb-4">Create Secret Group</h2>
            <div className="flex flex-col space-y-3">
              <label className="text-sm font-medium">Group Name *</label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="border p-2 rounded w-full"
                placeholder="Enter group name"
              />

              <label className="text-sm font-medium">Invite Connections</label>
              <input
                type="text"
                value={inviteSearch}
                onChange={(e) => setInviteSearch(e.target.value)}
                placeholder="Search connections..."
                className="border p-2 rounded w-full"
              />
              <div className="border rounded p-2 h-40 overflow-y-auto space-y-2">
                {usersLoading ? (
                  <div className="text-sm text-muted-foreground">Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No users found.</div>
                ) : (
                  filteredUsers.map(u => (
                    <label key={u.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={selectedInviteeIds.has(u.id)} onChange={() => toggleInvitee(u.id)} />
                      <span className="font-medium">{u.name}</span>
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                    </label>
                  ))
                )}
              </div>

              <label className="text-sm font-medium">Group Description (optional)</label>
              <textarea
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                className="border p-2 rounded w-full"
                placeholder="Enter a short description (optional)"
                rows={2}
              />

              <label className="text-sm font-medium">Invite by Email</label>
              <textarea
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                className="border p-2 rounded w-full"
                placeholder="Enter email addresses separated by commas"
                rows={2}
              />
              <Button onClick={handleCreateGroup} className="mt-2">Create Group</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Add Members Modal */}
      {showAddMembers && targetGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="p-6 w-full max-w-md relative">
            <X
              className="w-5 h-5 absolute top-4 right-4 cursor-pointer"
              onClick={() => setShowAddMembers(false)}
            />
            <h2 className="text-xl font-bold mb-4">Add Members to {targetGroup.name}</h2>
            <div className="flex flex-col space-y-3">
              <label className="text-sm font-medium">Invite Connections</label>
              <input
                type="text"
                value={inviteSearchAdd}
                onChange={(e) => setInviteSearchAdd(e.target.value)}
                placeholder="Search connections..."
                className="border p-2 rounded w-full"
              />
              <div className="border rounded p-2 h-40 overflow-y-auto space-y-2">
                {usersLoading ? (
                  <div className="text-sm text-muted-foreground">Loading users...</div>
                ) : filteredUsersAdd.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No users found.</div>
                ) : (
                  filteredUsersAdd.map(u => (
                    <label key={u.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={selectedInviteeIdsAdd.has(u.id)} onChange={() => toggleInviteeAdd(u.id)} />
                      <span className="font-medium">{u.name}</span>
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                    </label>
                  ))
                )}
              </div>

              <label className="text-sm font-medium">Invite by Email</label>
              <textarea
                value={inviteEmailsAdd}
                onChange={(e) => setInviteEmailsAdd(e.target.value)}
                className="border p-2 rounded w-full"
                placeholder="Enter email addresses separated by commas"
              />
              <Button onClick={sendAddMembersInvites} className="mt-2">Send Invites</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}





