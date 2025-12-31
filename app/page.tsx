"use client";

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import LandingPage from "@/components/LandingPage"

export default function HomePage() {
  const { user, loading } = useAuth()
  const [shouldRedirect, setShouldRedirect] = useState(false)

  useEffect(() => {
    // Only redirect if user is actually authenticated and not loading
    if (!loading && user && user.id) {
      setShouldRedirect(true)
      // Small delay to prevent flash
      setTimeout(() => {
        window.location.href = '/product/feed';
      }, 100)
    }
  }, [user, loading])

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show loading if about to redirect
  if (shouldRedirect) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  // Always show landing page for unauthenticated users
  return <LandingPage />
}
