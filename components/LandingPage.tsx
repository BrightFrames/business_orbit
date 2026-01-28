'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Shield, Users, Globe, Zap, TrendingUp, CheckCircle, ChevronDown, Linkedin, Twitter, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { PublicNavbar } from "@/components/PublicNavbar"
import { PublicFooter } from "@/components/PublicFooter"

export default function LandingPage() {
    const [openFaq, setOpenFaq] = React.useState<number | null>(null);

    const faqs = [
        { q: "Who is Business Orbit for?", a: "Business Orbit is for founders, executives, and professionals who want to build genuine relationships, not just collect connections." },
        { q: "How is this different from LinkedIn?", a: "We focus on quality over quantity. Our verified-only communities and curated events ensure you connect with people who are serious about growth." },
        { q: "Is there a free plan?", a: "Yes! Our Starter plan is completely free and gives you access to public communities, events, and basic networking features." },
        { q: "Can I create my own chapter or group?", a: "Absolutely. Pro members can create and manage their own chapters, bringing together professionals in their industry or region." },
    ];

    const testimonials = [
        { quote: "Business Orbit helped me find my co-founder within 3 months. The quality of connections here is unmatched.", name: "Priya Sharma", role: "CEO, TechNova" },
        { quote: "Finally, a networking platform that feels human. I've closed two major deals through introductions made here.", name: "Rahul Mehta", role: "Managing Partner, Velocity Ventures" },
        { quote: "The chapter system is brilliant. I lead the Bangalore FinTech chapter and it's been transformational for my network.", name: "Ananya Rao", role: "Founder, PayFlow" },
    ];

    return (
        <div className="min-h-screen bg-[#FDFDFD] text-black flex flex-col font-sans selection:bg-black selection:text-white">
            {/* Background Gradients */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-100/40 rounded-full blur-3xl opacity-60"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/40 rounded-full blur-3xl opacity-60"></div>
            </div>

            <PublicNavbar />

            {/* Hero Section */}
            <main className="flex-grow flex flex-col items-center justify-center text-center px-4 pt-16 sm:pt-24 relative z-10">
                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200/50 text-sm font-medium text-gray-700 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Accepting new members
                    </div>

                    <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight text-black leading-[1.05] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                        Professional <br className="hidden sm:block" />
                        <span className="relative inline-block">
                            Networking Reimagined.
                            <svg className="absolute w-full h-4 -bottom-2 left-0 text-yellow-400 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                                <path d="M0 5 Q 25 0 50 5 T 100 5" stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round" />
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
                        <Link href="/pricing">
                            <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full border-gray-300 hover:border-black transition-all">
                                View Pricing
                            </Button>
                        </Link>
                    </div>

                    <div className="pt-12 animate-in fade-in zoom-in duration-1000 delay-500">
                        <div className="flex -space-x-3 justify-center">
                            {['bg-gradient-to-br from-purple-400 to-pink-400', 'bg-gradient-to-br from-blue-400 to-cyan-400', 'bg-gradient-to-br from-green-400 to-emerald-400', 'bg-gradient-to-br from-orange-400 to-yellow-400', 'bg-gradient-to-br from-red-400 to-pink-400'].map((gradient, i) => (
                                <div key={i} className={`w-12 h-12 rounded-full border-4 border-white ${gradient} shadow-lg animate-pulse`} style={{ animationDelay: `${i * 0.2}s`, animationDuration: '3s' }}></div>
                            ))}
                        </div>
                        <p className="mt-4 text-sm font-medium text-gray-500">Trusted by over 2,000+ founders and leaders</p>
                    </div>
                </div>
            </main>

            {/* How It Works Section */}
            <section className="py-24 px-6 relative z-10 bg-white">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
                        <p className="text-xl text-gray-500">Get started in three simple steps</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { step: "01", title: "Sign Up", desc: "Create your profile in minutes. Tell us about your expertise and what you're looking for." },
                            { step: "02", title: "Connect", desc: "Join chapters, attend events, and start conversations with verified professionals." },
                            { step: "03", title: "Grow", desc: "Build relationships that lead to partnerships, investments, and new opportunities." },
                        ].map((item, i) => (
                            <div key={i} className="relative p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:shadow-lg transition-all hover:-translate-y-1 group">
                                <div className="text-6xl font-bold text-gray-200 group-hover:text-purple-100 transition-colors absolute top-4 right-6">{item.step}</div>
                                <div className="relative z-10 pt-8">
                                    <CheckCircle className="w-10 h-10 text-green-500 mb-4" />
                                    <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                                    <p className="text-gray-500">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Bento Grid Features */}
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

            {/* Testimonials Section */}
            <section className="py-24 px-6 bg-gray-50 relative z-10">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">What Our Members Say</h2>
                        <p className="text-xl text-gray-500">Real stories from real professionals</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {testimonials.map((t, i) => (
                            <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1">
                                <p className="text-gray-700 text-lg mb-6 leading-relaxed">"{t.quote}"</p>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400"></div>
                                    <div>
                                        <p className="font-bold text-black">{t.name}</p>
                                        <p className="text-sm text-gray-500">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-24 px-6 relative z-10">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
                        <p className="text-xl text-gray-500">Everything you need to know</p>
                    </div>
                    <div className="space-y-4">
                        {faqs.map((faq, i) => (
                            <div key={i} className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex items-center justify-between p-6 text-left font-medium text-lg hover:bg-gray-50 transition-colors"
                                >
                                    {faq.q}
                                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                                </button>
                                {openFaq === i && (
                                    <div className="px-6 pb-6 text-gray-600 leading-relaxed">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Trust Section */}
            <section className="py-24 bg-black text-white px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-8">Ready to level up?</h2>
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

            <PublicFooter />
        </div>
    );
}
