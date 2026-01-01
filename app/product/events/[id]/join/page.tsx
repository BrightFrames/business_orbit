"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, Clock, MapPin, ArrowLeft, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { safeApiCall } from "@/lib/utils/api"
import { Navigation } from "@/components/navigation"
import toast from "react-hot-toast"

interface EventDetails {
    id: number
    title: string
    description: string
    date: string
    event_type: string
    venue_address?: string
    meeting_link?: string
}

export default function EventJoinPage() {
    const { id } = useParams()
    const router = useRouter()
    const { user } = useAuth()
    const [event, setEvent] = useState<EventDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [isJoined, setIsJoined] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        email: "",
    })

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || "",
                email: user.email || "",
            })
        }
    }, [user])

    useEffect(() => {
        const fetchEventDetails = async () => {
            try {
                const result = await safeApiCall(
                    () => fetch(`/api/events`, { credentials: 'include' }),
                    'Failed to fetch event details'
                )

                if (result.success && Array.isArray(result.data)) {
                    const foundEvent = result.data.find((e: any) => String(e.id) === String(id))
                    if (foundEvent) {
                        setEvent(foundEvent)
                        // Be extremely robust with the flag check
                        const registered = foundEvent.is_registered
                        if (registered === true || registered === 1 || registered === 'true' || registered === 't' || registered > 0) {
                            setIsJoined(true)
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching event:", error)
            } finally {
                setLoading(false)
            }
        }

        if (id) fetchEventDetails()
    }, [id])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) {
            toast.error("Please log in to join events")
            return
        }

        const requestBody = {};

        setSubmitting(true)
        try {
            const result = await safeApiCall(
                () => fetch(`/api/events/${id}/rsvp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(requestBody)
                }),
                'Failed to register for event'
            )

            if (result.success) {
                setIsJoined(true)
                if ((result.data as any)?.alreadyJoined) {
                    toast.success("You're already registered for this event!")
                } else {
                    toast.success("Successfully registered!")
                }
            } else {
                toast.error(result.error || "Failed to join event", {
                    duration: 5000,
                    icon: '❌'
                });
            }
        } catch (error) {
            console.error("[EventJoin] Unexpected error:", error);
            toast.error("An unexpected error occurred. Please check console.");
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
        )
    }

    if (!event) {
        return (
            <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center justify-center text-center">
                <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
                <Button onClick={() => router.back()} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Feed
                </Button>
            </div>
        )
    }

    if (isJoined) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navigation />
                <div className="max-w-2xl mx-auto pt-20 px-4">
                    <Card className="p-8 text-center space-y-6">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-10 h-10 text-green-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Registration Confirmed!</h1>
                            <p className="text-gray-600 mt-2">
                                You're all set for <strong>{event.title}</strong>.
                                We've sent the details to {formData.email}.
                            </p>
                        </div>
                        <div className="pt-4 flex flex-col gap-3">
                            <Button onClick={() => router.push('/product/feed')} className="w-full">
                                Go to Feed
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navigation />
            <div className="max-w-2xl mx-auto pt-20 px-4 pb-12">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="mb-6 hover:bg-gray-100 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>

                <Card className="overflow-hidden bg-white shadow-xl rounded-2xl border-0">
                    <div className="bg-black p-8 text-white">
                        <h1 className="text-3xl font-bold mb-4">{event.title}</h1>
                        <div className="flex flex-wrap gap-4 text-gray-300">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(event.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>6:00 PM</span>
                            </div>
                            {event.venue_address && (
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    <span>{event.venue_address}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Your Name"
                                    required
                                    className="h-12 border-gray-200 focus:ring-black"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="your@email.com"
                                    required
                                    className="h-12 border-gray-200 focus:ring-black"
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full h-12 bg-black hover:bg-gray-900 transition-all text-lg font-semibold mt-4"
                                disabled={submitting}
                            >
                                {submitting ? "Processing..." : "Confirm Join"}
                            </Button>
                        </form>
                        <p className="text-xs text-center text-gray-500 mt-6 pt-6 border-t border-gray-100">
                            By joining, you agree to receive event-related notifications via email.
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    )
}
