"use client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Search, Home, Compass, Users, Calendar, User, Settings } from "lucide-react"
import { useState } from "react"
import SearchModal from "@/components/SearchModal"
import Link from "next/link"
import { usePathname } from "next/navigation"
import toast from "react-hot-toast"

export function Navigation() {
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)

  const tabs = [
    { name: "Feed", href: "/product/feed", icon: Home },
    { name: "Navigator", href: "/product/navigator", icon: Compass, isPhase2: true },
    { name: "Chapters", href: "/product/chapters", icon: Users },
    { name: "Groups", href: "/product/groups", icon: Users },
    { name: "Events", href: "/product/events", icon: Calendar },
    { name: "Profile", href: "/product/profile", icon: User },
  ]

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border shadow-elevated">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left - Logo */}
            <div 
              className="flex items-center group cursor-pointer"
              onClick={(e) => {
                e.preventDefault()
                toast("This feature is enabled in Phase2/Version2", {
                  icon: "🚀",
                  duration: 3000,
                })
              }}
            >
              <div className="w-9 h-9 rounded-full border-2 border-foreground flex items-center justify-center transition-all group-hover:scale-105 group-hover:shadow-soft">
                <div className="w-4 h-4 rounded-full border-2 border-foreground transition-all group-hover:bg-foreground"></div>
              </div>
              <span className="ml-3 text-xl font-bold tracking-tight">Business Orbit</span>
            </div>

            {/* Center - Navigation Tabs */}
            <div className="hidden md:flex items-center space-x-1 bg-muted/50 rounded-full p-1">
              {tabs.map((tab) => (
                <Link
                  key={tab.name}
                  href={tab.href}
                  onClick={(e) => {
                    if (tab.isPhase2) {
                      e.preventDefault()
                      toast("This feature is enabled in Phase2/Version2", {
                        icon: "🧭",
                        duration: 3000,
                      })
                    }
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 cursor-pointer ${
                    pathname === tab.href
                      ? "bg-background text-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  }`}
                >
                  {tab.name}
                </Link>
              ))}
            </div>

            {/* Right - Search and Actions */}
            <div className="flex items-center space-x-3">
              <Button onClick={() => setSearchOpen(true)} variant="ghost" size="sm" className="hidden sm:flex items-center space-x-2 hover:bg-accent/50 cursor-pointer">
                <Search className="w-4 h-4" />
                <span className="text-sm text-muted-foreground">Search</span>
              </Button>

              <Button 
                variant="ghost" 
                size="sm" 
                className="relative group hover:bg-accent/50 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault()
                  toast("This feature is enabled in Phase2/Version2", {
                    icon: "🔔",
                    duration: 3000,
                  })
                }}
              >
                <div className="w-7 h-7 rounded-full border-2 border-foreground flex items-center justify-center transition-all group-hover:scale-105">
                  <div className="w-3 h-3 bg-foreground rounded-full"></div>
                </div>
                <span className="ml-2 text-sm font-semibold">85</span>
              </Button>

              <Button 
                variant="ghost" 
                size="sm" 
                className="relative group hover:bg-accent/50 cursor-pointer"
                onClick={() => {
                  toast("This feature is enabled in Phase2/Version2", {
                    icon: "🔔",
                    duration: 3000,
                  })
                }}
              >
                <Bell className="w-5 h-5 transition-all group-hover:scale-105" />
                <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-foreground text-background text-xs font-bold animate-pulse">
                  3
                </Badge>
              </Button>

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
        <div className="grid grid-cols-6 h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = pathname === tab.href
            return (
              <Link
                key={tab.name}
                href={tab.href}
                onClick={(e) => {
                  if (tab.isPhase2) {
                    e.preventDefault()
                    toast("This feature is enabled in Phase2/Version2", {
                      icon: "🧭",
                      duration: 3000,
                    })
                  }
                }}
                className={`flex flex-col items-center justify-center space-y-1 transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "text-foreground bg-accent/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "scale-110" : ""} transition-transform`} />
                <span className="text-xs font-medium">{tab.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
