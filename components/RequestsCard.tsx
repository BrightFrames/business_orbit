"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserPlus, Check, X, Clock, Users } from 'lucide-react'
import { safeApiCall } from '@/lib/utils/api'
import { toast } from 'sonner'

interface FollowRequest {
  id: number
  requesterId: number
  requesterName: string
  requesterPhoto?: string
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
}

interface RequestsCardProps {
  className?: string
  variant?: 'full' | 'compact' // Add variant prop to support both layouts
}

export default function RequestsCard({ className = "", variant = 'full' }: RequestsCardProps) {
  const [requests, setRequests] = useState<FollowRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState<Set<number>>(new Set())

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true)
        setError(null)

        const result = await safeApiCall(
          () => fetch('/api/follow-requests?type=received', {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            }
          }),
          'Failed to fetch follow requests'
        )

        if (result.success && result.data && typeof result.data === 'object' && result.data !== null) {
          const data = result.data as any
          if (data.success && Array.isArray(data.requests)) {
            setRequests(data.requests)
          } else {
            setError('Failed to load follow requests')
          }
        } else {
          setError('Failed to load follow requests')
        }
      } catch (error) {
        console.error('Error fetching follow requests:', error)
        setError('Failed to load follow requests')
      } finally {
        setLoading(false)
      }
    }

    fetchRequests()
  }, [])

  const handleRequestAction = async (requestId: number, action: 'accept' | 'decline', requesterName: string) => {
    try {
      setProcessing(prev => new Set(prev).add(requestId))
      
      const result = await safeApiCall(
        () => fetch(`/api/follow-requests/${requestId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ action })
        }),
        `Failed to ${action} follow request`
      )
      
      if (result.success) {
        // Remove the request from the list
        setRequests(prev => prev.filter(req => req.id !== requestId))
        toast.success(`Follow request ${action === 'accept' ? 'accepted' : 'declined'} successfully`)
      } else {
        toast.error(result.error || `Failed to ${action} follow request`)
      }
    } catch (error) {
      console.error(`Error ${action}ing follow request:`, error)
      toast.error(`Failed to ${action} follow request`)
    } finally {
      setProcessing(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  const formatRequestDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) {
      return 'yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  if (loading) {
    return (
      <Card className={`${variant === 'compact' ? 'p-4' : 'p-6'} ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h3 className={`${variant === 'compact' ? 'text-sm' : 'text-lg'} font-semibold`}>Requests</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-3">
                <div className={`${variant === 'compact' ? 'w-8 h-8' : 'w-10 h-10'} bg-muted rounded-full`}></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`${variant === 'compact' ? 'p-4' : 'p-6'} ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h3 className={`${variant === 'compact' ? 'text-sm' : 'text-lg'} font-semibold`}>Requests</h3>
        </div>
        <div className="text-center py-8">
          <div className="text-destructive text-sm">{error}</div>
          {variant === 'full' && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 cursor-pointer"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          )}
        </div>
      </Card>
    )
  }

  return (
    <Card className={`${variant === 'compact' ? 'p-4' : 'p-6'} ${className}`}>
      <div className="flex items-center space-x-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h3 className={`${variant === 'compact' ? 'text-sm' : 'text-lg'} font-semibold`}>Requests</h3>
        {requests.length > 0 && (
          <Badge variant="secondary" className="ml-2">
            {requests.length}
          </Badge>
        )}
      </div>
      
      {requests.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">No pending follow requests</p>
          {variant === 'full' && (
            <p className="text-xs text-muted-foreground mt-1">
              When someone sends you a follow request, it will appear here
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {requests.map((request) => (
            <div key={request.id} className={`${variant === 'compact' ? 'p-2' : 'p-3'} rounded-lg hover:bg-muted/50 transition-colors border border-border/50`}>
              <div className="flex items-start space-x-3">
                <div className="relative">
                  {request.requesterPhoto ? (
                    <img
                      src={request.requesterPhoto}
                      alt={request.requesterName}
                      className={`${variant === 'compact' ? 'w-8 h-8' : 'w-10 h-10'} rounded-full object-cover border-2 border-background`}
                    />
                  ) : (
                    <div className={`${variant === 'compact' ? 'w-8 h-8' : 'w-10 h-10'} bg-gradient-to-br from-primary/20 to-primary/40 rounded-full flex items-center justify-center text-sm font-semibold text-primary border-2 border-background`}>
                      {request.requesterName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-sm">{request.requesterName}</h4>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {formatRequestDate(request.createdAt)}
                      </span>
                    </div>
                  </div>
                  
                  {variant === 'full' && (
                    <p className="text-xs text-muted-foreground mb-3">
                      Wants to follow you
                    </p>
                  )}
                  
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => handleRequestAction(request.id, 'accept', request.requesterName)}
                      disabled={processing.has(request.id)}
                      className={`${variant === 'compact' ? 'h-6 px-2' : 'h-7 px-3'} text-xs bg-black hover:bg-gray-800 text-white cursor-pointer`}
                    >
                      {processing.has(request.id) ? (
                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Accept
                        </>
                      )}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRequestAction(request.id, 'decline', request.requesterName)}
                      disabled={processing.has(request.id)}
                      className={`${variant === 'compact' ? 'h-6 px-2' : 'h-7 px-3'} text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground cursor-pointer`}
                    >
                      <X className="w-3 h-3 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
