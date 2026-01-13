"use client"

import { useEffect, useState } from "react"
import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  MessageSquare,
  Users,
  Calendar,
  Heart,
  TrendingUp,
  DollarSign,
  Search,
  Award,
  Target,
  Activity,
  Loader2,
} from "lucide-react"

interface RewardData {
  currentScore: number
  nextMilestone: number
  level: string
  rank: string
  breakdown: {
    activity: {
      score: number
      maxScore: number
      details: {
        totalEvents: number
      }
    }
    reliability: {
      score: number
      maxScore: number
      details: {
        totalLogins: number
      }
    }
    thankYouNotes: {
      score: number
      maxScore: number
      details: {
        received: { count: number; points: number }
      }
    }
  }
  recentActivity: Array<{
    type: string
    description: string
    points: number
    date: string
  }>
}

const CircularProgress = ({ value, max, size = 200 }: { value: number; max: number; size?: number }) => {
  const percentage = Math.min((value / max) * 100, 100)
  const circumference = 2 * Math.PI * (size / 2 - 10)
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 10}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 10}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="text-foreground transition-all duration-500"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-bold">{value}</div>
          <div className="text-sm text-muted-foreground">Score</div>
        </div>
      </div>
    </div>
  )
}

export default function RewardsPage() {
  const [data, setData] = useState<RewardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/rewards/summary')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setData(json.data)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Reward Dashboard</h1>
          <p className="text-muted-foreground">Track your networking impact and reputation growth</p>
        </div>

        {/* Main Score Display */}
        <Card className="p-8 mb-8">
          <div className="flex flex-col lg:flex-row items-center justify-between">
            <div className="flex flex-col lg:flex-row items-center space-y-6 lg:space-y-0 lg:space-x-8">
              <CircularProgress value={data.currentScore} max={data.nextMilestone} />
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start space-x-2 mb-2">
                  <Badge className="text-lg px-3 py-1">{data.level}</Badge>
                  <Badge variant="outline">{data.rank}</Badge>
                </div>
                <h2 className="text-2xl font-bold mb-1">Reward Score: {data.currentScore}</h2>
                <p className="text-muted-foreground mb-4">
                  {data.nextMilestone - data.currentScore} points to next milestone
                </p>
                <Progress value={(data.currentScore / data.nextMilestone) * 100} className="w-64 h-2" />
              </div>
            </div>
            <div className="mt-6 lg:mt-0">
              <Button variant="outline" className="bg-transparent">
                <Target className="w-4 h-4 mr-2" />
                View Goals
              </Button>
            </div>
          </div>
        </Card>

        {/* Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Activity Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Activity
              </h3>
              <Badge variant="secondary">
                {data.breakdown.activity.score}/{data.breakdown.activity.maxScore}
              </Badge>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Actions</span>
                <span>{data.breakdown.activity.details.totalEvents}</span>
              </div>
              <Progress
                value={(data.breakdown.activity.score / data.breakdown.activity.maxScore) * 100}
                className="h-2 mt-4"
              />
            </div>
          </Card>

          {/* Reliability Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Reliability
              </h3>
              <Badge variant="secondary">
                {data.breakdown.reliability.score}/{data.breakdown.reliability.maxScore}
              </Badge>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Daily Logins</span>
                <span>{data.breakdown.reliability.details.totalLogins}</span>
              </div>
              <Progress
                value={(data.breakdown.reliability.score / data.breakdown.reliability.maxScore) * 100}
                className="h-2 mt-4"
              />
            </div>
          </Card>

          {/* Thank You Notes Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center">
                <Heart className="w-5 h-5 mr-2" />
                Thank You Notes
              </h3>
              <Badge variant="secondary">
                {data.breakdown.thankYouNotes.score}/{data.breakdown.thankYouNotes.maxScore}
              </Badge>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Received</span>
                <span>
                  {data.breakdown.thankYouNotes.details.received.count} (
                  {data.breakdown.thankYouNotes.details.received.points}pts)
                </span>
              </div>
              <Progress
                value={(data.breakdown.thankYouNotes.score / data.breakdown.thankYouNotes.maxScore) * 100}
                className="h-2 mt-4"
              />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Impact Section - Keeping static as per backend mock */}
          <Card className="p-6">
            <h3 className="font-semibold mb-6 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Score Impact
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Search className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Navigator Ranking</p>
                    <p className="text-sm text-muted-foreground">Your position in AI search results</p>
                  </div>
                </div>
                <Badge className="text-lg px-3 py-1">#{data.rank}</Badge>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <DollarSign className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Consultation Rate</p>
                    <p className="text-sm text-muted-foreground">Auto-calculated hourly rate</p>
                  </div>
                </div>
                <Badge className="text-lg px-3 py-1">$125/hr</Badge>
              </div>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="p-6">
            <h3 className="font-semibold mb-6 flex items-center">
              <Award className="w-5 h-5 mr-2" />
              Recent Activity
            </h3>
            <div className="space-y-4">
              {data.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">No recent activity</p>
              ) : (
                data.recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/20 transition-colors"
                  >
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center mt-1">
                      <Award className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">{activity.date}</span>
                        <Badge variant="outline" className="text-xs">
                          +{activity.points} pts
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
