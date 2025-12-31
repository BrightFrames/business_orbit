"use client"

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
} from "lucide-react"

const rewardData = {
  currentScore: 85,
  nextMilestone: 90,
  level: "Expert",
  rank: "Top 15%",
  breakdown: {
    activity: {
      score: 28,
      maxScore: 35,
      details: {
        posts: { count: 12, points: 12 },
        comments: { count: 24, points: 8 },
        groupParticipation: { count: 8, points: 8 },
      },
    },
    reliability: {
      score: 32,
      maxScore: 35,
      details: {
        callsAttended: { count: 18, total: 20, points: 18 },
        eventsHosted: { count: 3, points: 9 },
        punctuality: { rate: 95, points: 5 },
      },
    },
    thankYouNotes: {
      score: 25,
      maxScore: 30,
      details: {
        received: { count: 15, points: 15 },
        quality: { rating: 4.8, points: 10 },
      },
    },
  },
  impact: {
    navigatorRanking: 8,
    consultationRate: 125,
    connectionRequests: 23,
    profileViews: 156,
  },
  recentActivity: [
    { type: "thank_you", description: "Received thank you note from Sarah Chen", points: 2, date: "2h ago" },
    { type: "post", description: "Published post about AI in product development", points: 1, date: "1d ago" },
    { type: "event", description: "Hosted React workshop", points: 3, date: "3d ago" },
    { type: "call", description: "Attended consultation call", points: 1, date: "5d ago" },
  ],
}

const CircularProgress = ({ value, max, size = 200 }: { value: number; max: number; size?: number }) => {
  const percentage = (value / max) * 100
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
              <CircularProgress value={rewardData.currentScore} max={100} />
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start space-x-2 mb-2">
                  <Badge className="text-lg px-3 py-1">{rewardData.level}</Badge>
                  <Badge variant="outline">{rewardData.rank}</Badge>
                </div>
                <h2 className="text-2xl font-bold mb-1">Reward Score: {rewardData.currentScore}</h2>
                <p className="text-muted-foreground mb-4">
                  {rewardData.nextMilestone - rewardData.currentScore} points to next milestone
                </p>
                <Progress value={(rewardData.currentScore / rewardData.nextMilestone) * 100} className="w-64 h-2" />
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
                {rewardData.breakdown.activity.score}/{rewardData.breakdown.activity.maxScore}
              </Badge>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Posts</span>
                <span>
                  {rewardData.breakdown.activity.details.posts.count} (
                  {rewardData.breakdown.activity.details.posts.points}pts)
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Comments</span>
                <span>
                  {rewardData.breakdown.activity.details.comments.count} (
                  {rewardData.breakdown.activity.details.comments.points}pts)
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Group Participation</span>
                <span>
                  {rewardData.breakdown.activity.details.groupParticipation.count} (
                  {rewardData.breakdown.activity.details.groupParticipation.points}pts)
                </span>
              </div>
              <Progress
                value={(rewardData.breakdown.activity.score / rewardData.breakdown.activity.maxScore) * 100}
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
                {rewardData.breakdown.reliability.score}/{rewardData.breakdown.reliability.maxScore}
              </Badge>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Calls Attended</span>
                <span>
                  {rewardData.breakdown.reliability.details.callsAttended.count}/
                  {rewardData.breakdown.reliability.details.callsAttended.total} (
                  {rewardData.breakdown.reliability.details.callsAttended.points}pts)
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Events Hosted</span>
                <span>
                  {rewardData.breakdown.reliability.details.eventsHosted.count} (
                  {rewardData.breakdown.reliability.details.eventsHosted.points}pts)
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Punctuality</span>
                <span>
                  {rewardData.breakdown.reliability.details.punctuality.rate}% (
                  {rewardData.breakdown.reliability.details.punctuality.points}pts)
                </span>
              </div>
              <Progress
                value={(rewardData.breakdown.reliability.score / rewardData.breakdown.reliability.maxScore) * 100}
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
                {rewardData.breakdown.thankYouNotes.score}/{rewardData.breakdown.thankYouNotes.maxScore}
              </Badge>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Notes Received</span>
                <span>
                  {rewardData.breakdown.thankYouNotes.details.received.count} (
                  {rewardData.breakdown.thankYouNotes.details.received.points}pts)
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quality Rating</span>
                <span>
                  {rewardData.breakdown.thankYouNotes.details.quality.rating}/5 (
                  {rewardData.breakdown.thankYouNotes.details.quality.points}pts)
                </span>
              </div>
              <Progress
                value={(rewardData.breakdown.thankYouNotes.score / rewardData.breakdown.thankYouNotes.maxScore) * 100}
                className="h-2 mt-4"
              />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Impact Section */}
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
                <Badge className="text-lg px-3 py-1">#{rewardData.impact.navigatorRanking}</Badge>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <DollarSign className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Consultation Rate</p>
                    <p className="text-sm text-muted-foreground">Auto-calculated hourly rate</p>
                  </div>
                </div>
                <Badge className="text-lg px-3 py-1">${rewardData.impact.consultationRate}/hr</Badge>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Connection Requests</p>
                    <p className="text-sm text-muted-foreground">This month</p>
                  </div>
                </div>
                <Badge className="text-lg px-3 py-1">{rewardData.impact.connectionRequests}</Badge>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Activity className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Profile Views</p>
                    <p className="text-sm text-muted-foreground">This month</p>
                  </div>
                </div>
                <Badge className="text-lg px-3 py-1">{rewardData.impact.profileViews}</Badge>
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
              {rewardData.recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/20 transition-colors"
                >
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center mt-1">
                    {activity.type === "thank_you" && <Heart className="w-4 h-4" />}
                    {activity.type === "post" && <MessageSquare className="w-4 h-4" />}
                    {activity.type === "event" && <Calendar className="w-4 h-4" />}
                    {activity.type === "call" && <Users className="w-4 h-4" />}
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
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4 bg-transparent">
              View All Activity
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
