"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useMarketing } from "../marketing-context"

export function CtaSection() {
  const { user } = useMarketing()

  return (
    <section className="py-40 bg-white">
      <div className="container mx-auto px-6">
        <div className="bg-slate-50 rounded-[48px] p-12 md:p-24 text-center border border-slate-100 relative overflow-hidden group">
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-5xl md:text-7xl font-black text-slate-900 mb-8 tracking-tighter">Ready to Deploy?</h2>
            <p className="text-xl text-slate-500 mb-12 font-medium">
              Join thousands of professional organizers delivering world-class experiences.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={user ? "/dashboard" : "/signup"}>
                <Button
                  size="lg"
                  className="h-16 px-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-lg font-black shadow-2xl hover:shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
                >
                  {user ? "Back to Dashboard" : "Get Started Now"}
                </Button>
              </Link>
            </div>
          </div>

          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50/0 via-indigo-50/0 to-indigo-50/80 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        </div>
      </div>
    </section>
  )
}
