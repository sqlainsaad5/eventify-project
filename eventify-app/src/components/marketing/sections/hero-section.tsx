"use client"

import Link from "next/link"
import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, ArrowRight, Bot, Play } from "lucide-react"
import { useMarketing } from "../marketing-context"

const LIVE_DEMO_VIDEO = "/video/eventify-live-demo.mp4"

export function HeroSection() {
  const { user, role, setShowAssistant } = useMarketing()
  const demoRef = useRef<HTMLElement>(null)

  const scrollToDemo = () => {
    demoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  return (
    <section className="relative pt-32 pb-40 overflow-hidden bg-white">
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-7xl md:text-9xl font-black text-slate-900 mb-8 tracking-tighter leading-none">
            Eventify<span className="text-indigo-600">.</span>
          </h1>

          <p className="text-2xl md:text-4xl font-bold text-slate-900 mb-8 tracking-tight">
            The only platform you need to plan, manage, and scale.
          </p>

          <p className="text-lg text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
            Stop juggling spreadsheets and disconnected tools. Eventify brings your entire event lifecycle into one
            powerful, intuitive interface designed for professionals.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            {!user ? (
              <>
                <Link href="/signup" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full h-16 px-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xl font-black shadow-2xl shadow-indigo-200 transition-all hover:scale-105 active:scale-95 group"
                  >
                    Get Started <ArrowRight className="h-6 w-6 ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto h-16 px-12 border-2 border-slate-100 bg-white text-slate-900 rounded-2xl text-xl font-bold hover:bg-slate-50 hover:border-slate-200 transition-all gap-2"
                  onClick={scrollToDemo}
                >
                  <Play className="h-5 w-5 fill-current" />
                  Live Demo
                </Button>
              </>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto">
                <Link href={role === "user" ? "/my-events" : "/dashboard"} className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full h-16 px-12 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xl font-black shadow-2xl shadow-slate-200 transition-all hover:scale-105 active:scale-95 group"
                  >
                    {role === "user" ? "My Dashboard" : "Go to Dashboard"}{" "}
                    <ArrowRight className="h-6 w-6 ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                {role === "user" && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full h-16 px-10 border-2 border-slate-100 bg-white text-slate-900 rounded-2xl text-lg font-bold hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center gap-2"
                    onClick={() => setShowAssistant(true)}
                  >
                    <Bot className="h-5 w-5" />
                    AI Assistance
                  </Button>
                )}
              </div>
            )}
          </div>

          {user && role !== "user" && (
            <div className="mt-8 flex justify-center">
              <Link href={user ? "/dashboard/open-events" : "/signup?from=event-cta"} className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full h-14 px-10 rounded-2xl text-lg font-black text-white shadow-2xl shadow-fuchsia-200 transition-all hover:scale-105 active:scale-95 group relative overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)",
                  }}
                >
                  <span className="relative z-10 flex items-center gap-3">
                    <Sparkles className="h-5 w-5 animate-pulse" />
                    Explore open events
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </span>
                  <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Button>
              </Link>
            </div>
          )}

          <section
            id="live-demo"
            ref={demoRef}
            className="mt-20 text-left scroll-mt-28"
          >
            <div className="rounded-3xl border border-slate-200/80 bg-slate-950 p-2 shadow-2xl shadow-indigo-200/40">
              <video
                className="w-full rounded-2xl aspect-video bg-black"
                controls
                playsInline
                preload="metadata"
              >
                <source src={LIVE_DEMO_VIDEO} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
            <p className="mt-4 text-center text-sm font-medium text-slate-500">
              Watch the Eventify live demo — planning, vendors, and admin in action.
            </p>
          </section>
        </div>
      </div>
    </section>
  )
}
