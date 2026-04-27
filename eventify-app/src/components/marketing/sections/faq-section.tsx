import { ChevronDown } from "lucide-react"

export function FaqSection() {
  return (
    <section id="faq" className="py-24 bg-slate-50 scroll-mt-20">
      <div className="container mx-auto px-6 max-w-3xl">
        <h2 className="text-3xl font-black text-slate-900 mb-12 text-center tracking-tight">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {[
            {
              q: "Can I manage multiple events at once?",
              a: "Absolutely. Our dashboard allows you to toggle between unlimited projects seamlessly with global search.",
            },
            {
              q: "How does the vendor payout system work?",
              a: "We integrate directly with Stripe Connect to automate payouts. You can authorize settlements with one click.",
            },
            { q: "Is my data secure?", a: "Security is our priority. We use bank-grade encryption (AES-256) and strictly adhere to SOC2 compliance standards." },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer group"
            >
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
  )
}
