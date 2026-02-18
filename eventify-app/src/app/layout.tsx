import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Suspense } from "react"
import "@/styles/globals.css"
import "leaflet/dist/leaflet.css"
import { Toaster } from "@/components/ui/sonner"


// --- Optional but recommended for stability ---
export const dynamic = "force-static"

export const metadata: Metadata = {
  title: "Eventify - Smart AI Event Planner",
  description: "AI-powered event management and planning system",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning={true}
        className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}
      >
        <Suspense fallback={null}>{children}</Suspense>
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
