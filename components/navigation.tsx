"use client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Search, Home, Compass, Users, Calendar, User, Settings, MessageSquare, Briefcase } from "lucide-react"
import { useState } from "react"
import SearchModal from "@/components/SearchModal"
import Link from "next/link"
import { usePathname } from "next/navigation"
import toast from "react-hot-toast"
import { NotificationsPopover } from "@/components/NotificationsPopover"
import { useAuth } from "@/contexts/AuthContext"

export function Navigation() {
  const { user, unreadMessageCount } = useAuth()
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)

  const tabs = [
    { name: "Feed", href: "/product/feed", icon: Home },
    { name: "Navigator", href: "/product/navigator", icon: Compass },
    { name: "Chapters", href: "/product/chapters", icon: Users },
    { name: "Groups", href: "/product/groups", icon: Users },
    { name: "Consultation", href: "/product/consultations", icon: Briefcase },
    { name: "Events", href: "/product/events", icon: Calendar },
    { name: "Messages", href: "/product/messages", icon: MessageSquare },
    { name: "Profile", href: "/product/profile", icon: User },
  ]

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border shadow-elevated">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left - Logo */}
            <Link href="/product/feed" className="flex items-center group cursor-pointer">
              <div className="w-9 h-9 rounded-full border-2 border-foreground flex items-center justify-center transition-all group-hover:scale-105 group-hover:shadow-soft">
                <div className="w-4 h-4 rounded-full border-2 border-foreground transition-all group-hover:bg-foreground"></div>
              </div>
              <span className="ml-3 text-xl font-bold tracking-tight">Business Orbit</span>
            </Link>

            {/* Center - Navigation Tabs */}
            <div className="hidden md:flex items-center space-x-1 bg-muted/50 rounded-full p-1">
              {tabs.map((tab) => (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={`relative px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 cursor-pointer ${pathname === tab.href
                    ? "bg-background text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    }`}
                >
                  {tab.name}
                  {tab.name === "Messages" && unreadMessageCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold animate-pulse">
                      {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            {/* Right - Search and Actions */}
            <div className="flex items-center space-x-3">
              <Button onClick={() => setSearchOpen(true)} variant="ghost" size="sm" className="hidden sm:flex items-center space-x-2 hover:bg-accent/50 cursor-pointer">
                <Search className="w-4 h-4" />
                <span className="text-sm text-muted-foreground">Search</span>
              </Button>

              <Link href="/product/rewards">
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative group hover:bg-accent/50 cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full border-2 border-foreground flex items-center justify-center transition-all group-hover:scale-105">
                    <div className="w-3 h-3 bg-foreground rounded-full"></div>
                  </div>
                  <span className="ml-2 text-sm font-semibold">{user?.rewardScore || 0}</span>
                </Button>
              </Link>

              <NotificationsPopover />

              <Button
                variant="ghost"
                size="sm"
                className="relative group cursor-pointer hover:bg-accent/50"
                onClick={() => {
                  toast("This feature is enabled in Phase2/Version2", {
                    icon: "⚙️",
                    duration: 3000,
                  })
                }}
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border md:hidden">
        <div className="grid grid-cols-7 h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = pathname === tab.href
            const showBadge = tab.name === "Messages" && unreadMessageCount > 0
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`relative flex flex-col items-center justify-center space-y-1 transition-all duration-200 cursor-pointer ${isActive
                  ? "text-foreground bg-accent/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                  }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? "scale-110" : ""} transition-transform`} />
                  {showBadge && (
                    <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[8px] font-bold">
                      {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium">{tab.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}

