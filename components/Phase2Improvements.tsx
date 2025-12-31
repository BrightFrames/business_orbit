"use client"

import * as React from "react"
import { Sparkles, Gift, MessageSquare, Sparkle, Bell, Calendar, Video } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import toast from "react-hot-toast"

export function Phase2Improvements() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 bg-primary text-primary-foreground hover:opacity-90"
          size="icon"
          aria-label="View Phase 2 Improvements"
        >
          <Sparkles className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[calc(85vh-6rem)] overflow-y-auto fixed bottom-24 right-6 left-6 sm:left-auto top-auto translate-x-0 translate-y-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom w-[calc(100%-3rem)] sm:w-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkle className="h-5 w-5 text-foreground" />
            Phase 2 Improvements
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Exciting new features coming soon to enhance your experience!
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Navigator AI */}
          <Card 
            className="border-2 hover:border-foreground/20 transition-colors cursor-pointer"
            onClick={() => {
              toast("This feature is enabled in Phase2/Version2", {
                icon: "✨",
                duration: 3000,
              })
            }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-muted">
                  <Sparkles className="h-6 w-6 text-foreground" />
                </div>
                Navigator AI
              </CardTitle>
              <CardDescription className="text-base">
                Intelligent navigation powered by artificial intelligence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Experience a smarter way to navigate through the platform. Navigator AI will help you discover relevant connections, 
                suggest personalized content, and guide you to the most important features based on your activity and preferences. 
                Get intelligent recommendations and streamline your professional networking journey.
              </p>
            </CardContent>
          </Card>

          {/* Reward System */}
          <Card 
            className="border-2 hover:border-foreground/20 transition-colors cursor-pointer"
            onClick={() => {
              toast("This feature is enabled in Phase2/Version2", {
                icon: "🎁",
                duration: 3000,
              })
            }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-muted">
                  <Gift className="h-6 w-6 text-foreground" />
                </div>
                Reward System
              </CardTitle>
              <CardDescription className="text-base">
                Earn rewards for your engagement and contributions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Unlock a comprehensive reward system that recognizes and rewards your active participation. Earn points, badges, 
                and exclusive perks as you engage with the community, attend events, make meaningful connections, and contribute 
                valuable content. Your dedication to building professional relationships will be rewarded!
              </p>
            </CardContent>
          </Card>

          {/* Personal Messages */}
          <Card 
            className="border-2 hover:border-foreground/20 transition-colors cursor-pointer"
            onClick={() => {
              toast("This feature is enabled in Phase2/Version2", {
                icon: "💬",
                duration: 3000,
              })
            }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-muted">
                  <MessageSquare className="h-6 w-6 text-foreground" />
                </div>
                Personal Messages
              </CardTitle>
              <CardDescription className="text-base">
                Direct, private messaging between members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connect privately with other members through our new personal messaging system. Send direct messages, share files, 
                schedule meetings, and maintain professional relationships in a secure, one-on-one environment. Perfect for 
                follow-ups after events, deeper conversations with connections, and building stronger professional relationships.
              </p>
            </CardContent>
          </Card>

          {/* Notification System */}
          <Card 
            className="border-2 hover:border-foreground/20 transition-colors cursor-pointer"
            onClick={() => {
              toast("This feature is enabled in Phase2/Version2", {
                icon: "🔔",
                duration: 3000,
              })
            }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-muted">
                  <Bell className="h-6 w-6 text-foreground" />
                </div>
                Notification System
              </CardTitle>
              <CardDescription className="text-base">
                Stay informed with real-time updates and alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Never miss important updates with our comprehensive notification system. Receive real-time alerts for new messages, 
                event invitations, connection requests, post engagements, and community activities. Customize your notification 
                preferences to stay informed about what matters most to you. Get notified on your preferred channels and manage 
                your alerts with granular control.
              </p>
            </CardContent>
          </Card>

          {/* Schedule Post */}
          <Card 
            className="border-2 hover:border-foreground/20 transition-colors cursor-pointer"
            onClick={() => {
              toast("This feature is enabled in Phase2/Version2", {
                icon: "📅",
                duration: 3000,
              })
            }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-muted">
                  <Calendar className="h-6 w-6 text-foreground" />
                </div>
                Schedule Post
              </CardTitle>
              <CardDescription className="text-base">
                Plan and schedule your content in advance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Take control of your content strategy with our advanced post scheduling feature. Create posts now and schedule them 
                to be published at the perfect time. Plan your content calendar, maintain consistent engagement, and reach your 
                audience when they're most active. Perfect for busy professionals who want to maintain a strong online presence 
                without being tied to their devices.
              </p>
            </CardContent>
          </Card>

          {/* Consultation */}
          <Card 
            className="border-2 hover:border-foreground/20 transition-colors cursor-pointer"
            onClick={() => {
              toast("This feature is enabled in Phase2/Version2", {
                icon: "📹",
                duration: 3000,
              })
            }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-muted">
                  <Video className="h-6 w-6 text-foreground" />
                </div>
                Consultation
              </CardTitle>
              <CardDescription className="text-base">
                Book and manage professional consultations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connect with industry experts and professionals through our integrated consultation system. Book one-on-one sessions, 
                schedule video calls, and access expert advice tailored to your needs. Whether you're seeking career guidance, 
                business mentorship, or professional development, our consultation platform makes it easy to find and connect with 
                the right experts. Manage your appointments, track your sessions, and build valuable professional relationships.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg border border-border">
          <p className="text-sm text-center text-muted-foreground">
            <strong className="text-foreground">Stay tuned!</strong> These exciting features are currently in development and will be released soon.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

