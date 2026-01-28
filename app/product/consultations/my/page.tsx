'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { Video, Calendar as CalendarIcon, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function MyBookingsPage() {
    const [bookings, setBookings] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchBookings()
    }, [])

    const fetchBookings = async () => {
        try {
            const res = await fetch('/api/consultations/mine')
            const data = await res.json()
            if (data.success) {
                setBookings(data.consultations)
            }
        } catch (error) {
            console.error('Failed to fetch bookings', error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-green-100 text-green-800 hover:bg-green-200'
            case 'pending_payment': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
            case 'completed': return 'bg-blue-100 text-blue-800 hover:bg-blue-200'
            case 'cancelled': return 'bg-red-100 text-red-800 hover:bg-red-200'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-5xl">
            <h1 className="text-3xl font-bold mb-2">My Bookings</h1>
            <p className="text-muted-foreground mb-8">Manage your upcoming and past consultations</p>

            {loading ? (
                <div className="text-center py-20">Loading your bookings...</div>
            ) : bookings.length > 0 ? (
                <div className="grid gap-6">
                    {bookings.map((booking) => (
                        <Card key={booking.id} className="overflow-hidden">
                            <CardContent className="p-0">
                                <div className="flex flex-col md:flex-row">
                                    <div className="bg-muted/30 p-6 flex flex-col justify-center items-center md:w-48 border-r">
                                        <div className="text-3xl font-bold text-primary">
                                            {format(new Date(booking.scheduled_at), 'd')}
                                        </div>
                                        <div className="text-lg font-medium text-muted-foreground">
                                            {format(new Date(booking.scheduled_at), 'MMM yyyy')}
                                        </div>
                                        <div className="mt-2 text-sm font-medium">
                                            {format(new Date(booking.scheduled_at), 'h:mm a')}
                                        </div>
                                    </div>

                                    <div className="p-6 flex-1 flex flex-col justify-between">
                                        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                                            <div>
                                                <h3 className="font-bold text-lg flex items-center gap-2">
                                                    {booking.role === 'client' ? `Consultation with ${booking.expert_name}` : `Session with ${booking.client_name}`}
                                                </h3>
                                                <p className="text-muted-foreground text-sm mt-1">
                                                    Duration: {booking.duration_minutes} minutes
                                                </p>
                                            </div>
                                            <Badge className={`${getStatusColor(booking.status)} border-0`}>
                                                {booking.status.replace('_', ' ')}
                                            </Badge>
                                        </div>

                                        {booking.notes && (
                                            <div className="bg-secondary/10 p-3 rounded-md text-sm mb-4">
                                                <span className="font-semibold text-foreground/80">Notes:</span> {booking.notes}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-3 mt-auto pt-4 border-t">
                                            {booking.status === 'confirmed' ? (
                                                <Button className="gap-2" asChild>
                                                    <a href={booking.meeting_link || '#'} target="_blank" rel="noopener noreferrer">
                                                        <Video size={16} /> Join Meeting
                                                    </a>
                                                </Button>
                                            ) : booking.status === 'pending_payment' && booking.role === 'client' ? (
                                                <Button variant="default" className="gap-2 bg-yellow-600 hover:bg-yellow-700">
                                                    <CreditCardIcon className="w-4 h-4" /> Complete Payment
                                                </Button>
                                            ) : (
                                                <Button variant="outline" disabled className="gap-2">
                                                    <Clock size={16} /> {booking.status === 'completed' ? 'Completed' : 'Scheduled'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/10">
                    <CalendarIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Bookings Found</h3>
                    <p className="text-muted-foreground mb-6">You haven't booked any consultations yet.</p>
                    <Link href="/product/consultations">
                        <Button size="lg">Find an Expert</Button>
                    </Link>
                </div>
            )}
        </div>
    )
}

function CreditCardIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
    )
}
