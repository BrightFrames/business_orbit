"use client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Home, Briefcase, Calendar as CalendarIcon, Users, MessageSquare, Settings, Crown, User, LogOut, Compass, Search } from 'lucide-react'
import { useState, useRef, useEffect } from "react"
import SearchModal from "@/components/SearchModal"
import Link from "next/link"
import { usePathname } from "next/navigation"
import toast from "react-hot-toast"
import { NotificationsPopover } from "@/components/NotificationsPopover"
import { useAuth } from "@/contexts/AuthContext"

export function Navigation() {
  const { user, unreadMessageCount, logout } = useAuth()
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  // Click outside handler for settings menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleUpgrade = async () => {
    try {
      const res = await fetch('/api/payments/phonepe/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: 'premium',
          amount: 999
        })
      })

      const data = await res.json()
      if (data.success && data.redirectUrl) {
        toast.success("Redirecting to payment...")
        window.location.href = data.redirectUrl
      } else {
        console.error("Payment initiation failed:", data);
        const errorMessage = typeof data.details === 'object'
          ? JSON.stringify(data.details)
          : (data.details || data.error || "Failed to initiate payment");
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Upgrade error:", error)
      toast.error("Something went wrong. Check console.")
    }
  }

  const tabs = [
    { name: "Feed", href: "/product/feed", icon: Home },
    { name: "Navigator", href: "/product/navigator", icon: Compass },
    { name: "Chapters", href: "/product/chapters", icon: Users },
    { name: "Groups", href: "/product/groups", icon: Users },
    { name: "Consultation", href: "/product/consultations", icon: Briefcase },
    { name: "Events", href: "/product/events", icon: CalendarIcon },
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
            <a href="/product/feed" className="flex items-center group cursor-pointer">
              <div className="relative w-10 h-10 transition-transform group-hover:scale-105">
                <img
                  src="/favicon.jpg"
                  alt="Business Orbit"
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
              <span className="ml-3 text-xl font-bold tracking-tight">Business Orbit</span>
            </a>

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
                  className="relative group hover:bg-accent/50 cursor-pointer text-muted-foreground"
                >
                  <div className="w-7 h-7 rounded-full border-2 border-muted-foreground flex items-center justify-center transition-all group-hover:scale-105">
                    <span className="font-bold text-[10px]">OP</span>
                  </div>
                  <span className="ml-2 text-sm font-semibold">{user?.rewardScore || 0}</span>
                </Button>
              </Link>

              <Button
                size="sm"
                onClick={handleUpgrade}
                className="hidden sm:flex bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 shadow-md group transition-all duration-300 hover:shadow-lg hover:scale-105"
              >
                <Crown className="w-4 h-4 mr-2 fill-current" />
                <span className="font-semibold">Upgrade</span>
              </Button>

              <NotificationsPopover />

              <div className="relative" ref={settingsRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`relative group cursor-pointer hover:bg-accent/50 ${settingsOpen ? 'bg-accent/50' : ''}`}
                  onClick={() => setSettingsOpen(!settingsOpen)}
                >
                  <Settings className={`w-5 h-5 transition-transform duration-300 ${settingsOpen ? 'rotate-90' : 'group-hover:rotate-45'}`} />
                </Button>

                {settingsOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-background border rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                    <div className="p-3 border-b bg-muted/30">
                      <p className="font-semibold text-sm truncate">{user?.name || 'User'}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    <div className="p-1">
                      <Link href="/product/profile" onClick={() => setSettingsOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-sm font-normal mb-1">
                          <User className="w-4 h-4 mr-2 text-muted-foreground" />
                          Profile
                        </Button>
                      </Link>
                      <Link href="/product/settings" onClick={() => setSettingsOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-sm font-normal mb-1">
                          <Settings className="w-4 h-4 mr-2 text-muted-foreground" />
                          Settings
                        </Button>
                      </Link>
                      <Link href="/product/consultations/my" onClick={() => setSettingsOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-sm font-normal mb-1">
                          <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                          My Bookings
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-sm font-normal mb-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={handleUpgrade}>
                        <Crown className="w-4 h-4 mr-2" />
                        Upgrade to Premium
                      </Button>
                      <div className="h-px bg-border my-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-sm font-normal text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={() => {
                          setSettingsOpen(false)
                          logout()
                        }}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Log out
                      </Button>
                    </div>
                  </div>
                )}
              </div>
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

