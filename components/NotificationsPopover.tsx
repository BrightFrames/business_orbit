"use client"
import { useState, useEffect, useRef } from "react"
import { Bell, UserPlus, Heart, MessageSquare, Users, Info, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

interface Notification {
    id: number
    type: string
    title: string
    message: string
    link?: string
    is_read: boolean
    created_at: string
}

export function NotificationsPopover() {
    const { notifications, unreadCount, fetchNotifications, setNotifications, setUnreadCount } = useAuth()
    const [open, setOpen] = useState(false)
    const popoverRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    // Poll for notifications every 60 seconds using Context to sync state
    useEffect(() => {
        const interval = setInterval(fetchNotifications, 60000)

        // Click outside handler
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)

        return () => {
            clearInterval(interval)
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    const markAsRead = async (id: number, link?: string) => {
        try {
            // Optimistic update
            setNotifications(prev => prev.map(n =>
                n.id === id ? { ...n, is_read: true } : n
            ))
            setUnreadCount(prev => Math.max(0, prev - 1))

            await fetch(`/api/notifications/${id}`, {
                method: 'PATCH',
                credentials: 'include'
            })

            if (link) {
                setOpen(false)
                router.push(link)
            }
        } catch (error) {
            console.error('Failed to mark as read', error)
        }
    }

    const markAllAsRead = async () => {
        try {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
            setUnreadCount(0)

            await fetch(`/api/notifications/mark-all-read`, {
                method: 'PATCH',
                credentials: 'include'
            })
        } catch (error) {
            console.error('Failed to mark all as read', error)
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'connection_request': return <UserPlus className="h-4 w-4 text-blue-500" />
            case 'post_like': return <Heart className="h-4 w-4 text-red-500" />
            case 'post_comment': return <MessageSquare className="h-4 w-4 text-green-500" />
            case 'group_invite': return <Users className="h-4 w-4 text-purple-500" />
            default: return <Info className="h-4 w-4 text-gray-500" />
        }
    }

    return (
        <div className="relative" ref={popoverRef}>
            <Button
                variant="ghost"
                size="sm"
                className="relative group hover:bg-accent/50 cursor-pointer"
                onClick={() => setOpen(!open)}
            >
                <Bell className="w-5 h-5 transition-all group-hover:scale-105" />
                {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-600 text-white text-xs font-bold animate-pulse">
                        {unreadCount}
                    </Badge>
                )}
            </Button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 bg-background border rounded-lg shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="flex items-center justify-between p-4 border-b">
                        <h4 className="font-semibold text-sm">Notifications</h4>
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-auto p-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
                                onClick={markAllAsRead}
                            >
                                Mark all as read
                            </Button>
                        )}
                    </div>
                    <div className="h-[300px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
                                <Bell className="h-8 w-8 mb-2 opacity-20" />
                                <p className="text-sm">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {notifications.map((notification) => (
                                    <button
                                        key={notification.id}
                                        className={`flex items-start gap-3 p-4 text-left hover:bg-muted/50 transition-colors border-b last:border-0 ${!notification.is_read ? 'bg-muted/20' : ''
                                            }`}
                                        onClick={() => markAsRead(notification.id, notification.link)}
                                    >
                                        <div className={`mt-1 p-1.5 rounded-full bg-background border shadow-sm shrink-0`}>
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className={`text-sm ${!notification.is_read ? 'font-medium' : 'text-muted-foreground'}`}>
                                                {notification.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground pt-1">
                                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                        {!notification.is_read && (
                                            <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
