'use client'

import React, { useEffect, useState } from 'react'
import { ExpertCard } from '@/components/consultations/ExpertCard'
import { BookingModal } from '@/components/consultations/BookingModal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Calendar as CalendarIcon } from 'lucide-react'
import Link from 'next/link'

export default function ConsultationsPage() {
    const [experts, setExperts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedExpert, setSelectedExpert] = useState<any | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchExperts()
    }, [])

    const fetchExperts = async () => {
        try {
            const res = await fetch('/api/consultations/experts')
            const data = await res.json()
            if (data.success) {
                setExperts(data.experts)
            }
        } catch (error) {
            console.error('Failed to fetch experts', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredExperts = experts.filter(expert =>
        expert.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expert.profession?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expert.expertise?.some((skill: string) => skill.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Find an Expert</h1>
                    <p className="text-muted-foreground">Book 1-on-1 consultations with industry leaders</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/product/consultations/calendar">
                        <Button variant="outline" className="gap-2">
                            <CalendarIcon size={16} />
                            My Calendar
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="relative mb-8">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                    placeholder="Search by name, profession, or skill..."
                    className="pl-10 h-12 text-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="text-center py-20">Loading experts...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredExperts.map((expert) => (
                        <ExpertCard
                            key={expert.id}
                            expert={expert}
                            onBook={(expert) => {
                                setSelectedExpert(expert)
                                setIsModalOpen(true)
                            }}
                        />
                    ))}

                    {filteredExperts.length === 0 && (
                        <div className="col-span-full text-center py-20 text-muted-foreground">
                            No experts found matching your search.
                        </div>
                    )}
                </div>
            )}

            <BookingModal
                expert={selectedExpert}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    // You might want to refresh checking availability here
                }}
            />
        </div>
    )
}
