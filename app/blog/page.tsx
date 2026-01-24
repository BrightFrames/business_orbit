"use client"

import { PublicNavbar } from "@/components/PublicNavbar"
import { PublicFooter } from "@/components/PublicFooter"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export default function BlogPage() {
    const posts = [
        {
            title: "Why Traditional Networking is Broken",
            excerpt: "The old way of collecting business cards is dead. Here is what works now.",
            date: "Oct 24, 2024",
            readTime: "5 min read",
            category: "Thought Leadership"
        },
        {
            title: "How to Build a Personal Board of Advisors",
            excerpt: "You don't need a single mentor. You need a team of experts invested in your success.",
            date: "Oct 20, 2024",
            readTime: "8 min read",
            category: "Guides"
        },
        {
            title: "The Rise of Niche Professional Communities",
            excerpt: "General purpose networks are noisy. Specialized communities are where real value happens.",
            date: "Oct 15, 2024",
            readTime: "6 min read",
            category: "Trends"
        }
    ]

    return (
        <div className="min-h-screen bg-[#FDFDFD] flex flex-col font-sans text-black">
            <PublicNavbar />

            <main className="flex-grow">
                <div className="max-w-4xl mx-auto px-6 py-24">
                    <div className="text-center mb-16">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">The Orbit Blog</h1>
                        <p className="text-xl text-gray-500 max-w-2xl mx-auto">Insights on community, growth, and modern leadership.</p>
                    </div>

                    <div className="grid gap-12">
                        {posts.map((post, index) => (
                            <article key={index} className="group cursor-pointer border-b border-gray-100 pb-12 last:border-none">
                                <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                                    <span className="font-medium text-black">{post.category}</span>
                                    <span>•</span>
                                    <span>{post.date}</span>
                                    <span>•</span>
                                    <span>{post.readTime}</span>
                                </div>
                                <h2 className="text-2xl md:text-3xl font-bold mb-3 group-hover:text-gray-600 transition-colors">
                                    {post.title}
                                </h2>
                                <p className="text-lg text-gray-500 mb-4 leading-relaxed">
                                    {post.excerpt}
                                </p>
                                <div className="flex items-center text-black font-medium group-hover:underline underline-offset-4">
                                    Read Article <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </main>

            <PublicFooter />
        </div>
    )
}
