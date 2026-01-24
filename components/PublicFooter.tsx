"use client"

import Link from "next/link"
import { Linkedin, Twitter, Instagram } from "lucide-react"

export function PublicFooter() {
    return (
        <footer className="py-16 px-6 bg-white border-t border-gray-100">
            <div className="max-w-6xl mx-auto">
                <div className="grid md:grid-cols-4 gap-12 mb-12">
                    {/* Brand */}
                    <div className="md:col-span-1">
                        <div className="flex items-center gap-3 mb-4">
                            <img src="/favicon.jpg" alt="Business Orbit" className="w-10 h-10 rounded-full" />
                            <span className="text-xl font-bold">Business Orbit</span>
                        </div>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            Professional networking that feels human. Build meaningful relationships.
                        </p>
                    </div>

                    {/* Product */}
                    <div>
                        <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-gray-400">Product</h4>
                        <ul className="space-y-3 text-gray-600">
                            <li><Link href="/pricing" className="hover:text-black transition-colors">Pricing</Link></li>
                            <li><Link href="/about" className="hover:text-black transition-colors">About Us</Link></li>
                            <li><Link href="/blog" className="hover:text-black transition-colors">Blog</Link></li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-gray-400">Support</h4>
                        <ul className="space-y-3 text-gray-600">
                            <li><Link href="#" className="hover:text-black transition-colors">Help Center</Link></li>
                            <li><Link href="#" className="hover:text-black transition-colors">Contact Us</Link></li>
                            <li><Link href="#" className="hover:text-black transition-colors">Privacy Policy</Link></li>
                            <li><Link href="#" className="hover:text-black transition-colors">Terms of Service</Link></li>
                        </ul>
                    </div>

                    {/* Connect */}
                    <div>
                        <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-gray-400">Connect</h4>
                        <div className="flex gap-4">
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-black hover:text-white transition-all">
                                <Linkedin className="w-5 h-5" />
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-black hover:text-white transition-all">
                                <Twitter className="w-5 h-5" />
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-black hover:text-white transition-all">
                                <Instagram className="w-5 h-5" />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
                    <div className="mb-4 md:mb-0">Business Orbit © 2024. All rights reserved.</div>
                    <div className="flex gap-6">
                        <Link href="#" className="hover:text-black transition-colors">Privacy</Link>
                        <Link href="#" className="hover:text-black transition-colors">Terms</Link>
                        <Link href="#" className="hover:text-black transition-colors">Cookies</Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
