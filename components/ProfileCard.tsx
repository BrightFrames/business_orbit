"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { safeApiCall } from '@/lib/utils/api'

interface UserProfile {
  id: number
  name: string
  email: string
  profile_photo_url?: string
  role?: string
  reward_score?: number
  created_at: string
}

interface ProfileCardProps {
  className?: string
}

export default function ProfileCard({ className = "" }: ProfileCardProps) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        setError(null)

        if (user) {
          // Use current user data if available
          setProfile({
            id: user.id,
            name: user.name,
            email: user.email,
            profile_photo_url: user.profilePhotoUrl,
            role: user.profession || 'Professional',
            reward_score: 85, // Default score since it's not in User type
            created_at: user.createdAt || new Date().toISOString()
          })
        } else {
          // Fetch from API if user data not available
          const result = await safeApiCall(
            () => fetch('/api/auth/me', {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              }
            }),
            'Failed to fetch profile'
          )

          if (result.success && result.data && typeof result.data === 'object' && result.data !== null) {
            const data = result.data as any
            setProfile({
              id: data.id,
              name: data.name,
              email: data.email,
              profile_photo_url: data.profile_photo_url,
              role: data.profession || data.role || 'Professional',
              reward_score: data.reward_score || 85,
              created_at: data.created_at || new Date().toISOString()
            })
          } else {
            setError('Failed to load profile')
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
        setError('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user])

  if (loading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-muted rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
              <div className="h-5 bg-muted rounded w-1/3"></div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  if (error || !profile) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="text-center text-sm text-muted-foreground">
          {error || 'Profile not available'}
        </div>
      </Card>
    )
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
          {profile.profile_photo_url ? (
            <img
              src={profile.profile_photo_url}
              alt={profile.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <span className="text-lg font-semibold">
              {profile.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">{profile.name}</h3>
          <p className="text-xs text-muted-foreground">{profile.role}</p>
          <Badge variant="secondary" className="text-xs mt-1">
            Score: {profile.reward_score}
          </Badge>
        </div>
      </div>
    </Card>
  )
}
