"use client";

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import toast from "react-hot-toast"
import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Search, Send, MoreVertical, Phone, Video, Info, User, Loader2, MessageSquare } from "lucide-react"
import { io, Socket } from "socket.io-client"
import { format } from "date-fns"
import { useSocket } from "@/contexts/SocketContext"

interface Conversation {
    id: string;
    otherUser: {
        id: number;
        name: string;
        profilePhotoUrl: string | null;
    };
    lastMessage?: {
        content: string;
        createdAt: string;
        senderId: string;
    };
    unreadCount: number;
    updatedAt: string;
}

interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    createdAt: string;
    readAt: string | null;
}

export default function MessagesPage() {
    const { user, loading: authLoading, setUnreadMessageCount, fetchUnreadMessageCount } = useAuth()
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [loadingConversations, setLoadingConversations] = useState(true)
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    const { socket } = useSocket()
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Auth Redirect
    useEffect(() => {
        if (!authLoading && !user) {
            window.location.href = '/product/auth'
        }
    }, [user, authLoading])

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    // Listen for incoming messages on the global socket
    // Listen for incoming messages on the global socket
    useEffect(() => {
        if (!socket || !user) return

        const handleNewMessage = (msg: Message) => {
            console.log("MessagesPage received message:", msg);

            // Check if this message belongs to the currently active conversation
            if (activeConversation && (
                msg.conversationId === activeConversation.id ||
                msg.senderId === String(activeConversation.otherUser.id)
            )) {
                console.log("Message belongs to active conversation, adding to list");
                setMessages(prev => {
                    // Avoid duplicates
                    if (prev.some(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });

                // Scroll to bottom
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }, 100);

                // Mark as read immediately since we are viewing it
                socket.emit('dm:read', { conversationId: msg.conversationId, userId: String(user.id) });
            } else {
                console.log("Message does NOT belong to active conversation");
                toast.success("New message received", { icon: '💬' });
            }

            // Always refresh conversations to update previews and unread counts
            refreshConversations();
        }

        socket.on('receive_message', handleNewMessage);

        return () => {
            socket.off('receive_message', handleNewMessage);
        }
    }, [socket, user, activeConversation]); // Re-bind when activeConversation changes to capture correct ID

    // Fetch Conversations
    const refreshConversations = async () => {
        try {
            const res = await fetch('/api/messages/conversations', { credentials: 'include' })
            const data = await res.json()
            if (data.success) {
                setConversations(data.conversations)
                // Update global navbar unread message count
                const totalUnread = data.conversations.reduce((sum: number, c: Conversation) => sum + c.unreadCount, 0)
                setUnreadMessageCount(totalUnread)
            }
        } catch (e) {
            console.error('Fetch conversations error', e)
        } finally {
            setLoadingConversations(false)
        }
    }

    useEffect(() => {
        if (user) refreshConversations()
    }, [user])

    // Fetch Messages for active conversation
    useEffect(() => {
        if (activeConversation) {
            const fetchMessages = async () => {
                setLoadingMessages(true)
                try {
                    const res = await fetch(`/api/messages/conversations/${activeConversation.id}`, { credentials: 'include' })
                    const data = await res.json()
                    if (data.success) {
                        setMessages(data.messages)
                        // Note: We no longer mark as read just by viewing
                        // Messages will be marked as read when user sends a reply
                    }
                } catch (e) {
                    console.error('Fetch messages error', e)
                } finally {
                    setLoadingMessages(false)
                }
            }
            fetchMessages()
        } else {
            setMessages([])
        }
    }, [activeConversation?.id, user?.id])

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!input.trim() || !activeConversation || !user) return

        const messageContent = input.trim()
        setInput("")

        // Optimistic update
        const tempMsg: Message = {
            id: `tmp-${Date.now()}`,
            conversationId: activeConversation.id,
            senderId: String(user.id),
            content: messageContent,
            createdAt: new Date().toISOString(),
            readAt: null
        }
        setMessages(prev => [...prev, tempMsg])

        // Mark messages as read when replying (since user has clearly seen them)
        if (activeConversation.unreadCount > 0) {
            socket?.emit('dm:read', { conversationId: activeConversation.id, userId: String(user.id) })
            // Update the navbar unread count
            setUnreadMessageCount(prev => Math.max(0, prev - activeConversation.unreadCount))
            // Update local conversation to show 0 unread
            setConversations(prev => prev.map(c =>
                c.id === activeConversation.id ? { ...c, unreadCount: 0 } : c
            ))
            // Update the active conversation reference
            setActiveConversation(prev => prev ? { ...prev, unreadCount: 0 } : null)
        }

        // Try Socket.IO first, fallback to HTTP API
        if (socket?.connected) {
            const payload = {
                conversationId: activeConversation.id,
                content: messageContent,
                recipientId: String(activeConversation.otherUser.id)
            }

            socket.emit('send_message', payload, (ack: any) => {
                if (ack?.ok) {
                    setMessages(prev => prev.map(m => m.id === tempMsg.id ? ack.message : m))
                    refreshConversations()
                } else {
                    // Socket failed, try HTTP fallback
                    sendMessageViaHttp(tempMsg, messageContent)
                }
            })
        } else {
            // Socket not connected, use HTTP API directly
            await sendMessageViaHttp(tempMsg, messageContent)
        }
    }

    const sendMessageViaHttp = async (tempMsg: Message, messageContent: string) => {
        try {
            const res = await fetch('/api/messages/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    conversationId: activeConversation?.id,
                    content: messageContent
                })
            })
            const data = await res.json()
            if (data.success && data.message) {
                setMessages(prev => prev.map(m => m.id === tempMsg.id ? data.message : m))
                refreshConversations()
            } else {
                // Remove optimistic message on failure
                setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
                console.error('Failed to send message:', data.error)
            }
        } catch (error) {
            console.error('HTTP send error:', error)
            // Remove optimistic message on failure
            setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
        }
    }

    const filteredConversations = conversations.filter(c =>
        c.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (authLoading || !user) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navigation />

            <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 flex gap-6 overflow-hidden">
                {/* Sidebar */}
                <Card className="w-80 flex flex-col border-border/50">
                    <div className="p-4 border-b border-border/50">
                        <h2 className="text-xl font-bold mb-4">Messages</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search conversations..."
                                className="pl-9 h-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loadingConversations ? (
                            <div className="p-4 text-center text-muted-foreground">Loading...</div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">No conversations found</div>
                        ) : (
                            filteredConversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => setActiveConversation(conv)}
                                    className={`w-full p-4 flex gap-3 hover:bg-accent/50 transition-colors border-b border-border/50 last:border-0 text-left ${activeConversation?.id === conv.id ? 'bg-accent' : ''
                                        }`}
                                >
                                    <Avatar className="w-12 h-12 border border-border/50">
                                        <AvatarImage src={conv.otherUser.profilePhotoUrl || ""} />
                                        <AvatarFallback>{conv.otherUser.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="font-semibold truncate text-foreground">{conv.otherUser.name}</h3>
                                            <span className="text-[10px] text-muted-foreground shrink-0">
                                                {format(new Date(conv.updatedAt), 'HH:mm')}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <p className={`text-xs truncate flex-1 ${conv.unreadCount > 0 ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                                                {conv.lastMessage?.content || "No messages yet"}
                                            </p>
                                            {conv.unreadCount > 0 && (
                                                <span className="ml-2 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                                                    {conv.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </Card>

                {/* Main Chat Area */}
                <Card className="flex-1 flex flex-col border-border/50 bg-[#F8FAFC]/30">
                    {activeConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-border/50 flex items-center justify-between bg-background">
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-10 h-10 ring-2 ring-background">
                                        <AvatarImage src={activeConversation.otherUser.profilePhotoUrl || ""} />
                                        <AvatarFallback>{activeConversation.otherUser.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-bold text-foreground">{activeConversation.otherUser.name}</h3>
                                        <p className="text-[10px] text-green-500 font-medium">Online</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground"><Phone className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground"><Video className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground"><Info className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground"><MoreVertical className="w-4 h-4" /></Button>
                                </div>
                            </div>

                            {/* Chat Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {loadingMessages ? (
                                    <div className="h-full flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                                    </div>
                                ) : (
                                    <>
                                        {messages.map((msg, i) => {
                                            const isMe = msg.senderId === String(user.id)
                                            const showDate = i === 0 || format(new Date(msg.createdAt), 'PPP') !== format(new Date(messages[i - 1].createdAt), 'PPP')

                                            return (
                                                <div key={msg.id} className="space-y-2">
                                                    {showDate && (
                                                        <div className="flex justify-center my-4">
                                                            <span className="text-[10px] bg-muted/50 px-2 py-1 rounded text-muted-foreground font-medium uppercase tracking-wider">
                                                                {format(new Date(msg.createdAt), 'PPP')}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[70%] group relative ${isMe ? 'text-right' : 'text-left'}`}>
                                                            <div className={`inline-block px-4 py-2.5 rounded-2xl text-sm ${isMe
                                                                ? 'bg-blue-600 text-white shadow-sm rounded-tr-none'
                                                                : 'bg-background border border-border/50 text-foreground shadow-sm rounded-tl-none'
                                                                }`}>
                                                                {msg.content}
                                                            </div>
                                                            <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                                <span className="text-[9px] text-muted-foreground">
                                                                    {format(new Date(msg.createdAt), 'p')}
                                                                </span>
                                                                {isMe && (
                                                                    <span className={`text-[9px] ${msg.readAt ? 'text-blue-500' : 'text-muted-foreground'}`}>
                                                                        {msg.readAt ? 'Seen' : 'Sent'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        <div ref={messagesEndRef} />
                                    </>
                                )}
                            </div>

                            {/* Chat Input */}
                            <div className="p-4 bg-background border-t border-border/50">
                                <form onSubmit={handleSendMessage} className="flex gap-2">
                                    <Input
                                        placeholder="Type a message..."
                                        className="flex-1 bg-accent/30 border-none h-11 focus-visible:ring-1 focus-visible:ring-blue-600"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                    />
                                    <Button type="submit" size="icon" className="h-11 w-11 shrink-0 bg-blue-600 hover:bg-blue-700 shadow-sm" disabled={!input.trim()}>
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#F8FAFC]/30">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                                <MessageSquare className="w-8 h-8 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-2">Select a conversation</h3>
                            <p className="text-muted-foreground max-w-sm">
                                Choose a conversation from the list to start messaging or visit a user profile to start a new chat.
                            </p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    )
}
