'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import toast from 'react-hot-toast'
import { ArrowLeft, Save, Clock, DollarSign, Calendar } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const DAYS = [
    { id: 1, label: 'Mon' },
    { id: 2, label: 'Tue' },
    { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' },
    { id: 5, label: 'Fri' },
    { id: 6, label: 'Sat' },
    { id: 0, label: 'Sun' },
]

export default function ConsultationSettingsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [formData, setFormData] = useState({
        hourly_rate: '',
        currency: 'USD',
        bio: '',
        expertise: '', // Comma separated string for UI
        is_available: true,
        start_time: '09:00',
        end_time: '17:00',
        availability_days: [1, 2, 3, 4, 5] // Default Mon-Fri
    })

    useEffect(() => {
        fetchProfile()
    }, [])

    const fetchProfile = async () => {
        try {
            const res = await fetch('/api/consultations/profile')
            const data = await res.json()

            if (data.success && data.profile) {
                const p = data.profile
                setFormData({
                    hourly_rate: p.hourly_rate || '',
                    currency: p.currency || 'USD',
                    bio: p.bio || '',
                    expertise: Array.isArray(p.expertise) ? p.expertise.join(', ') : (p.expertise || ''),
                    is_available: p.is_available ?? true,
                    start_time: p.start_time || '09:00',
                    end_time: p.end_time || '17:00',
                    availability_days: p.availability_days || [1, 2, 3, 4, 5]
                })
            }
        } catch (error) {
            console.error('Failed to load profile', error)
            toast.error('Failed to load settings')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            // Convert expertise string to array
            const expertiseArray = formData.expertise.split(',').map(s => s.trim()).filter(Boolean)

            const payload = {
                ...formData,
                expertise: expertiseArray,
                hourly_rate: parseFloat(formData.hourly_rate) || 0
            }

            const res = await fetch('/api/consultations/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const data = await res.json()
            if (data.success) {
                toast.success('Settings saved successfully!')
                router.refresh()
            } else {
                toast.error(data.error || 'Failed to save')
            }
        } catch (error) {
            console.error('Error saving:', error)
            toast.error('Something went wrong')
        } finally {
            setSaving(false)
        }
    }

    const toggleDay = (dayId: number) => {
        setFormData(prev => {
            const days = prev.availability_days.includes(dayId)
                ? prev.availability_days.filter(d => d !== dayId)
                : [...prev.availability_days, dayId]
            return { ...prev, availability_days: days }
        })
    }

    if (loading) return <div className="p-8 text-center">Loading settings...</div>

    return (
        <div className="container mx-auto py-8 px-4 max-w-3xl">
            <Link href="/product/consultations">
                <Button variant="ghost" className="gap-2 pl-0 hover:pl-2 transition-all mb-6">
                    <ArrowLeft size={16} />
                    Back to Consultations
                </Button>
            </Link>

            <div className="bg-card border rounded-lg p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Consultancy Settings</h1>
                        <p className="text-muted-foreground">Manage your rates, availability, and profile.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* Basic Info Section */}
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <Label>Overall Availability</Label>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={formData.is_available}
                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_available: checked }))}
                                />
                                <span className="text-sm text-muted-foreground">
                                    {formData.is_available ? 'Available for bookings' : 'Not accepting bookings'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="rate">Hourly Rate</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                                    <Input
                                        id="rate"
                                        type="number"
                                        placeholder="0.00"
                                        className="pl-9"
                                        value={formData.hourly_rate}
                                        onChange={e => setFormData(prev => ({ ...prev, hourly_rate: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="currency">Currency</Label>
                                <Input
                                    id="currency"
                                    value={formData.currency}
                                    onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                                    placeholder="USD, INR..."
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="expertise">Expertise / Tags</Label>
                            <Input
                                id="expertise"
                                placeholder="e.g. Marketing, Strategy, SEO (comma separated)"
                                value={formData.expertise}
                                onChange={e => setFormData(prev => ({ ...prev, expertise: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bio">Consultancy Bio</Label>
                            <Textarea
                                id="bio"
                                placeholder="Describe what you offer in your sessions..."
                                className="h-24"
                                value={formData.bio}
                                onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="border-t pt-6"></div>

                    {/* Schedule Section */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Calendar size={20} />
                            Schedule
                        </h2>

                        <div className="space-y-2">
                            <Label>Working Days</Label>
                            <div className="flex flex-wrap gap-2">
                                {DAYS.map(day => (
                                    <div
                                        key={day.id}
                                        onClick={() => toggleDay(day.id)}
                                        className={`
                                            cursor-pointer px-4 py-2 rounded-md border text-sm font-medium transition-colors
                                            ${formData.availability_days.includes(day.id)
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-background hover:bg-muted text-muted-foreground'}
                                        `}
                                    >
                                        {day.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 max-w-md">
                            <div className="space-y-2">
                                <Label htmlFor="start_time" className="flex items-center gap-2">
                                    <Clock size={16} />
                                    Start Time
                                </Label>
                                <Input
                                    id="start_time"
                                    type="time"
                                    value={formData.start_time}
                                    onChange={e => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end_time" className="flex items-center gap-2">
                                    <Clock size={16} />
                                    End Time
                                </Label>
                                <Input
                                    id="end_time"
                                    type="time"
                                    value={formData.end_time}
                                    onChange={e => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                                />
                            </div>
                        </div>

                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={saving} className="min-w-[150px]">
                            {saving ? (
                                <>Saving...</>
                            ) : (
                                <>
                                    <Save size={16} className="mr-2" />
                                    Save Settings
                                </>
                            )}
                        </Button>
                    </div>

                </form>
            </div>
        </div>
    )
}
