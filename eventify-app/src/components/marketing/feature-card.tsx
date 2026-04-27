import { ArrowRight } from "lucide-react"
import type { ReactNode } from "react"

type FeatureCardProps = {
  icon: ReactNode
  title: string
  desc: string
  bg: string
  darkText?: boolean
}

export function FeatureCard({ icon, title, desc, bg, darkText }: FeatureCardProps) {
  return (
    <div
      className={`p-10 rounded-[40px] ${bg} ${darkText ? "border border-slate-200" : "text-white"} flex flex-col justify-between min-h-[320px] group transition-all duration-500 hover:shadow-2xl hover:-translate-y-2`}
    >
      <div>
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 ${
            darkText ? "bg-indigo-50" : "bg-white/10 backdrop-blur-sm"
          }`}
        >
          {icon}
        </div>
        <h3 className={`text-2xl font-black mb-4 tracking-tight ${darkText ? "text-slate-900" : "text-white"}`}>{title}</h3>
        <p className={`font-medium leading-relaxed ${darkText ? "text-slate-500" : "text-slate-400"}`}>{desc}</p>
      </div>
      <div
        className={`mt-8 flex items-center gap-2 font-bold text-sm uppercase tracking-widest ${
          darkText ? "text-indigo-600" : "text-white/60"
        } opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0`}
      >
        Learn more <ArrowRight className="h-4 w-4" />
      </div>
    </div>
  )
}
