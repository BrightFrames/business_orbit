"use client";

import Image from "next/image";

export default function ProductPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-600 to-purple-200 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-purple-700/60 to-purple-300/40"></div>

      <div className="relative z-10 min-h-screen px-4 py-10 flex flex-col justify-center">
        <div className="max-w-7xl mx-auto w-full">
          {/* Top nav back to landing */}
          <div className="mb-8">
            <a href="/" className="text-white/80 hover:text-white text-xl mb-20">← Back</a>
          </div>

          {/* Centered logo at top */}
          <div className="flex justify-center items-center mb-1 sm:mb-4 md:mb-6">
            <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 xl:w-64 xl:h-64 relative">
              <Image src="/logo.png" alt="Business Orbit Logo" width={256} height={256} className="w-full h-full object-contain" />
            </div>
          </div>

          {/* Centered card */}
          <div className="grid grid-cols-1 place-items-center">
            <div className="w-full lg:max-w-4xl">
              <div className="bg-gray-800 rounded-3xl p-8 shadow-2xl min-h-[60vh] flex flex-col">
                <div className="mb-6">
                  <h1 className="text-white text-2xl font-bold">About Business Orbit</h1>
                </div>
                <p className="text-white/90 leading-relaxed">
                  Business Orbit helps you grow faster with smart business networking. We use AI to simplify professional
                  connections, surfacing the right people and opportunities at the right time. Discover curated connections,
                  collaborate with leaders, and accelerate outcomes with an intelligent, privacy-first network.
                </p>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-700/50 rounded-2xl p-4 text-white/90">
                    <h3 className="font-semibold mb-1 text-white">AI-Matched Intros</h3>
                    <p className="text-sm">High-signal connections based on goals, context, and trust layers.</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-2xl p-4 text-white/90">
                    <h3 className="font-semibold mb-1 text-white">Verified Network</h3>
                    <p className="text-sm">Members and companies are vetted to keep quality high.</p>
                  </div>
                </div>
                <div className="flex-1" />
                <div className="flex justify-end mt-6">
                  <a
                    href="/product/auth"
                    className="bg-gray-800 text-white rounded-xl px-5 py-2.5 shadow-2xl border border-white/10 hover:bg-gray-700/80 transition-colors"
                  >
                    View Our Product →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


