'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, fetchUnreadMessageCount } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const pathname = usePathname();

    // URL configuration
    const CHAT_HTTP_URL = process.env.NEXT_PUBLIC_CHAT_SOCKET_URL || 'http://localhost:4000';
    const CHAT_WS_URL = CHAT_HTTP_URL.replace(/^http/, 'ws');

    useEffect(() => {
        if (!user) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
                setIsConnected(false);
            }
            return;
        }

        // Determine if we should connect
        // We should connect if the user is authenticated, regardless of the page,
        // so they can receive notifications.

        if (!socket) {
            const s = io(CHAT_WS_URL, {
                withCredentials: true,
                transports: ['polling', 'websocket'],
                autoConnect: true,
            });

            s.on('connect', () => {
                console.log('Socket connected globally:', s.id);
                setIsConnected(true);
                // Join the user's private room
                s.emit('dm:join', { userId: String(user.id) });
            });

            s.on('disconnect', () => {
                console.log('Socket disconnected globally');
                setIsConnected(false);
            });

            s.on('dm:message', (msg: any) => {
                console.log('Global socket received message', msg);

                // Refresh unread count in AuthContext
                fetchUnreadMessageCount();

                // Show notification if NOT on the messages page
                // Or if on messages page but maybe not looking at this conversation (handled by page logic usually, but here we can be simple)
                if (!pathname?.startsWith('/product/messages')) {
                    // Play sound or show toast
                    const senderName = msg.senderName || 'Someone'; // The message object might need senderName
                    toast(`${senderName} sent you a message`, {
                        icon: '💬',
                        duration: 4000
                    });
                }
            });

            setSocket(s);

            return () => {
                s.disconnect();
            };
        }
    }, [user, CHAT_WS_URL]);

    // Handle re-joining if socket exists but user changed (rare without unmount) or just to ensure room join
    useEffect(() => {
        if (socket && user && isConnected) {
            socket.emit('dm:join', { userId: String(user.id) });
        }
    }, [socket, user, isConnected]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
