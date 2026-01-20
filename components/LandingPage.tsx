'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Star, Shield, Users, Globe, Zap, MessageCircle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#FDFDFD] text-black flex flex-col font-sans selection:bg-black selection:text-white">
            {/* Background Gradients */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-100/40 rounded-full blur-3xl opacity-60"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/40 rounded-full blur-3xl opacity-60"></div>
            </div>

            {/* Navigation */}
            <nav className="w-full px-6 py-6 flex justify-between items-center relative z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-lg">B</div>
                    <span className="text-xl font-bold tracking-tight">Business Orbit</span>
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

            {/* Hero Section */}
            <main className="flex-grow flex flex-col items-center justify-center text-center px-4 pt-16 sm:pt-24 relative z-10">
                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100/80 border border-gray-200 text-sm font-medium text-gray-600 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Accepting new members
                    </div>

                    <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight text-black leading-[1.05] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                        Networking that <br className="hidden sm:block" />
                        <span className="relative inline-block">
                            feels human.
                            <svg className="absolute w-full h-3 -bottom-1 left-0 text-yellow-300 -z-10 opacity-60" viewBox="0 0 100 10" preserveAspectRatio="none">
                                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                            </svg>
                        </span>
                    </h1>

                    <p className="text-xl sm:text-2xl text-gray-500 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
                        Stop collecting generic contacts. Start building meaningful relationships with professionals who actually care about your growth.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
                        <Link href="/product/auth?mode=signup">
                            <Button size="lg" className="h-14 px-8 text-lg bg-black text-white hover:bg-gray-800 transition-all rounded-full shadow-xl hover:shadow-2xl hover:-translate-y-1">
                                Join the Community <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                    </div>

                    <div className="pt-12 animate-in fade-in zoom-in duration-1000 delay-500">
                        <div className="flex -space-x-4 justify-center">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className={`w-12 h-12 rounded-full border-4 border-white bg-gray-${i * 100 + 200} flex items-center justify-center text-xs font-bold text-gray-500 shadow-sm overflow-hidden`}>
                                    <div className={`w-full h-full bg-gradient-to-br from-gray-200 to-gray-400 opacity-50`}></div>
                                </div>
                            ))}
                        </div>
                        <p className="mt-4 text-sm font-medium text-gray-500">Trusted by over 2,000+ founders and leaders</p>
                    </div>
                </div>
            </main>

            {/* Bento Grid Features - More "Human" Layout */}
            <section className="py-32 px-6 relative z-10">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Why Business Orbit?</h2>
                        <p className="text-xl text-gray-500">We've reimagined professional networking from the ground up.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
                        {/* Feature 1 - Large - Growth */}
                        <div className="md:col-span-2 bg-[#f4f4f5] rounded-3xl p-8 transition-all hover:shadow-lg hover:-translate-y-1 group overflow-hidden relative border border-gray-100 flex flex-col justify-between">
                            <div className="absolute top-8 right-8 bg-white p-3 rounded-2xl shadow-sm z-10">
                                <TrendingUp className="h-6 w-6 text-black" />
                            </div>
                            <div className="w-full h-32 flex items-end space-x-2 opacity-50 mb-4">
                                <div className="w-8 h-[40%] bg-gray-300 rounded-t-sm group-hover:bg-black group-hover:h-[60%] transition-all duration-500"></div>
                                <div className="w-8 h-[60%] bg-gray-300 rounded-t-sm group-hover:bg-black group-hover:h-[80%] transition-all duration-500 delay-100"></div>
                                <div className="w-8 h-[30%] bg-gray-300 rounded-t-sm group-hover:bg-black group-hover:h-[50%] transition-all duration-500 delay-75"></div>
                                <div className="w-8 h-[80%] bg-gray-300 rounded-t-sm group-hover:bg-black group-hover:h-[90%] transition-all duration-500 delay-150"></div>
                                <div className="w-8 h-[50%] bg-gray-300 rounded-t-sm group-hover:bg-black group-hover:h-[100%] transition-all duration-500 delay-200"></div>
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-2xl font-bold mb-2">Growth focused ecosystems</h3>
                                <p className="text-gray-500 text-lg">Communities designed to help you scale, not just chat.</p>
                            </div>
                            {/* Abstract visual */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-gray-100 to-transparent opacity-50"></div>
                        </div>

                        {/* Feature 2 - Small - Verified */}
                        <div className="bg-black text-white rounded-3xl p-8 transition-all hover:shadow-lg hover:-translate-y-1 relative overflow-hidden group flex flex-col justify-center items-center text-center">
                            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Shield className="h-10 w-10 text-white" />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-xl font-bold mb-2">Verified Only</h3>
                                <p className="text-gray-400 text-sm">No bots. No spam. Just real people.</p>
                            </div>
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-20"></div>
                        </div>

                        {/* Feature 3 - Small - Direct Access */}
                        <div className="bg-[#f4f4f5] rounded-3xl p-8 transition-all hover:shadow-lg hover:-translate-y-1 border border-gray-100 flex flex-col relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-100 rounded-full blur-2xl opacity-50"></div>
                            <div className="flex-grow flex flex-col gap-3 mb-4 opacity-80">
                                <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm w-[80%] self-start text-xs text-gray-400">
                                    Hey, interested in a partnership?
                                </div>
                                <div className="bg-black text-white p-3 rounded-2xl rounded-br-none shadow-sm w-[80%] self-end text-xs">
                                    Absolutely! Let's schedule a call.
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-1">Direct Access</h3>
                                <p className="text-gray-500 text-sm">Skip the gatekeepers.</p>
                            </div>
                        </div>

                        {/* Feature 4 - Large - Global Chapters */}
                        <div className="md:col-span-2 bg-gradient-to-br from-purple-50 to-white rounded-3xl p-8 transition-all hover:shadow-lg hover:-translate-y-1 border border-gray-100 relative overflow-hidden group">
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
                            <div className="absolute top-8 right-8 bg-white p-3 rounded-2xl shadow-sm z-10">
                                <Globe className="h-6 w-6 text-black" />
                            </div>
                            <div className="relative z-10 h-full flex flex-col justify-end">
                                <h3 className="text-2xl font-bold mb-2">Global Chapters</h3>
                                <p className="text-gray-500 text-lg">Join local chapters or connect with international hubs.</p>
                            </div>
                            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-purple-100 rounded-full blur-3xl opacity-30 group-hover:opacity-40 transition-opacity translate-x-1/3 -translate-y-1/3"></div>
                        </div>

                        {/* Feature 5 - Small - Events (New) */}
                        <div className="bg-white rounded-3xl p-8 transition-all hover:shadow-lg hover:-translate-y-1 border border-gray-200 flex flex-col justify-between group">
                            <div className="flex justify-between items-start">
                                <div className="p-3 bg-orange-100 rounded-2xl">
                                    <Zap className="h-6 w-6 text-orange-600" />
                                </div>
                                <div className="text-xs font-bold bg-black text-white px-2 py-1 rounded-full">New</div>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-2 text-gray-900">Exclusive Events</h3>
                                <p className="text-gray-500 text-sm">Weekly member-only meetups.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust Section */}
            <section className="py-24 bg-black text-white px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-8">Ready to level up?</h2>
                    <p className="text-gray-400 text-lg mb-12 max-w-xl mx-auto">Join thousands of professionals who have found their next investor, co-founder, or big client on Business Orbit.</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/product/auth?mode=signup">
                            <Button className="h-14 px-8 bg-white text-black hover:bg-gray-200 hover:scale-105 transition-all rounded-full font-bold text-lg">
                                Get Started Now
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 bg-white border-t border-gray-100">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
                    <div className="mb-4 md:mb-0 font-medium">
                        Business Orbit © 2024
                    </div>
                    <div className="flex space-x-8">
                        <Link href="#" className="hover:text-black transition-colors underline-offset-4 hover:underline">Privacy Policy</Link>
                        <Link href="#" className="hover:text-black transition-colors underline-offset-4 hover:underline">Terms of Service</Link>
                        <Link href="#" className="hover:text-black transition-colors underline-offset-4 hover:underline">Support</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
