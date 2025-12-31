import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"
import { Toaster } from "react-hot-toast"
import { Phase2Improvements } from "@/components/Phase2Improvements"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "NetworkPro - Professional Networking Platform",
  description: "Connect, collaborate, and grow your professional network",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
          <Phase2Improvements />
        </AuthProvider>
      </body>
    </html>
  )
}
