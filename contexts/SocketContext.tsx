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

    // Use ref to keep track of socket instance without triggering re-renders
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!user) {
            if (socketRef.current) {
                console.log('User logged out, disconnecting socket');
                socketRef.current.disconnect();
                socketRef.current = null;
                setSocket(null);
                setIsConnected(false);
            }
            return;
        }

        if (!socketRef.current) {
            const initializeSocket = async () => {
                try {
                    console.log('Fetching auth token for socket...');
                    // Fetch token from API since we can't read HttpOnly cookies
                    const res = await fetch('/api/auth/token');
                    const data = await res.json();
                    const token = data.token;

                    if (!token) {
                        console.error('No token found, skipping socket connection');
                        return;
                    }

                    console.log('Initializing socket connection with token...');
                    const s = io(CHAT_WS_URL, {
                        withCredentials: true,
                        transports: ['polling', 'websocket'],
                        autoConnect: true,
                        reconnection: true,
                        reconnectionAttempts: 5,
                        reconnectionDelay: 1000,
                        auth: {
                            token: token
                        }
                    });

                    s.on('connect', () => {
                        console.log('Socket connected globally:', s.id);
                        setIsConnected(true);
                    });

                    s.on('connect_error', (err) => {
                        console.error('Socket connection error:', err.message);
                        setIsConnected(false);
                    });

                    s.on('disconnect', (reason) => {
                        console.log('Socket disconnected globally:', reason);
                        setIsConnected(false);
                        if (reason === 'io server disconnect') {
                            s.connect();
                        }
                    });

                    s.on('receive_message', (msg: any) => {
                        console.log('Global socket received message', msg);
                        fetchUnreadMessageCount();
                    });

                    s.on('new_notification', (data: any) => {
                        console.log('Global socket received notification', data);
                        if (data && data.title && data.message) {
                            const isMessagesPage = window.location.pathname.startsWith('/product/messages');
                            if (!document.hidden && !isMessagesPage) {
                                toast(data.message, {
                                    icon: '🔔',
                                    duration: 4000
                                });
                            }
                        }
                    });

                    socketRef.current = s;
                    setSocket(s);
                } catch (e) {
                    console.error('Failed to initialize socket:', e);
                }
            };

            initializeSocket();
        }

        // Cleanup on unmount or user change
        return () => {
            // We don't want to disconnect on every render, but only when user changes to null
            // However, useEffect cleanup runs on dependency change.
            // If user changes (e.g. update profile), we don't want to disconnect.
            // We only want to disconnect if user becomes null (handled at top) or component unmounts.
        };
    }, [user?.id, CHAT_WS_URL]); // Only re-run if user ID changes, not just any user object change

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
