'use client'

import React from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import Link from 'next/link'

interface Expert {
    id: number
    user_id: number
    name: string
    profession: string
    profile_photo_url: string
    hourly_rate: string
    currency: string
    expertise: string[]
    bio: string
    is_available: boolean
}

interface ExpertCardProps {
    expert: Expert
    onBook: (expert: Expert) => void
}

export function ExpertCard({ expert, onBook }: ExpertCardProps) {
    return (
        <Card className="p-6 flex flex-col gap-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
                <Link href={`/profile/${expert.user_id}`} className="shrink-0 relative w-16 h-16 rounded-full overflow-hidden border-2 border-primary/10 hover:border-primary transition-colors cursor-pointer">
                    <Image
                        src={expert.profile_photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop'}
                        alt={expert.name}
                        fill
                        className="object-cover"
                    />
                </Link>
                <div className="flex-1">
                    <Link href={`/profile/${expert.user_id}`} className="hover:underline cursor-pointer">
                        <h3 className="font-bold text-lg">{expert.name}</h3>
                    </Link>
                    <p className="text-muted-foreground text-sm">{expert.profession}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {expert.expertise?.map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                                {skill}
                            </Badge>
                        ))}
                    </div>
                </div>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-3">
                {expert.bio || `Connect with ${expert.name} for professional guidance and mentorship.`}
            </p>

            <div className="mt-auto flex items-center justify-between pt-4 border-t">
                <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Rate</span>
                    <span className="font-bold">
                        {expert.currency} {expert.hourly_rate}/hr
                    </span>
                </div>
                <Button
                    onClick={() => onBook(expert)}
                    disabled={!expert.is_available}
                >
                    {expert.is_available ? 'Book Session' : 'Unavailable'}
                </Button>
            </div>
        </Card>
    )
}
