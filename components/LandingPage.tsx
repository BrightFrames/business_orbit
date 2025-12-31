"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [activeTab, setActiveTab] = useState("waitlist");

  const handleJoinWaitlist = () => {
    window.location.href = '/product';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-600 to-purple-200 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-purple-700/60 to-purple-300/40"></div>
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-3 sm:px-4 py-6 sm:py-8">
        {/* Top Navigation Bar */}
        <div className="mb-6 sm:mb-8">
          <div className="flex bg-gray-800/90 backdrop-blur-sm rounded-full px-1 py-1 shadow-lg">
            <button
              onClick={() => setActiveTab("waitlist")}
              className={`px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                activeTab === "waitlist"
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-white/80 hover:text-white"
              }`}
            >
              Waitlist
            </button>
            <button
              onClick={() => { window.location.href = '/product' }}
              className={`px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                activeTab === "product"
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-white/80 hover:text-white"
              }`}
            >
              Product
            </button>
          </div>
        </div>

        {/* Main Card */}
        <div className="w-full max-w-2xl sm:max-w-sm md:max-w-2xl mx-auto">
          <div className="bg-gray-800 rounded-2xl sm:rounded-3xl pt-3 pb-6 px-6 sm:pt-4 sm:pb-8 sm:px-8 md:pt-6 md:pb-12 md:px-12 shadow-2xl">
            {/* Logo */}
            <div className="flex items-center justify-center mb-0">
              <div className="flex items-center space-x-1">
                <div className="w-20 h-20 mb-8 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 xl:w-36 xl:h-36 relative">
                  <Image
                    src="/logo.png"
                    alt="Business Orbit Logo"
                    width={144}
                    height={144}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white text-center mb-4 sm:mb-6 leading-tight -mt-8 sm:-mt-10">
              Grow Faster With Smart Business Networking
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base md:text-lg text-gray-200 text-center mb-6 sm:mb-8 md:mb-10 max-w-xl mx-auto leading-relaxed">
              Business Orbit uses AI to simplify professional networking connecting you with people who matter most for your business success.
            </p>

            {/* Email Input and Button */}
            <div className="max-w-sm sm:max-w-md mx-auto mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row bg-gray-700 border border-white rounded-xl p-1 gap-1 sm:gap-0">
                <input
                  type="email"
                  placeholder="Your work email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder:text-gray-400 px-3 sm:px-4 py-2 sm:py-3 focus:outline-none rounded-lg sm:rounded-l-lg text-sm sm:text-base"
                />
                <button
                  onClick={handleJoinWaitlist}
                  className="bg-gray-200 text-gray-800 hover:bg-gray-100 font-semibold px-4 sm:px-6 py-2 sm:py-3 whitespace-nowrap transition-colors rounded-lg sm:rounded-xl sm:ml-2 cursor-pointer text-sm sm:text-base"
                >
                  Join waitlist
                </button>
              </div>
            </div>

            {/* Footer strip with slightly different background (like screenshot) */}
            <div className="mt-12 sm:mt-14 md:mt-16 -mx-6 sm:-mx-8 md:-mx-12 -mb-6 sm:-mb-8 md:-mb-12 rounded-b-2xl sm:rounded-b-3xl bg-gray-700/60 border-t border-white/10 px-6 sm:px-8 md:px-12 py-3 sm:py-4">
              <div className="flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm gap-2 sm:gap-0">
                {/* LinkedIn Link */}
                <div className="text-white/80 text-center sm:text-left">
                  Follow Business Orbit on{" "}
                  <a
                    href="#"
                    className="text-white underline hover:text-gray-200 transition-colors"
                  >
                    LinkedIn
                  </a>
                </div>

                {/* Theme Switcher */}
                <div className="flex items-center space-x-1 sm:space-x-2 text-white/80">
                  <span className="text-xs sm:text-sm">Dark</span>
                  <span className="text-xs sm:text-sm">/</span>
                  <span className="text-xs sm:text-sm font-semibold text-white">System</span>
                  <span className="text-xs sm:text-sm">/</span>
                  <span className="text-xs sm:text-sm">Light</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
