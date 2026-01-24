"use client"

import { PublicNavbar } from "@/components/PublicNavbar"
import { PublicFooter } from "@/components/PublicFooter"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import Link from "next/link"

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-[#FDFDFD] flex flex-col font-sans text-black">
            <PublicNavbar />

            <main className="flex-grow">
                <div className="max-w-6xl mx-auto px-6 py-24">
                    <div className="text-center mb-20">
                        <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Simple, transparent pricing</h1>
                        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                            Choose the plan that fits your growth stage. No hidden fees.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Free Plan */}
                        <div className="border border-gray-200 rounded-3xl p-8 flex flex-col">
                            <div className="mb-6">
                                <h3 className="text-xl font-bold mb-2">Starter</h3>
                                <p className="text-gray-500 text-sm">For individuals just getting started.</p>
                            </div>
                            <div className="mb-8">
                                <span className="text-4xl font-bold">$0</span>
                                <span className="text-gray-500">/month</span>
                            </div>
                            <div className="space-y-4 mb-8 flex-grow">
                                {['Access to public communities', 'Basic profile', 'View events', 'Limited connections'].map((feature) => (
                                    <div key={feature} className="flex items-start gap-3">
                                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                                        <span className="text-sm text-gray-600">{feature}</span>
                                    </div>
                                ))}
                            </div>
                            <Link href="/product/auth?mode=signup">
                                <Button variant="outline" className="w-full rounded-full h-12 font-medium border-gray-300 hover:border-black hover:bg-gray-50">
                                    Get Started
                                </Button>
                            </Link>
                        </div>

                        {/* Pro Plan */}
                        <div className="bg-black text-white rounded-3xl p-8 flex flex-col relative transform md:-translate-y-4 md:shadow-2xl">
                            <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-500 to-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-3xl">POPULAR</div>
                            <div className="mb-6">
                                <h3 className="text-xl font-bold mb-2">Professional</h3>
                                <p className="text-gray-400 text-sm">For serious founders and leaders.</p>
                            </div>
                            <div className="mb-8">
                                <span className="text-4xl font-bold">$29</span>
                                <span className="text-gray-400">/month</span>
                            </div>
                            <div className="space-y-4 mb-8 flex-grow">
                                {['Verified Badge', 'Access to exclusive chapters', 'Direct messaging', 'Priority event access', 'Analytics dashboard'].map((feature) => (
                                    <div key={feature} className="flex items-start gap-3">
                                        <Check className="w-5 h-5 text-white flex-shrink-0" />
                                        <span className="text-sm text-gray-300">{feature}</span>
                                    </div>
                                ))}
                            </div>
                            <Link href="/product/auth?mode=signup">
                                <Button className="w-full rounded-full h-12 font-medium bg-white text-black hover:bg-gray-100">
                                    Start Free Trial
                                </Button>
                            </Link>
                        </div>

                        {/* Enterprise Plan */}
                        <div className="border border-gray-200 rounded-3xl p-8 flex flex-col">
                            <div className="mb-6">
                                <h3 className="text-xl font-bold mb-2">Enterprise</h3>
                                <p className="text-gray-500 text-sm">For large organizations.</p>
                            </div>
                            <div className="mb-8">
                                <span className="text-4xl font-bold">Custom</span>
                            </div>
                            <div className="space-y-4 mb-8 flex-grow">
                                {['Custom community management', 'SSO & Advanced Security', 'API Access', 'Dedicated account manager', 'Custom branding'].map((feature) => (
                                    <div key={feature} className="flex items-start gap-3">
                                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                                        <span className="text-sm text-gray-600">{feature}</span>
                                    </div>
                                ))}
                            </div>
                            <Link href="/consultation">
                                <Button variant="outline" className="w-full rounded-full h-12 font-medium border-gray-300 hover:border-black hover:bg-gray-50">
                                    Contact Sales
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            <PublicFooter />
        </div>
    )
}
