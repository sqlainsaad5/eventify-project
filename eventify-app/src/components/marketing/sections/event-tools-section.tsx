import { Smartphone } from "lucide-react"

export function EventToolsSection() {
  return (
    <section id="event-tools" className="py-32 bg-slate-900 text-white overflow-hidden relative scroll-mt-20">
      <div className="container mx-auto px-6 relative z-10 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md mb-8 ring-1 ring-white/20">
          <Smartphone className="h-8 w-8 text-indigo-400" />
        </div>
        <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-8">Powerful Event Tools</h2>
        <p className="text-xl text-slate-400 max-w-2xl mb-12">Everything you need to run seamless events, accessible from anywhere.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl">
          {[
            { label: "Updates", value: "Real-time" },
            { label: "Payments", value: "Secure" },
            { label: "Access", value: "Mobile" },
            { label: "Speed", value: "Instant" },
          ].map((stat, i) => (
            <div
              key={i}
              className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors"
            >
              <div className="text-3xl font-black mb-1">{stat.value}</div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-600 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-fuchsia-600 rounded-full blur-[150px]" />
      </div>
    </section>
  )
}
