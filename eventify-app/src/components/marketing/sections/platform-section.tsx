import { Button } from "@/components/ui/button"
import { Layout, CreditCard, Users, ArrowRight } from "lucide-react"
import { FeatureCard } from "../feature-card"

export function PlatformSection() {
  return (
    <section id="platform" className="py-32 bg-slate-50 scroll-mt-20">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-end justify-between mb-20 gap-8">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-6">
              Engineered for <span className="text-indigo-600">Performance.</span>
            </h2>
            <p className="text-xl text-slate-500 font-medium">
              Everything you need to scale your event operations from a single dashboard.
            </p>
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
  )
}
