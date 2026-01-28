'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'

interface Expert {
    id: number
    name: string
    hourly_rate: string
}

interface BookingModalProps {
    expert: Expert | null
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function BookingModal({ expert, isOpen, onClose, onSuccess }: BookingModalProps) {
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [time, setTime] = useState('10:00')
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)

    const handleBooking = async () => {
        if (!expert || !date || !time) return

        setLoading(true)
        try {
            // Combine date and time
            const scheduledAt = new Date(date)
            const [hours, minutes] = time.split(':')
            scheduledAt.setHours(parseInt(hours), parseInt(minutes))

            const res = await fetch('/api/consultations/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    expertId: expert.id,
                    scheduledAt: scheduledAt.toISOString(),
                    notes
                })
            })

            const data = await res.json()

            if (data.success) {
                // Booking created locally, now initiate payment
                const booking = data.booking

                try {
                    const paymentRes = await fetch('/api/payments/phonepe/initiate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            planId: `consultation:${booking.id}`,
                            amount: parseFloat(expert.hourly_rate) // Ensure amount is number
                        })
                    })

                    const paymentData = await paymentRes.json()
                    console.log('Payment Initiation Response:', paymentData)

                    if (paymentData.success && paymentData.redirectUrl) {
                        toast.success(`Booking created! Redirecting to payment...`)
                        window.location.href = paymentData.redirectUrl
                    } else {
                        console.error('Payment initiation failed:', paymentData)
                        const errorMessage = typeof paymentData.details === 'object'
                            ? JSON.stringify(paymentData.details)
                            : (paymentData.details || paymentData.error || 'Payment initiation failed');
                        toast.error(errorMessage)
                        // Do not close so user can try again or see error
                    }
                } catch (paymentError) {
                    console.error("Payment error", paymentError)
                    toast.error('Error starting payment')
                    onSuccess()
                    onClose()
                }
            } else {
                toast.error(data.error || 'Failed to book session')
            }
        } catch (error) {
            toast.error('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Book Session with {expert?.name}</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex flex-col gap-2">
                        <Label>Select Date</Label>
                        <div className="border rounded-md p-2 flex justify-center">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                initialFocus
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="time">Select Time</Label>
                        <Input
                            id="time"
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="What would you like to discuss?"
                        />
                    </div>

                    <div className="text-sm text-muted-foreground p-2 bg-secondary/20 rounded">
                        Price: ${expert?.hourly_rate}/hr
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button onClick={handleBooking} disabled={loading || !date || !time}>
                        {loading ? 'Confirming...' : 'Confirm Booking'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
