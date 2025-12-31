"use client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Calendar, Users, Settings, Menu, X, LayoutDashboard, MapPinned, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const adminTabs = [
    { name: "Dashboard", href: "/product/admin", icon: LayoutDashboard },
    { name: "Chapters", href: "/product/admin/chapters", icon: MapPinned },
    { name: "Groups", href: "/product/admin/groups", icon: Users },
    { name: "Chat Management", href: "/product/admin/chat", icon: MessageSquare },
    { name: "Event Management", href: "/product/admin/events", icon: Calendar },
    { name: "Review Members", href: "/product/admin/members", icon: Users },
    { name: "Platform Settings", href: "/product/admin/settings", icon: Settings },
  ]

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const response = await fetch('/api/admin/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      
      if (response.ok) {
        // Redirect to product auth page
        router.push('/product/auth')
      } else {
        // Still redirect even if logout API fails
        router.push('/product/auth')
      }
    } catch {
      // Still redirect even if logout API fails
      router.push('/product/auth')
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-3 left-3 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-background/95 backdrop-blur-sm cursor-pointer shadow-lg border-2 h-9 w-9 p-0"
        >
          {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40 cursor-pointer"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-background border-r border-border z-50 transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <Link href="/product/admin" className="flex items-center group cursor-pointer">
              <div className="w-9 h-9 rounded-full border-2 border-foreground flex items-center justify-center transition-all group-hover:scale-105 group-hover:shadow-soft">
                <div className="w-4 h-4 rounded-full border-2 border-foreground transition-all group-hover:bg-foreground"></div>
              </div>
              <span className="ml-3 text-xl font-bold tracking-tight">Business Orbit Admin</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {adminTabs.map((tab) => {
                const Icon = tab.icon
                const isActive = pathname === tab.href
                return (
                  <Link
                    key={tab.name}
                    href={tab.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`
                      flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group cursor-pointer
                      ${isActive 
                        ? 'bg-primary text-primary-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} />
                    <span className="font-medium">{tab.name}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 bg-primary-foreground rounded-full"></div>
                    )}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="px-4 pt-6 pb-4 border-t border-border space-y-4">
            <Link href="/" className="cursor-pointer">
              <Button variant="outline" className="w-full mb-6 justify-start cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Back to Main App
              </Button>
            </Link>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="w-full justify-start cursor-pointer"
                  disabled={isLoggingOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {isLoggingOut ? 'Logging out...' : 'Log Out'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to log out? You will need to sign in again to access the admin panel.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout} disabled={isLoggingOut}>
                    {isLoggingOut ? 'Logging out...' : 'Yes, Log Out'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </aside>
    </>
  )
}

