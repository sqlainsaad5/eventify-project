import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

export function PricingSection() {
  return (
    <section id="pricing" className="py-32 bg-white scroll-mt-20">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-6">Simple, Transparent Pricing.</h2>
          <p className="text-xl text-slate-500 font-medium">Choose the plan that fits your scale.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="p-10 rounded-[32px] border border-slate-200 bg-white hover:shadow-xl transition-all hover:border-indigo-200 hover:-translate-y-2">
            <h3 className="text-2xl font-black text-slate-900 mb-2">Starter</h3>
            <p className="text-slate-500 mb-6 font-medium">For independent organizers.</p>
            <div className="text-5xl font-black text-slate-900 mb-8 tracking-tighter">
              Rs 0<span className="text-lg font-bold text-slate-400">/mo</span>
            </div>
            <ul className="space-y-4 mb-8">
              {["1 Active Event", "Basic Analytics", "5 Vendor Contacts", "Community Support"].map((feat, i) => (
                <li key={i} className="flex items-center gap-3 font-bold text-slate-600 text-sm">
                  <CheckCircle className="h-5 w-5 text-indigo-600" /> {feat}
                </li>
              ))}
            </ul>
            <Button className="w-full h-12 rounded-xl font-bold bg-slate-100 text-slate-900 hover:bg-slate-200">Get Started Free</Button>
          </div>

          <div className="p-10 rounded-[32px] border-2 border-indigo-600 bg-indigo-50/50 relative hover:-translate-y-2 transition-transform">
            <div className="absolute top-6 right-6 px-3 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
              Popular
            </div>
            <h3 className="text-2xl font-black text-indigo-900 mb-2">Professional</h3>
            <p className="text-indigo-700/60 mb-6 font-medium">For growing agencies.</p>
            <div className="text-5xl font-black text-indigo-900 mb-8 tracking-tighter">
              Rs 49<span className="text-lg font-bold text-indigo-400">/mo</span>
            </div>
            <ul className="space-y-4 mb-8">
              {["Unlimited Events", "Advanced Financials", "Unlimited Vendors", "Priority Support", "Whitelabel Exports"].map(
                (feat, i) => (
                  <li key={i} className="flex items-center gap-3 font-bold text-indigo-900 text-sm">
                    <CheckCircle className="h-5 w-5 text-indigo-600" /> {feat}
                  </li>
                )
              )}
            </ul>
            <Button className="w-full h-12 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200">
              Start 14-Day Trial
            </Button>
          </div>

          <div className="p-10 rounded-[32px] border border-slate-200 bg-slate-900 text-white hover:shadow-xl transition-all hover:-translate-y-2">
            <h3 className="text-2xl font-black text-white mb-2">Enterprise</h3>
            <p className="text-slate-400 mb-6 font-medium">For global organizations.</p>
            <div className="text-5xl font-black text-white mb-8 tracking-tighter">Custom</div>
            <ul className="space-y-4 mb-8">
              {[
                "Custom Infrastructure",
                "Dedicated Success Manager",
                "SLA Guarantee",
                "SSO & Audit Logs",
                "On-premise Deployment",
              ].map((feat, i) => (
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
  )
}
