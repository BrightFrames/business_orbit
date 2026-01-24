"use client"

import { PublicNavbar } from "@/components/PublicNavbar"
import { PublicFooter } from "@/components/PublicFooter"
import { Users, TrendingUp, Shield } from "lucide-react"

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-[#FDFDFD] flex flex-col font-sans text-black">
            <PublicNavbar />

            <main className="flex-grow">
                <div className="max-w-4xl mx-auto px-6 py-24">
                    <div className="text-center mb-16">
                        <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Making Networking Human Again</h1>
                        <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
                            We started Business Orbit because we were tired of collecting connections that didn't mean anything. We believe in quality over quantity.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
                        <div>
                            <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
                            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                                To create a professional ecosystem where relationships are built on trust, shared values, and mutual growth—not just job titles and random connection requests.
                            </p>
                            <p className="text-lg text-gray-600 leading-relaxed">
                                We're building the future of professional communities, one real conversation at a time.
                            </p>
                        </div>
                        <div className="bg-gray-100 rounded-2xl h-80 flex items-center justify-center">
                            {/* Placeholder for team image or mission graphic */}
                            <div className="text-gray-400 font-medium">Mission Image</div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 py-12 border-t border-gray-100">
                        <div className="text-center">
                            <div className="bg-black text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Community First</h3>
                            <p className="text-gray-500">Real people, real conversations.</p>
                        </div>
                        <div className="text-center">
                            <div className="bg-black text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Shield className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Verified Members</h3>
                            <p className="text-gray-500">Safe, trusted environment.</p>
                        </div>
                        <div className="text-center">
                            <div className="bg-black text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Growth Focused</h3>
                            <p className="text-gray-500">Tools to help you scale.</p>
                        </div>
                    </div>
                </div>
            </main>

            <PublicFooter />
        </div>
    )
}
