"use client"

import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Sparkles,
  Zap,
  Star,
  ArrowRight,
  CheckCircle,
  Layout,
  Smartphone,
  Globe,
  Shield,
  CreditCard,
  Users,
  Server,
  Lock,
  ChevronDown
} from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">

      {/* 🔹 HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 transition-transform group-hover:rotate-12">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-slate-900">Eventify<span className="text-indigo-600">.</span></span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {["Platform", "Event Tools", "Pricing", "FAQ"].map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase().replace(" ", "-")}`}
                className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-wide"
              >
                {item}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden md:block text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors">
              Log in
            </Link>
            <Link href="/signup">
              <Button className="h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xl shadow-slate-200 transition-all hover:scale-105 active:scale-95 font-bold">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 🔹 HERO SECTION */}
      <section className="relative pt-32 pb-40 overflow-hidden bg-white">
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-5xl mx-auto text-center">

            <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-slate-900 text-white text-xs font-bold uppercase tracking-widest mb-10 shadow-xl hover:scale-105 transition-transform cursor-default">
              <Zap className="h-4 w-4 text-indigo-400" />
              <span>v2.0 Now Available</span>
            </div>

            <h1 className="text-7xl md:text-9xl font-black text-slate-900 mb-8 tracking-tighter leading-none">
              Eventify<span className="text-indigo-600">.</span>
            </h1>

            <p className="text-2xl md:text-4xl font-bold text-slate-900 mb-8 tracking-tight">
              The only platform you need to plan, manage, and scale.
            </p>

            <p className="text-lg text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
              Stop juggling spreadsheets and disconnected tools. Eventify brings your entire event lifecycle into one powerful, intuitive interface designed for professionals.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full h-16 px-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xl font-black shadow-2xl shadow-indigo-200 transition-all hover:scale-105 active:scale-95 group">
                  Get Started <ArrowRight className="h-6 w-6 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full h-16 px-12 border-2 border-slate-100 bg-white text-slate-900 rounded-2xl text-xl font-bold hover:bg-slate-50 hover:border-slate-200 transition-all">
                  Live Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>


      {/* 🔹 PLATFORM FEATURES */}
      <section id="platform" className="py-32 bg-slate-50 scroll-mt-20">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-end justify-between mb-20 gap-8">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-6">Engineered for <span className="text-indigo-600">Performance.</span></h2>
              <p className="text-xl text-slate-500 font-medium">Everything you need to scale your event operations from a single dashboard.</p>
            </div>
            <Button variant="ghost" className="text-indigo-600 font-bold hover:bg-indigo-50 hover:text-indigo-700">
              Explore all features <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Layout className="h-8 w-8 text-white" />}
              title="Command Center"
              desc="A unified interface to track timelines, tasks, and team coordination in real-time."
              bg="bg-slate-900"
            />
            <FeatureCard
              icon={<CreditCard className="h-8 w-8 text-white" />}
              title="Financial Stack"
              desc="Industrial-grade budget tracking with automated invoice processing and vendor payouts."
              bg="bg-indigo-600"
            />
            <FeatureCard
              icon={<Users className="h-8 w-8 text-indigo-600" />}
              title="Vendor Network"
              desc="Access a curated marketplace of pre-vetted suppliers ready to execute your vision."
              bg="bg-white border-slate-200"
              darkText
            />
          </div>
        </div>
      </section>

      {/* 🔹 EVENT TOOLS SECTION */}
      <section id="event-tools" className="py-32 bg-slate-900 text-white overflow-hidden relative scroll-mt-20">
        <div className="container mx-auto px-6 relative z-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md mb-8 ring-1 ring-white/20">
            <Smartphone className="h-8 w-8 text-indigo-400" />
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-8">Powerful Event Tools</h2>
          <p className="text-xl text-slate-400 max-w-2xl mb-12">
            Everything you need to run seamless events, accessible from anywhere.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl">
            {[
              { label: "Updates", value: "Real-time" },
              { label: "Payments", value: "Secure" },
              { label: "Access", value: "Mobile" },
              { label: "Speed", value: "Instant" },
            ].map((stat, i) => (
              <div key={i} className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                <div className="text-3xl font-black mb-1">{stat.value}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Abstract shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-600 rounded-full blur-[150px]" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-fuchsia-600 rounded-full blur-[150px]" />
        </div>
      </section>

      {/* 🔹 PRICING SECTION */}
      <section id="pricing" className="py-32 bg-white scroll-mt-20">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-6">Simple, Transparent Pricing.</h2>
            <p className="text-xl text-slate-500 font-medium">Choose the plan that fits your scale.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter */}
            <div className="p-10 rounded-[32px] border border-slate-200 bg-white hover:shadow-xl transition-all hover:border-indigo-200 hover:-translate-y-2">
              <h3 className="text-2xl font-black text-slate-900 mb-2">Starter</h3>
              <p className="text-slate-500 mb-6 font-medium">For independent organizers.</p>
              <div className="text-5xl font-black text-slate-900 mb-8 tracking-tighter">$0<span className="text-lg font-bold text-slate-400">/mo</span></div>
              <ul className="space-y-4 mb-8">
                {["1 Active Event", "Basic Analytics", "5 Vendor Contacts", "Community Support"].map((feat, i) => (
                  <li key={i} className="flex items-center gap-3 font-bold text-slate-600 text-sm">
                    <CheckCircle className="h-5 w-5 text-indigo-600" /> {feat}
                  </li>
                ))}
              </ul>
              <Button className="w-full h-12 rounded-xl font-bold bg-slate-100 text-slate-900 hover:bg-slate-200">Get Started Free</Button>
            </div>

            {/* Pro */}
            <div className="p-10 rounded-[32px] border-2 border-indigo-600 bg-indigo-50/50 relative hover:-translate-y-2 transition-transform">
              <div className="absolute top-6 right-6 px-3 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">Popular</div>
              <h3 className="text-2xl font-black text-indigo-900 mb-2">Professional</h3>
              <p className="text-indigo-700/60 mb-6 font-medium">For growing agencies.</p>
              <div className="text-5xl font-black text-indigo-900 mb-8 tracking-tighter">$49<span className="text-lg font-bold text-indigo-400">/mo</span></div>
              <ul className="space-y-4 mb-8">
                {["Unlimited Events", "Advanced Financials", "Unlimited Vendors", "Priority Support", "Whitelabel Exports"].map((feat, i) => (
                  <li key={i} className="flex items-center gap-3 font-bold text-indigo-900 text-sm">
                    <CheckCircle className="h-5 w-5 text-indigo-600" /> {feat}
                  </li>
                ))}
              </ul>
              <Button className="w-full h-12 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200">Start 14-Day Trial</Button>
            </div>

            {/* Enterprise */}
            <div className="p-10 rounded-[32px] border border-slate-200 bg-slate-900 text-white hover:shadow-xl transition-all hover:-translate-y-2">
              <h3 className="text-2xl font-black text-white mb-2">Enterprise</h3>
              <p className="text-slate-400 mb-6 font-medium">For global organizations.</p>
              <div className="text-5xl font-black text-white mb-8 tracking-tighter">Custom</div>
              <ul className="space-y-4 mb-8">
                {["Custom Infrastructure", "Dedicated Success Manager", "SLA Guarantee", "SSO & Audit Logs", "On-premise Deployment"].map((feat, i) => (
                  <li key={i} className="flex items-center gap-3 font-bold text-slate-300 text-sm">
                    <CheckCircle className="h-5 w-5 text-indigo-400" /> {feat}
                  </li>
                ))}
              </ul>
              <Button className="w-full h-12 rounded-xl font-bold bg-white text-slate-900 hover:bg-slate-100">Contact Sales</Button>
            </div>
          </div>
        </div>
      </section>

      {/* 🔹 FAQ SECTION */}
      <section id="faq" className="py-24 bg-slate-50 scroll-mt-20">
        <div className="container mx-auto px-6 max-w-3xl">
          <h2 className="text-3xl font-black text-slate-900 mb-12 text-center tracking-tight">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              { q: "Can I manage multiple events at once?", a: "Absolutely. Our dashboard allows you to toggle between unlimited projects seamlessly with global search." },
              { q: "How does the vendor payout system work?", a: "We integrate directly with Stripe Connect to automate payouts. You can authorize settlements with one click." },
              { q: "Is my data secure?", a: "Security is our priority. We use bank-grade encryption (AES-256) and strictly adhere to SOC2 compliance standards." }
            ].map((item, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer group">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-lg font-bold text-slate-900">{item.q}</h4>
                  <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🔹 CTA SECTION */}
      <section className="py-40 bg-white">
        <div className="container mx-auto px-6">
          <div className="bg-slate-50 rounded-[48px] p-12 md:p-24 text-center border border-slate-100 relative overflow-hidden group">
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-5xl md:text-7xl font-black text-slate-900 mb-8 tracking-tighter">Ready to Deploy?</h2>
              <p className="text-xl text-slate-500 mb-12 font-medium">Join thousands of professional organizers delivering world-class experiences.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/signup">
                  <Button size="lg" className="h-16 px-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-lg font-black shadow-2xl hover:shadow-indigo-200 transition-all hover:scale-105 active:scale-95">
                    Get Started Now
                  </Button>
                </Link>
              </div>
            </div>

            {/* Hover Effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50/0 via-indigo-50/0 to-indigo-50/80 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          </div>
        </div>
      </section>

      {/* 🔹 FOOTER */}
      <footer className="bg-white py-20 border-t border-slate-100">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between gap-12 mb-16">
            <div className="max-w-xs">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="text-xl font-black text-slate-900 tracking-tight">Eventify.</span>
              </div>
              <p className="text-slate-500 font-medium leading-relaxed">
                The standard for modern event orchestration. Built for speed, reliability, and scale.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
              {[
                { title: "Product", links: ["Features", "Security", "Enterprise", "Changelog"] },
                { title: "Company", links: ["About", "Careers", "Blog", "Contact"] },
                { title: "Resources", links: ["Documentation", "API Reference", "Guides", "Status"] },
                { title: "Legal", links: ["Privacy", "Terms", "Cookie Policy", "Licenses"] },
              ].map((col, i) => (
                <div key={i}>
                  <h4 className="font-black text-slate-900 mb-6 uppercase text-xs tracking-widest">{col.title}</h4>
                  <ul className="space-y-4">
                    {col.links.map((link, j) => (
                      <li key={j}>
                        <Link href="#" className="text-slate-500 hover:text-indigo-600 font-bold text-sm transition-colors">
                          {link}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-slate-400 text-sm font-bold">© 2026 Eventify Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <Shield className="h-5 w-5 text-slate-300 hover:text-slate-900 transition-colors cursor-pointer" />
              <Smartphone className="h-5 w-5 text-slate-300 hover:text-slate-900 transition-colors cursor-pointer" />
              <Globe className="h-5 w-5 text-slate-300 hover:text-slate-900 transition-colors cursor-pointer" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, desc, bg, darkText }: { icon: any, title: string, desc: string, bg: string, darkText?: boolean }) {
  return (
    <div className={`p-10 rounded-[40px] ${bg} ${darkText ? 'border border-slate-200' : 'text-white'} flex flex-col justify-between min-h-[320px] group transition-all duration-500 hover:shadow-2xl hover:-translate-y-2`}>
      <div>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 ${darkText ? 'bg-indigo-50' : 'bg-white/10 backdrop-blur-sm'}`}>
          {icon}
        </div>
        <h3 className={`text-2xl font-black mb-4 tracking-tight ${darkText ? 'text-slate-900' : 'text-white'}`}>{title}</h3>
        <p className={`font-medium leading-relaxed ${darkText ? 'text-slate-500' : 'text-slate-400'}`}>
          {desc}
        </p>
      </div>
      <div className={`mt-8 flex items-center gap-2 font-bold text-sm uppercase tracking-widest ${darkText ? 'text-indigo-600' : 'text-white/60'} opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0`}>
        Learn more <ArrowRight className="h-4 w-4" />
      </div>
    </div>
  )
}
