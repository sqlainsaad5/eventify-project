import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function AssignedSectionHeader({
  title,
  showViewAll,
  href,
}: {
  title: string
  showViewAll: boolean
  href: string
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">{title}</h2>
      {showViewAll && (
        <Button
          asChild
          variant="outline"
          className="rounded-xl font-black uppercase tracking-widest text-[10px] border-slate-200 shrink-0"
        >
          <Link href={href} className="inline-flex items-center gap-2">
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      )}
    </div>
  )
}
