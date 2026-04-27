import Link from "next/link"
import { Sparkles, Shield, Smartphone, Globe } from "lucide-react"

export function MarketingFooter() {
  return (
    <footer className="bg-white py-20 border-t border-slate-100">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between gap-12 mb-16">
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-3 mb-6 group w-fit">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-black text-slate-900 tracking-tight">Eventify.</span>
            </Link>
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
  )
}
