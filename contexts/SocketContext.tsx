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
            });

            s.on('connect_error', (err) => {
                console.error('Socket connection error:', err.message);
                // Automatically retries, but we could handle specific errors (e.g., auth failure)
                setIsConnected(false);
            });

            s.on('disconnect', () => {
                console.log('Socket disconnected globally');
                setIsConnected(false);
            });

            // Handle direct message events
            s.on('receive_message', (msg: any) => {
                console.log('Global socket received message', msg);
                fetchUnreadMessageCount();

                // Additional UI logic if needed
            });

            // Handle real-time notifications
            s.on('new_notification', (data: any) => {
                console.log('Global socket received notification', data);

                // Show toast if proper data
                if (data && data.title && data.message) {
                    // Only show if we are NOT on the messages page for this conversation
                    // But notifications might be broader than just messages.
                    // For now, let's show simple notification.
                    if (!document.hidden && !pathname?.startsWith('/product/messages')) {
                        toast(data.message, {
                            icon: '🔔',
                            duration: 4000
                        });
                    }
                }
            });
            setSocket(s);

            return () => {
                s.disconnect();
            };
        }
    }, [user, CHAT_WS_URL]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
