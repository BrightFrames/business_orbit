"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function PublicNavbar() {
    return (
        <nav className="w-full px-6 py-6 flex justify-between items-center relative z-50 bg-[#FDFDFD]">
            <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <img
                    src="/favicon.jpg"
                    alt="Business Orbit"
                    className="w-16 h-16 object-contain rounded-full"
                />
                <span className="text-2xl font-bold tracking-tight">Business Orbit</span>
            </a>
            <div className="hidden md:flex items-center gap-8">
                <Link href="/about" className="text-gray-600 hover:text-black font-medium transition-colors">
                    About
                </Link>
                <Link href="/blog" className="text-gray-600 hover:text-black font-medium transition-colors">
                    Blog
                </Link>
                <Link href="/pricing" className="text-gray-600 hover:text-black font-medium transition-colors">
                    Pricing
                </Link>
            </div>
            <div className="flex gap-3">
                <Link href="/product/auth?mode=signin">
                    <Button variant="ghost" className="font-medium hover:bg-transparent hover:text-gray-600 transition-colors">
                        Log in
                    </Button>
                </Link>
                <Link href="/product/auth?mode=signup">
                    <Button className="bg-black text-white hover:bg-gray-800 transition-all rounded-full px-6 shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                        Sign Up
                    </Button>
                </Link>
            </div>
        </nav>
    )
}
