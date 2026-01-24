'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';

// Types for sidebar data
interface Chapter {
    id: string;
    name: string;
    location_city: string;
    member_count: number;
}

interface SecretGroup {
    id: string;
    name: string;
    description?: string;
    member_count?: number;
    is_private: boolean;
}

interface FollowRequest {
    id: number;
    requesterId: number;
    requesterName: string;
    requesterPhoto?: string;
    status: 'pending' | 'accepted' | 'declined';
    createdAt: string;
}

interface SuggestedConnection {
    id: number;
    name: string;
    profile_photo_url?: string;
    email?: string;
    chapters?: Array<{
        chapter_id: string;
        chapter_name: string;
        location_city?: string;
    }>;
    userJoinedAt?: string;
}

interface UpcomingEvent {
    id: string;
    title: string;
    description?: string;
    date: string;
    time: string;
    location: string;
    host: string;
    attendees_count: number;
    max_attendees?: number;
    is_joined: boolean;
    event_type?: string;
}

interface SidebarDataContextType {
    // Data
    chapters: Chapter[];
    secretGroups: SecretGroup[];
    followRequests: FollowRequest[];
    suggestedConnections: SuggestedConnection[];
    followStatus: Map<number, 'following' | 'pending' | 'not-following'>;
    upcomingEvents: UpcomingEvent[];

    // Loading states
    loading: boolean;
    chaptersLoading: boolean;
    secretGroupsLoading: boolean;
    followRequestsLoading: boolean;
    suggestedConnectionsLoading: boolean;
    eventsLoading: boolean;

    // Error states
    error: string | null;

    // Actions
    refreshAll: () => Promise<void>;
    refreshFollowRequests: () => Promise<void>;
    updateFollowRequest: (requestId: number, action: 'accept' | 'decline') => void;
    updateFollowStatus: (userId: number, status: 'following' | 'pending' | 'not-following') => void;
}

const SidebarDataContext = createContext<SidebarDataContextType | undefined>(undefined);

export const useSidebarData = () => {
    const context = useContext(SidebarDataContext);
    if (!context) {
        throw new Error('useSidebarData must be used within a SidebarDataProvider');
    }
    return context;
};

export const SidebarDataProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();

    // Data states
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [secretGroups, setSecretGroups] = useState<SecretGroup[]>([]);
    const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
    const [suggestedConnections, setSuggestedConnections] = useState<SuggestedConnection[]>([]);
    const [followStatus, setFollowStatus] = useState<Map<number, 'following' | 'pending' | 'not-following'>>(new Map());
    const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);

    // Loading states
    const [loading, setLoading] = useState(true);
    const [chaptersLoading, setChaptersLoading] = useState(true);
    const [secretGroupsLoading, setSecretGroupsLoading] = useState(true);
    const [followRequestsLoading, setFollowRequestsLoading] = useState(true);
    const [suggestedConnectionsLoading, setSuggestedConnectionsLoading] = useState(true);
    const [eventsLoading, setEventsLoading] = useState(true);

    // Error state
    const [error, setError] = useState<string | null>(null);

    // Prevent duplicate fetches
    const hasFetched = useRef(false);

    // Fetch all sidebar data in parallel
    const fetchAllData = useCallback(async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        console.log('[SidebarData] Fetching all sidebar data for user', user.id);
        setLoading(true);
        setError(null);

        try {
            // Parallel fetch all data - this is the KEY optimization
            const [
                chaptersRes,
                secretGroupsRes,
                followRequestsRes,
                membersRes,
                eventsRes
            ] = await Promise.all([
                fetch(`/api/users/${user.id}/chapters`, { credentials: 'include' }),
                fetch(`/api/users/${user.id}/secret-groups`, { credentials: 'include' }),
                fetch('/api/follow-requests?type=received', { credentials: 'include' }),
                fetch('/api/members', { credentials: 'include' }),
                fetch('/api/events', { credentials: 'include' })
            ]);

            // Process chapters
            if (chaptersRes.ok) {
                const data = await chaptersRes.json();
                if (data.success && Array.isArray(data.chapters)) {
                    setChapters(data.chapters.slice(0, 5));
                }
            }
            setChaptersLoading(false);

            // Process secret groups
            if (secretGroupsRes.ok) {
                const data = await secretGroupsRes.json();
                const userGroups = (data?.groups || []).map((g: any) => ({
                    id: String(g.id),
                    name: String(g.name || ''),
                    description: g.description,
                    member_count: Number(g.member_count || 0),
                    is_private: true
                }));
                setSecretGroups(userGroups);
            }
            setSecretGroupsLoading(false);

            // Process follow requests
            if (followRequestsRes.ok) {
                const data = await followRequestsRes.json();
                if (data.success && Array.isArray(data.requests)) {
                    setFollowRequests(data.requests);
                }
            }
            setFollowRequestsLoading(false);

            // Process members and fetch follow status
            if (membersRes.ok) {
                const membersData = await membersRes.json();
                const members = membersData.members || [];

                // Filter out current user
                const suggested = members
                    .filter((member: any) => member.id !== user.id)
                    .map((member: any) => ({
                        id: member.id,
                        name: member.name,
                        profile_photo_url: member.profilePhotoUrl,
                        email: member.email,
                        chapters: member.chapters || [],
                        userJoinedAt: member.userJoinedAt
                    }));

                setSuggestedConnections(suggested);

                // Fetch follow status for these users
                if (suggested.length > 0) {
                    const userIds = suggested.map((s: any) => s.id).join(',');
                    try {
                        const followRes = await fetch(`/api/follow?checkStatus=true&userIds=${userIds}`, { credentials: 'include' });
                        if (followRes.ok) {
                            const followData = await followRes.json();
                            if (followData.followStatus) {
                                const statusMap = new Map(Object.entries(followData.followStatus).map(([k, v]) => [parseInt(k), v as any]));
                                setFollowStatus(statusMap);
                            }
                        }
                    } catch (e) {
                        console.error('[SidebarData] Failed to fetch follow status', e);
                    }
                }
            }
            setSuggestedConnectionsLoading(false);

            // Process events
            if (eventsRes.ok) {
                const eventsData = await eventsRes.json();
                if (Array.isArray(eventsData)) {
                    const now = new Date();
                    const upcomingFiltered = eventsData
                        .filter((event: any) => {
                            try {
                                const eventDate = new Date(event.date);
                                now.setHours(0, 0, 0, 0);
                                return eventDate >= now;
                            } catch {
                                return false;
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
                            is_joined: Boolean(event.is_registered),
                            event_type: event.event_type
                        }));
                    setUpcomingEvents(upcomingFiltered);
                }
            }
            setEventsLoading(false);

            console.log('[SidebarData] All sidebar data fetched successfully');
        } catch (err) {
            console.error('[SidebarData] Error fetching sidebar data:', err);
            setError('Failed to load sidebar data');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    // Refresh just follow requests (for after accept/decline)
    const refreshFollowRequests = useCallback(async () => {
        setFollowRequestsLoading(true);
        try {
            const res = await fetch('/api/follow-requests?type=received', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.requests)) {
                    setFollowRequests(data.requests);
                }
            }
        } catch (e) {
            console.error('[SidebarData] Failed to refresh follow requests', e);
        } finally {
            setFollowRequestsLoading(false);
        }
    }, []);

    // Optimistic update for follow request
    const updateFollowRequest = useCallback((requestId: number, action: 'accept' | 'decline') => {
        setFollowRequests(prev => prev.filter(req => req.id !== requestId));
    }, []);

    // Optimistic update for follow status
    const updateFollowStatus = useCallback((userId: number, status: 'following' | 'pending' | 'not-following') => {
        setFollowStatus(prev => new Map(prev).set(userId, status));
    }, []);

    // Initial fetch - runs ONCE per user session
    useEffect(() => {
        if (user?.id && !hasFetched.current) {
            hasFetched.current = true;
            fetchAllData();
        }
    }, [user?.id, fetchAllData]);

    // Reset when user changes
    useEffect(() => {
        if (!user) {
            hasFetched.current = false;
            setChapters([]);
            setSecretGroups([]);
            setFollowRequests([]);
            setSuggestedConnections([]);
            setFollowStatus(new Map());
            setUpcomingEvents([]);
            setLoading(true);
        }
    }, [user]);

    const value: SidebarDataContextType = {
        chapters,
        secretGroups,
        followRequests,
        suggestedConnections,
        followStatus,
        upcomingEvents,
        loading,
        chaptersLoading,
        secretGroupsLoading,
        followRequestsLoading,
        suggestedConnectionsLoading,
        eventsLoading,
        error,
        refreshAll: fetchAllData,
        refreshFollowRequests,
        updateFollowRequest,
        updateFollowStatus
    };

    return (
        <SidebarDataContext.Provider value={value}>
            {children}
        </SidebarDataContext.Provider>
    );
};
