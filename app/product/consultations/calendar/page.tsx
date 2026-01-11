'use client'

import React, { useEffect, useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format, isSameDay } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Video, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function ConsultationCalendarPage() {
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [consultations, setConsultations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchConsultations()
    }, [])

    const fetchConsultations = async () => {
        try {
            const res = await fetch('/api/consultations/mine')
            const data = await res.json()
            if (data.success) {
                setConsultations(data.consultations.map((c: any) => ({
                    ...c,
                    scheduled_at: new Date(c.scheduled_at)
                })))
            }
        } catch (error) {
            console.error('Failed to fetch consultations', error)
        } finally {
            setLoading(false)
        }
    }

    // Filter consultations for selected date
    const selectedDateConsultations = consultations.filter(c =>
        date && isSameDay(c.scheduled_at, date)
    )

    // Get dates with appointments for highlighting
    const bookedDates = consultations.map(c => c.scheduled_at)

    return (
        <div className="container mx-auto py-8 px-4 max-w-5xl">
            <div className="mb-6">
                <Link href="/product/consultations">
                    <Button variant="ghost" className="gap-2 pl-0 hover:pl-2 transition-all">
                        <ArrowLeft size={16} />
                        Back to Experts
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold mt-2">My Consultation Calendar</h1>
            </div>

            <div className="grid md:grid-cols-[1fr_350px] gap-8">
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle>Schedule</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-center">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                className="rounded-md border shadow"
                                modifiers={{
                                    booked: bookedDates
                                }}
                                modifiersStyles={{
                                    booked: { fontWeight: 'bold', textDecoration: 'underline', color: 'var(--primary)' }
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex flex-col gap-4">
                    <h2 className="font-semibold text-xl">
                        {date ? format(date, 'MMMM d, yyyy') : 'Select a date'}
                    </h2>

                    {loading ? (
                        <div className="text-muted-foreground animate-pulse">Loading schedule...</div>
                    ) : selectedDateConsultations.length > 0 ? (
                        selectedDateConsultations.map((c) => (
                            <Card key={c.id}>
                                <CardContent className="p-4 flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg">
                                                {format(c.scheduled_at, 'h:mm a')} - {format(new Date(c.scheduled_at.getTime() + c.duration_minutes * 60000), 'h:mm a')}
                                            </h3>
                                            <p className="text-muted-foreground text-sm">
                                                with {c.role === 'client' ? c.expert_name : c.client_name}
                                            </p>
                                        </div>
                                        <Badge variant={c.status === 'confirmed' ? 'default' : 'secondary'}>
                                            {c.status}
                                        </Badge>
                                    </div>

                                    {c.notes && (
                                        <div className="text-sm bg-muted/50 p-2 rounded">
                                            <span className="font-semibold">Note:</span> {c.notes}
                                        </div>
                                    )}

                                    <div className="flex gap-2 mt-2">
                                        {c.meeting_link ? (
                                            <Button size="sm" className="w-full gap-2" asChild>
                                                <a href={c.meeting_link} target="_blank" rel="noopener noreferrer">
                                                    <Video size={14} /> Join Meeting
                                                </a>
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="outline" className="w-full gap-2" disabled>
                                                <Clock size={14} /> Link Pending
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="text-center p-8 border border-dashed rounded-lg bg-muted/20">
                            <p className="text-muted-foreground">No consultations scheduled for this day.</p>
                            <Link href="/product/consultations" className="block mt-4">
                                <Button variant="link">Book a Session</Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
