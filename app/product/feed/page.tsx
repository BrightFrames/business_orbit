"use client";

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Navigation } from "@/components/navigation"
import PostCard, { EventCard } from "@/components/PostCard"
import FeedPost from "@/components/FeedPost"
import ProfileCard from "@/components/ProfileCard"
import ChaptersCard from "@/components/ChaptersCard"
import SecretGroupsCard from "@/components/SecretGroupsCard"
import RequestsCard from "@/components/RequestsCard"
import SuggestedConnectionsCard from "@/components/SuggestedConnectionsCard"
import UpcomingEventsCard from "@/components/UpcomingEventsCard"
import { safeApiCall } from "@/lib/utils/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sparkles } from "lucide-react"

// Ensure this page is rendered dynamically at runtime (avoid static generation timeouts)
export const dynamic = 'force-dynamic';

interface Post {
  id: string;
  content: string;
  published_at: string;
  created_at: string;
  user_id: number;
  user_name: string;
  profile_photo_url?: string;
  profession?: string;
  likes: number;
  comments: number;
  shares: number;
  media: Array<{
    id: string;
    media_type: string;
    cloudinary_url: string;
    file_name: string;
  }>;
}

import { useMediaQuery } from "@/hooks/use-media-query"

export default function FeedPage() {
  const { user, loading, onboardingCompleted, inviteSent, isNewUser, isAdmin } = useAuth()
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const [posts, setPosts] = useState<Post[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/product/auth'
    } else if (!loading && user) {
      if (isAdmin) {
      } else if (isNewUser) {
        if (!inviteSent) {
          window.location.href = '/product/invite';
        } else if (!onboardingCompleted) {
          window.location.href = '/product/onboarding';
        }
      }
    }
  }, [user, loading, onboardingCompleted, inviteSent, isNewUser, isAdmin])

  const fetchPosts = async (cursorParam: string | null = null, append: boolean = false) => {
    try {
      setLoadingPosts(true)
      const url = `/api/posts?limit=10${cursorParam ? `&cursor=${cursorParam}` : ''}`

      const result = await safeApiCall(
        () => fetch(url, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        }),
        'Failed to fetch posts'
      )

      if (result.success && result.data) {
        const responseData = result.data as any
        const newPosts = responseData.data || []

        if (append) {
          setPosts(prev => [...prev, ...newPosts])
        } else {
          setPosts(newPosts)
        }

        const newCursor = responseData.pagination?.nextCursor || null
        setNextCursor(newCursor)
        setHasMore(!!newCursor)
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoadingPosts(false)
    }
  }

  useEffect(() => {
    if (user) {
      // Opportunistically publish any scheduled posts whose time has arrived
      const publishAndRefresh = async () => {
        try {
          const response = await fetch('/api/posts/publish-scheduled', { method: 'POST' })
          const data = await response.json()
          // If any posts were published, refresh the feed
          if (data.success && data.published > 0) {
            console.log(`Published ${data.published} scheduled post(s), refreshing feed...`)
            // Small delay to ensure database is fully updated
            setTimeout(() => {
              fetchPosts(1, false)
            }, 300)
          }
        } catch (error) {
          console.error('Error publishing scheduled posts:', error)
        }
      }

      publishAndRefresh()
      fetchPosts(null, false)

      // Set up interval to check for scheduled posts every 10 seconds (more frequent)
      // Set up interval to check for scheduled posts every 10 minutes (reduced frequency)
      const interval = setInterval(async () => {
        try {
          // Only check if document is visible to prevent background tab spam
          if (document.hidden) return;

          const response = await fetch('/api/posts/publish-scheduled', { method: 'POST' })
          if (response.ok) {
            const data = await response.json()
            // Refresh feed if posts were published
            if (data.success && data.published > 0) {
              // console.log(`Published ${data.published} scheduled post(s), refreshing feed...`)
              setTimeout(() => {
                fetchPosts(null, false)
              }, 300)
            }
          }
        } catch (error) {
          // Silent error to prevent console spam
        }
      }, 600000) // Check every 10 minutes

      // Refresh when user returns to the tab/window (in case they were away when post was published)
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          publishAndRefresh()
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)

      return () => {
        clearInterval(interval)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [user])

  const handlePostCreated = async () => {
    // When a post is created (including scheduled), check if it should be published immediately
    // and refresh the feed
    try {
      // First, try to publish any scheduled posts that are ready
      const publishResponse = await fetch('/api/posts/publish-scheduled', { method: 'POST' })
      const publishData = await publishResponse.json()

      // Always refresh posts after creating a new post
      // If it was scheduled and just got published, it will show up
      // If it was immediate, it will show up
      // If it's still scheduled, it won't show (which is correct)
      await fetchPosts(1, false)

      // If posts were published, refresh again to ensure they appear
      if (publishData.success && publishData.published > 0) {
        // Small delay to ensure database is updated, then refresh
        setTimeout(() => {
          fetchPosts(null, false)
        }, 500)
      }
    } catch (error) {
      // Even if publish check fails, refresh the feed
      fetchPosts(null, false)
    }
  }

  const handleEngagementChange = () => {
    // Refresh posts when engagement changes
    fetchPosts(null, false)
  }

  const handlePostDeleted = () => {
    // Refresh posts when a post is deleted
    fetchPosts(null, false)
  }

  const loadMorePosts = () => {
    if (!loadingPosts && hasMore && nextCursor) {
      fetchPosts(nextCursor, true)
    }
  }

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-3 sm:mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to auth if not authenticated
  if (!user) {
    return null
  }

  // Show loading if new regular user hasn't completed the flow yet
  if (!isAdmin && isNewUser && (!inviteSent || !onboardingCompleted)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-3 sm:mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">Redirecting to complete your setup...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-8 pb-16 sm:pb-20 lg:pb-8">
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-8">
          {/* Left Sidebar - Mobile: Show at top, Desktop: Show on left */}
          {/* Only render on mobile if !isDesktop, but we need to handle hydration carefully. 
              The hook handles hydration by returning false initially. 
              So initially (SSR) isDesktop is false. 
              If we conditional render based on !isDesktop, mobile shows. 
              If based on isDesktop, desktop shows.
              To match current behavior:
              Mobile sidebar is hidden on lg.
              Desktop sidebar is visible on lg.
          */}

          {/* Mobile Sidebar */}
          {!isDesktop && (
            <div className="lg:hidden w-full space-y-3 sm:space-y-4 mb-4 sm:mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <ProfileCard />
                <ChaptersCard />
              </div>
              <SecretGroupsCard />
            </div>
          )}

          {/* Left Sidebar - Desktop */}
          {isDesktop && (
            <div className="hidden lg:block w-64 space-y-4">
              <ProfileCard />
              <ChaptersCard />
              <SecretGroupsCard />
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 lg:max-w-2xl space-y-3 sm:space-y-4 lg:space-y-6">
            {/* Post Creation Card */}
            <PostCard onPostCreated={handlePostCreated} />

            {/* Trending heading */}
            <div className="flex items-center space-x-2 px-1">
              <Sparkles className="w-4 h-4 lg:w-5 lg:h-5 text-foreground flex-shrink-0" />
              <h2 className="text-sm sm:text-base lg:text-lg font-bold text-foreground truncate">
                Trending in Your Network
              </h2>
            </div>

            {/* Feed */}
            <div className="space-y-3 sm:space-y-4 lg:space-y-6">
              {loadingPosts && posts.length === 0 ? (
                <div className="flex justify-center py-6 sm:py-8">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : posts.length === 0 ? (
                <Card className="p-8 text-center space-y-4 border-dashed border-2">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold">Your feed is waiting for you!</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Connect with professionals, join chapters, or follow industry leaders to see their latest updates here.
                  </p>
                  <Button
                    variant="default"
                    onClick={() => document.getElementById('suggested-connections')?.scrollIntoView({ behavior: 'smooth' })}
                    className="mt-4"
                  >
                    Find People to Follow
                  </Button>
                </Card>
              ) : (
                <>
                  {posts.map((post) => (
                    <FeedPost
                      key={post.id}
                      post={post}
                      onPostDeleted={handlePostDeleted}
                    />
                  ))}
                </>
              )}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center pt-3 sm:pt-4 lg:pt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMorePosts}
                  disabled={loadingPosts}
                  className="font-semibold px-4 sm:px-6 lg:px-8 py-2 lg:py-3 hover:bg-accent/50 border-border/50 bg-transparent text-xs sm:text-sm"
                >
                  {loadingPosts ? "Loading..." : "Load More Posts"}
                </Button>
              </div>
            )}
          </div>

          {/* Right Sidebar - Mobile */}
          {!isDesktop && (
            <div className="lg:hidden w-full space-y-3 sm:space-y-4 mt-4 sm:mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <RequestsCard variant="compact" />
                <SuggestedConnectionsCard />
              </div>
              <UpcomingEventsCard />
            </div>
          )}

          {/* Right Sidebar - Desktop */}
          {isDesktop && (
            <div className="hidden lg:block w-64 space-y-4">
              <RequestsCard variant="compact" />
              <SuggestedConnectionsCard />
              <UpcomingEventsCard />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}