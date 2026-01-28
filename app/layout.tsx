import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"
import { SocketProvider } from "@/contexts/SocketContext"
import { SidebarDataProvider } from "@/contexts/SidebarDataContext"
import { Toaster } from "react-hot-toast"


const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export const metadata: Metadata = {
  metadataBase: new URL('https://businessorbit.org'),
  title: {
    default: "Business Orbit - Professional Networking Platform",
    template: "%s | Business Orbit"
  },
  description: "Connect, collaborate, and grow your professional network with Business Orbit. Join verified chapters and attend exclusive events.",
  keywords: ["professional networking", "business connections", "startup networking", "founders community", "business orbit"],
  authors: [{ name: "Business Orbit Team" }],
  creator: "Business Orbit",
  publisher: "Business Orbit",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: '/favicon.jpg',
    apple: '/apple-icon.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://businessorbit.org",
    title: "Business Orbit - Professional Networking Platform",
    description: "Connect, collaborate, and grow your professional network. Join verified chapters and attend exclusive events.",
    siteName: "Business Orbit",
    images: [
      {
        url: "/og-image.jpg", // Ensure this exists or use a placeholder
        width: 1200,
        height: 630,
        alt: "Business Orbit Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Business Orbit - Professional Networking Platform",
    description: "Connect, collaborate, and grow your professional network.",
    images: ["/og-image.jpg"],
    creator: "@businessorbit",
  },
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
          <SocketProvider>
            <SidebarDataProvider>
              {children}
              <Toaster position="top-right" />

            </SidebarDataProvider>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
