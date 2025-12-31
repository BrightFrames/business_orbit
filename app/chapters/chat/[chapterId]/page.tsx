"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Paperclip, Send, Smile } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type ChatMessage = {
  id: string;
  chapterId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string | null;
  content: string;
  timestamp: string; // ISO string
};

// Configure this with your deployed WebSocket server URL
const CHAT_HTTP_URL = process.env.NEXT_PUBLIC_CHAT_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000')
const CHAT_WS_URL = CHAT_HTTP_URL.replace(/^http/, 'ws')

export default function ChapterChatPage(): React.JSX.Element {
  const params = useParams<{ chapterId: string }>();
  const chapterId = useMemo(() => String(params.chapterId), [params.chapterId]);
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>("");
  const [connecting, setConnecting] = useState<boolean>(true);
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Fetch initial history
  useEffect(() => {
    let cancelled = false;
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/chat/${chapterId}/messages`, { credentials: "include" });
        if (!res.ok) throw new Error(`Failed to load messages: ${res.status}`);
        const data = (await res.json()) as { success: boolean; messages: ChatMessage[] };
        if (!cancelled && data?.success) {
          setMessages(data.messages);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Chat history load error", e);
      }
    }
    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  // Init websocket connection and subscriptions
  useEffect(() => {
    const socket = io(CHAT_WS_URL, {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
    });
    socketRef.current = socket;
    setConnecting(true);

    socket.on("connect", () => {
      setConnecting(false);
      socket.emit("joinRoom", { chapterId });
    });

    socket.on("disconnect", () => {
      setConnecting(true);
    });

    socket.on("newMessage", (msg: ChatMessage) => {
      if (msg.chapterId === chapterId) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => {
      socket.off("newMessage");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [chapterId]);

  // Emit new message
  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || !user?.id) return;
    const optimistic: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      chapterId,
      senderId: String(user.id),
      senderName: user.name || "You",
      senderAvatarUrl: (user as any)?.avatar_url || null,
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
    setInput("");

    try {
      socketRef.current?.emit("sendMessage", optimistic);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("sendMessage error", e);
    }
  };

  const isOwn = (m: ChatMessage) => String(m.senderId) === String(user?.id || "");

  // Left column chat UI only - right sidebar in existing layout remains intact on parent page
  return (
    <div className="flex w-full">
      {/* Left 70%: Chat interface */}
      <div className="w-full lg:w-[70%] pr-0 lg:pr-6">
        <Card className="h-[calc(100vh-120px)] flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="font-semibold">Chapter Chat</div>
            <div className="text-xs text-muted-foreground">
              {connecting ? "Connecting..." : "Live"}
            </div>
          </div>

          {/* Messages list */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-muted/20"
          >
            {messages.map((m) => (
              <div key={m.id} className={`flex ${isOwn(m) ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] flex items-end gap-2 ${isOwn(m) ? "flex-row-reverse" : "flex-row"}`}>
                  {/* Avatar */}
                  <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-xs font-semibold">
                    {m.senderAvatarUrl ? (
                      <Image src={m.senderAvatarUrl} alt={m.senderName} width={32} height={32} />
                    ) : (
                      <span>{m.senderName?.slice(0, 2)?.toUpperCase()}</span>
                    )}
                  </div>
                  {/* Bubble */}
                  <div className={`rounded-2xl px-3 py-2 shadow-sm ${isOwn(m) ? "bg-primary text-primary-foreground" : "bg-white"}`}>
                    <div className="text-[11px] opacity-80 mb-0.5">
                      {isOwn(m) ? "You" : m.senderName}
                    </div>
                    <div className="whitespace-pre-wrap break-words text-sm">{m.content}</div>
                    <div className="text-[10px] opacity-70 mt-1 text-right">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Composer */}
          <div className="border-t p-3">
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="icon" className="shrink-0">
                <Smile className="h-5 w-5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="shrink-0">
                <Paperclip className="h-5 w-5" />
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Write a message..."
                className="flex-1"
              />
              <Button type="button" onClick={sendMessage} disabled={!input.trim()} className="shrink-0">
                <Send className="h-4 w-4 mr-1" />
                Send
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Note: The right fixed sidebar (members, events, contributors) stays as-is in your existing page layout. */}
    </div>
  );
}


